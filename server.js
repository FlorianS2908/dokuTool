import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDataStore, toPublicUser } from './data-store.js';
import { GENERAL_IHK_RULES, getIhkRuleProfile, ihkProfilesForClient } from './ihk-rules.js';
import { evaluateAbschlussprojektRuleset } from './ruleset-evaluator.js';
import { extractDocumentSections } from './src/server/analysis/document-sections.js';
import { evaluateFiaeRulesetV2 } from './src/server/rules/fiae-ruleset-v2-evaluator.js';
import { runAiConsensusReview } from './src/server/review/ai-review-orchestrator.js';
import { searchReferenceMetadata, getReferenceTopics } from './src/server/references/reference-search.js';
import { scanLocalReferences } from './src/server/references/reference-scanner.js';
import { securityHeaders } from './src/server/security.js';
import { createAiClientForUser, getAiProviderInfo, getEffectiveAiConfig, hasEffectiveAiKey } from './src/server/ai/ai-provider.js';
import { clearUserApiKey, encryptApiKey, maskApiKey, setUserApiKey } from './src/server/ai/ai-key-store.js';
import {
  loadQuizQuestionPools,
  loadQuizQuestions,
  quizFachrichtungen,
  quizProfileForUser,
  quizQuestionSchema,
  quizRoleTemplates,
  quizSourceRepo
} from './src/server/quiz-service.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-5.5';
const maxOutputTokens = Number(process.env.MAX_OUTPUT_TOKENS || 1800);
const uploadLimitMb = Number(process.env.UPLOAD_LIMIT_MB || 30);
const profilePhotoLimitMb = Number(process.env.PROFILE_PHOTO_LIMIT_MB || 0.5);
const dataStore = await createDataStore();
const sessionSecret = process.env.AUTH_SESSION_SECRET || randomBytes(48).toString('hex');
if (!process.env.AUTH_SESSION_SECRET) {
  process.env.AUTH_SESSION_SECRET = sessionSecret;
}
const sessionCookieName = 'ihk_dokutool_session';
const sessionMaxAgeSeconds = 60 * 60 * 24 * 14;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimitMb * 1024 * 1024 }
});

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: profilePhotoLimitMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Bitte ein PNG-, JPG- oder WebP-Bild hochladen.'));
  }
});

app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

function sign(value) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function readSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[sessionCookieName] || '';
}

function sessionIdFromToken(token) {
  const value = String(token || '');
  if (!value || value.length < 32) return '';
  return sign(`session:${value}`);
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

async function startSession(req, res, userId) {
  const token = randomBytes(32).toString('base64url');
  const sessionId = sessionIdFromToken(token);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();

  await dataStore.createSession({
    id: sessionId,
    userId,
    createdAt: nowIso,
    lastSeenAt: nowIso,
    expiresAt,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500)
  });

  setSessionCookie(res, token);
}

async function endSession(req, res) {
  const sessionId = sessionIdFromToken(readSessionToken(req));
  if (sessionId) await dataStore.deleteSession(sessionId);
  clearSessionCookie(res);
}

function normalizeEmailInput(email) {
  return String(email || '').trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const iterations = 310000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return { passwordHash: hash, passwordSalt: salt, passwordIterations: iterations };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt || !user?.passwordIterations) return false;
  const expected = Buffer.from(user.passwordHash, 'base64url');
  const actual = pbkdf2Sync(password, user.passwordSalt, user.passwordIterations, expected.length, 'sha256');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function getSessionUser(req) {
  const sessionId = sessionIdFromToken(readSessionToken(req));
  if (!sessionId) return null;

  const session = await dataStore.getSession(sessionId);
  if (!session) return null;
  const user = await dataStore.getUser(session.userId);
  if (!user) {
    await dataStore.deleteSession(sessionId);
    return null;
  }
  await dataStore.touchSession(sessionId);
  return user;
}

async function requireAuth(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Bitte einloggen.' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function createClient(user) {
  return createAiClientForUser(user);
}

function hasOpenAiApiKey(user) {
  return hasEffectiveAiKey(user);
}

function safeErrorMessage(error, fallback = 'Unbekannter Serverfehler.') {
  const raw = String(error?.message || fallback);
  return raw.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-...');
}

function aiUnavailableMessage() {
  return 'KI-Pruefung konnte nicht ausgefuehrt werden, da kein API-Key verfuegbar ist.';
}

function validateApiKeyInput(value) {
  if (typeof value !== 'string') {
    return { error: 'Bitte einen API-Key eingeben.' };
  }
  if (value !== value.trim()) {
    return { error: 'Der API-Key darf keine Leerzeichen am Anfang oder Ende enthalten.' };
  }
  if (value.length < 20) {
    return { error: 'Der API-Key ist zu kurz.' };
  }
  return { apiKey: value };
}

function buildInstructions(mode) {
  const base = `
Du bist ein integrierter KI-Assistent in einem lokalen IHK-Dokumentations-Prüftool.
Antworte auf Deutsch, fachlich, nachvollziehbar und praxisnah.
Wenn Dokumentationen geprüft werden, arbeite wie ein kritisches Review-Werkzeug: analysieren, begründen, Fundstellen nennen, keine fertige Prüfungsdokumentation generieren.
Bei IHK-Projektdokumentationen berücksichtigst du formale Struktur, Antrag-Doku-Abgleich, technische Nachvollziehbarkeit, Qualitätssicherung, Soll-/Ist-Vergleich und Fazit.
`.trim();

  const modes = {
    allgemein: 'Modus Allgemein: Hilf flexibel bei Fragen, Texten, Planung und Technik.',
    programmierung: 'Modus Programmierung: Priorisiere saubere Architektur, verständlichen Code, Fehlersuche und didaktische Erklärungen.',
    dokumentation: 'Modus Dokumentation: Formuliere fachlich, dokumentativ, sachlich und projektbezogen.',
    unterricht: 'Modus Unterricht: Erstelle klare Lernmaterialien, Beispiele, Aufgaben, Lösungen und didaktische Hinweise.',
    bewerbung: 'Modus Bewerbung: Formuliere professionell, wertschätzend, überzeugend und passend zur Stelle.',
    ihk: 'Modus IHK-Doku-Prüfung: Prüfe streng anhand der Kriterien, arbeite mit Ampelstatus und konkreten To-dos.'
  };

  return `${base}\n\n${modes[mode] || modes.allgemein}`;
}

function buildPrompt({ message, history = [], context = '' }) {
  const cleanedHistory = Array.isArray(history) ? history.slice(-10) : [];
  const transcript = cleanedHistory
    .filter((entry) => entry && typeof entry.content === 'string' && ['user', 'assistant'].includes(entry.role))
    .map((entry) => `${entry.role === 'user' ? 'Nutzer' : 'Assistent'}: ${entry.content}`)
    .join('\n\n');

  const contextBlock = context?.trim()
    ? `Zusätzlicher Kontext des Nutzers:\n${context.trim()}\n\n`
    : '';

  return `${contextBlock}${transcript ? `Bisheriger Verlauf:\n${transcript}\n\n` : ''}Aktuelle Anfrage:\n${message}`;
}

const CHECKLIST_REFERENCE = {
  statuses: {
    gruen: 'vorhanden und plausibel',
    gelb: 'vorhanden, aber unvollständig oder unklar',
    rot: 'fehlt oder passt nicht',
    grau: 'nicht sicher automatisch prüfbar'
  },
  required: [
    'Inhaltsverzeichnis vorhanden und plausibel vollständig',
    'Abbildungsverzeichnis vorhanden, wenn Abbildungen genutzt werden, und plausibel vollständig',
    'Tabellenverzeichnis vorhanden, wenn Tabellen genutzt werden, und plausibel vollständig',
    'Abkürzungsverzeichnis vorhanden und plausibel vollständig',
    'Fremdwortverzeichnis oder Glossar vorhanden und plausibel vollständig',
    'Literatur- oder Quellenverzeichnis vorhanden und plausibel vollständig',
    'Listingverzeichnis vorhanden, wenn Code/Listings genutzt werden, und plausibel vollständig',
    'Anhangsverzeichnis vorhanden, wenn Anhänge genutzt werden, und plausibel vollständig',
    'Kopfzeile mit Projekttitel und Firmenlogo',
    'Fußzeile mit Seitenzahl und Name des Dokumentationserstellers',
    'Deckblatt mit Name, Firma, Projekttitel, Ausbilder und Projektbetreuer',
    'Mindestens ein als Abbildung vorhandenes UML-Diagramm in Analyse, Planung, Entwurf und Implementierung',
    'Testphase/Qualitätssicherung vorhanden und passend zur Dokumentation',
    'Soll-/Ist-Vergleich vorhanden und passend zur Dokumentation',
    'Fazit vorhanden',
    'Allgemeine IHK-Regeln angewandt',
    'Gewaehlte regionale IHK-Regeln angewandt',
    'KI-Richtlinie und moegliche KI-Fundstellen geprueft'
  ]
};

function normalize(text = '') {
  return String(text)
    .replace(/[\u00ad￾]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lower(text = '') {
  return normalize(text).toLowerCase();
}

function decodeXmlEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlText(xml = '') {
  const textParts = [];
  const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    textParts.push(decodeXmlEntities(match[1] || match[2] || ''));
  }
  return normalize(textParts.join(' '));
}

function extractDocxParagraphs(xml = '') {
  const paragraphs = [];
  const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
  const blipRegex = /<a:blip\b[^>]*(?:r:embed|embed)="([^"]+)"/g;
  let match;
  while ((match = paragraphRegex.exec(xml)) !== null) {
    const paragraphXml = match[0];
    const imageRelIds = [];
    let imageMatch;
    while ((imageMatch = blipRegex.exec(paragraphXml)) !== null) {
      imageRelIds.push(imageMatch[1]);
    }
    paragraphs.push({
      text: stripXmlText(paragraphXml),
      hasImage: imageRelIds.length > 0,
      imageRelIds,
      xml: paragraphXml
    });
  }
  return paragraphs;
}

function zipPathJoin(baseDir, target = '') {
  const raw = target.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = `${baseDir}/${raw}`.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function contentTypeFromPath(fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif'
  };
  return map[ext] || null;
}

function parseRelationships(xml = '') {
  const relationships = new Map();
  const relRegex = /<Relationship\b[^>]*>/g;
  let match;
  while ((match = relRegex.exec(xml)) !== null) {
    const tag = match[0];
    const id = /Id="([^"]+)"/.exec(tag)?.[1];
    const target = /Target="([^"]+)"/.exec(tag)?.[1];
    if (id && target) relationships.set(id, target);
  }
  return relationships;
}

async function extractDocxBodyImages(zip, documentXml) {
  const paragraphs = extractDocxParagraphs(documentXml);
  const relsXml = (await readZipXml(zip, /^word\/_rels\/document\.xml\.rels$/))[0]?.xml || '';
  const relationships = parseRelationships(relsXml);
  const images = [];
  const seen = new Set();

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    if (!paragraph.hasImage) continue;

    const context = normalize(
      paragraphs
        .slice(Math.max(0, index - 2), Math.min(paragraphs.length, index + 4))
        .map((p) => p.text)
        .filter(Boolean)
        .join(' ')
    );

    for (const relId of paragraph.imageRelIds) {
      const target = relationships.get(relId);
      if (!target || /^[a-z]+:/i.test(target)) continue;
      const mediaPath = target.startsWith('word/') ? target : zipPathJoin('word', target);
      const zipFile = zip.file(mediaPath);
      const contentType = contentTypeFromPath(mediaPath);
      const key = `${relId}:${mediaPath}:${index}`;
      if (!zipFile || seen.has(key)) continue;
      seen.add(key);
      images.push({
        relId,
        fileName: mediaPath,
        contentType,
        base64: contentType ? await zipFile.async('base64') : null,
        paragraphIndex: index,
        nearbyText: context || '-'
      });
    }
  }

  return images;
}

async function readZipXml(zip, pattern) {
  const out = [];
  const names = Object.keys(zip.files).filter((name) => pattern.test(name));
  for (const name of names) {
    out.push({ name, xml: await zip.file(name).async('string') });
  }
  return out;
}

async function extractDocx(file) {
  const mammothResult = await mammoth.extractRawText({ buffer: file.buffer });
  const zip = await JSZip.loadAsync(file.buffer);
  const documentXml = (await readZipXml(zip, /^word\/document\.xml$/))[0]?.xml || '';
  const headerXmlParts = await readZipXml(zip, /^word\/header\d+\.xml$/);
  const footerXmlParts = await readZipXml(zip, /^word\/footer\d+\.xml$/);

  const headerXml = headerXmlParts.map((p) => p.xml).join('\n');
  const footerXml = footerXmlParts.map((p) => p.xml).join('\n');
  const headerText = stripXmlText(headerXml);
  const footerText = stripXmlText(footerXml);
  const documentText = normalize(mammothResult.value || stripXmlText(documentXml));
  const fullText = normalize([headerText, documentText, footerText].filter(Boolean).join('\n'));
  const bodyImages = await extractDocxBodyImages(zip, documentXml);

  const bodyImageCount = (documentXml.match(/<a:blip\b/g) || []).length;
  const headerImageCount = (headerXml.match(/<a:blip\b/g) || []).length;
  const footerImageCount = (footerXml.match(/<a:blip\b/g) || []).length;
  const tableCount = (documentXml.match(/<w:tbl\b/g) || []).length;
  const pageFieldInFooter = /PAGE|NUMPAGES|PAGEREF|w:fldChar/i.test(footerXml);

  return {
    fileName: file.originalname,
    format: 'docx',
    fileSizeBytes: file.size || file.buffer.length,
    text: fullText,
    bodyText: documentText,
    headerText,
    footerText,
    pageCount: null,
    structure: {
      tableCount,
      bodyImageCount,
      headerImageCount,
      footerImageCount,
      pageFieldInFooter,
      docxStructureAvailable: true,
      bodyImageContexts: bodyImages.slice(0, 20).map((image, index) => ({
        index: index + 1,
        fileName: image.fileName,
        contentType: image.contentType,
        nearbyText: image.nearbyText
      }))
    },
    images: bodyImages,
    warnings: []
  };
}

async function extractPdf(file) {
  const data = await pdfParse(file.buffer);
  return {
    fileName: file.originalname,
    format: 'pdf',
    fileSizeBytes: file.size || file.buffer.length,
    text: normalize(data.text || ''),
    bodyText: normalize(data.text || ''),
    headerText: '',
    footerText: '',
    pageCount: data.numpages || null,
    structure: {
      tableCount: null,
      bodyImageCount: null,
      headerImageCount: null,
      footerImageCount: null,
      pageFieldInFooter: null,
      docxStructureAvailable: false
    },
    warnings: [
      'PDF wurde textbasiert ausgewertet. Formatierung, Kopf-/Fußzeilen und Logos sind nur heuristisch prüfbar. Für die beste Prüfung bitte DOCX hochladen.'
    ]
  };
}

async function extractTextFile(file) {
  return {
    fileName: file.originalname,
    format: 'text',
    fileSizeBytes: file.size || file.buffer.length,
    text: normalize(file.buffer.toString('utf8')),
    bodyText: normalize(file.buffer.toString('utf8')),
    headerText: '',
    footerText: '',
    pageCount: null,
    structure: {
      tableCount: null,
      bodyImageCount: null,
      headerImageCount: null,
      footerImageCount: null,
      pageFieldInFooter: null,
      docxStructureAvailable: false
    },
    warnings: ['Textdateien enthalten keine zuverlässig prüfbaren Layoutinformationen.']
  };
}

async function extractFile(file) {
  if (!file) return null;
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.docx')) return extractDocx(file);
  if (name.endsWith('.pdf')) return extractPdf(file);
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) return extractTextFile(file);
  throw new Error(`Dateityp wird nicht unterstützt: ${file.originalname}. Bitte DOCX, PDF, TXT oder MD verwenden.`);
}

function has(text, pattern) {
  return pattern.test(text);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function firstEvidence(text, patterns, label = 'Fund im Text') {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + 180);
      return `${label}: „${normalize(text.slice(start, end))}“`;
    }
  }
  return '-';
}

function countRegex(text, regex) {
  return (text.match(regex) || []).length;
}

function findNumbers(text, regex) {
  const numbers = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const numericGroup = match.slice(1).find((value) => /^\d+$/.test(String(value || '')));
    const n = Number(numericGroup);
    if (Number.isFinite(n)) numbers.push(n);
  }
  return numbers;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function missingSequence(values) {
  if (!values.length) return [];
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const missing = [];
  for (let i = unique[0]; i <= unique[unique.length - 1]; i += 1) {
    if (!unique.includes(i)) missing.push(i);
  }
  return missing;
}

function wordsFromTitle(title = '') {
  return normalize(title)
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 8);
}

function titleAppears(text, title = '') {
  const nText = lower(text);
  const nTitle = lower(title);
  if (!nTitle) return false;
  if (nText.includes(nTitle)) return true;
  const words = wordsFromTitle(title);
  return words.length > 0 && words.filter((word) => nText.includes(word.toLowerCase())).length >= Math.min(3, words.length);
}

function extractHeadings(text = '') {
  const raw = String(text).replace(/\r/g, '\n');
  const lines = raw.split(/\n|(?=\b\d+(?:\.\d+)*\s+[A-ZÄÖÜ])/g).map((line) => normalize(line));
  const headings = [];
  const headingRegex = /^(\d+(?:\.\d+)*)\s+(.{3,100})$/;
  for (const line of lines) {
    const m = headingRegex.exec(line);
    if (m && !/\.\s*\d+$/.test(line)) {
      headings.push({ number: m[1], title: m[2] });
    }
  }
  return headings.slice(0, 120);
}

function statusScore(status) {
  const map = { gruen: 1, gelb: 0.55, rot: 0, grau: 0.35 };
  return map[status] ?? 0;
}

function addResult(results, category, criterion, status, assessment, evidence, reason, recommendation, severity = 'mittel', weight = 1) {
  results.push({
    category,
    criterion,
    status,
    assessment,
    evidence,
    reason,
    recommendation,
    severity,
    weight
  });
}

function formatFileSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unbekannt';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function evidenceList(text, patterns, label = 'Fundstellen', limit = 4) {
  const snippets = [];
  const positions = [];
  for (const pattern of patterns) {
    const regex = regexWithGlobal(pattern);
    let match;
    while ((match = regex.exec(text)) !== null && snippets.length < limit) {
      if (positions.some((position) => Math.abs(position - match.index) < 180)) continue;
      positions.push(match.index);
      snippets.push(excerptAt(text, match.index, 90, 220));
    }
    if (snippets.length >= limit) break;
  }
  const unique = [...new Set(snippets)];
  return unique.length
    ? `${label}: ${unique.map((snippet, index) => `${index + 1}) "${snippet}"`).join(' | ')}`
    : '-';
}

function countPatternMatches(text, patterns = []) {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function evaluatePatternRule(results, text, category, rule, defaultSeverity = 'mittel') {
  if (rule.onlyWhen && !rule.onlyWhen.test(text)) {
    addResult(
      results,
      category,
      rule.label,
      'gruen',
      'nicht erforderlich',
      'Ausloesender Kontext nicht erkannt.',
      'Die Regel wird nur angewandt, wenn der passende Kontext im Dokument vorhanden ist.',
      'Kein unmittelbarer Handlungsbedarf.',
      'niedrig',
      0.5
    );
    return true;
  }

  const matches = countPatternMatches(text, rule.patterns || []);
  const requiredMatches = rule.minMatches || 1;
  const ok = matches >= requiredMatches;
  const status = ok ? 'gruen' : rule.soft ? 'gelb' : 'rot';
  addResult(
    results,
    category,
    rule.label,
    status,
    ok ? 'erkannt' : rule.soft ? 'nicht sicher erkannt' : 'nicht erkannt',
    ok ? evidenceList(text, rule.patterns, rule.label, 3) : '-',
    ok
      ? 'Die Regel wurde anhand typischer Begriffe oder Fundstellen im Dokument erkannt.'
      : `Die Regel wurde nicht ausreichend erkannt (${matches}/${requiredMatches} Treffergruppen).`,
    ok ? 'Fundstelle kurz gegen die konkrete IHK-Vorgabe pruefen.' : rule.recommendation,
    ok ? 'niedrig' : defaultSeverity,
    rule.soft ? 0.7 : 1
  );
  return ok;
}

function evaluateIhkPageRule(results, doc, profile) {
  if (!profile.page) return;
  const page = profile.page;
  const ruleText = [
    page.min ? `min. ${page.min}` : null,
    page.max ? `max. ${page.max}` : null,
    page.totalMax ? `Gesamt max. ${page.totalMax}` : null,
    page.appendixMax ? `Anlagen max. ${page.appendixMax}` : null,
    page.scope ? `Geltung: ${page.scope}` : null
  ].filter(Boolean).join('; ');

  if (!doc.pageCount) {
    addResult(
      results,
      'IHK-Profilregeln',
      `Seitenumfang nach ${profile.label}`,
      'grau',
      'nicht automatisch zaehlbar',
      `Regel: ${ruleText}. Dateiformat: ${doc.format}.`,
      'Der Seitenumfang kann fuer dieses Format nicht belastbar automatisch bestimmt werden.',
      'PDF oder final gesetztes DOCX manuell gegen die regionale Seitenregel pruefen.',
      'mittel'
    );
    return;
  }

  let status = 'gruen';
  let assessment = 'im automatisch pruefbaren Rahmen';
  let reason = `Automatisch erkannte Gesamtseiten: ${doc.pageCount}. Regel: ${ruleText}.`;
  if (page.totalMax && doc.pageCount > page.totalMax) {
    status = 'rot';
    assessment = 'Gesamtumfang ueberschritten';
    reason = `Die PDF hat ${doc.pageCount} Seiten und liegt ueber dem Gesamtlimit von ${page.totalMax}.`;
  } else if (page.max && doc.pageCount > page.max) {
    status = 'gelb';
    assessment = 'moeglicherweise zu umfangreich';
    reason = `Die PDF hat ${doc.pageCount} Gesamtseiten. Die IHK-Regel bezieht sich auf ${page.scope || 'den Projektbericht'}; Anlagen/Verzeichnisse koennen automatisch nicht sauber getrennt werden.`;
  } else if (page.min && doc.pageCount < page.min) {
    status = 'gelb';
    assessment = 'moeglicherweise zu kurz';
    reason = `Die PDF hat ${doc.pageCount} Gesamtseiten und liegt unter der Mindestorientierung von ${page.min}.`;
  }

  addResult(
    results,
    'IHK-Profilregeln',
    `Seitenumfang nach ${profile.label}`,
    status,
    assessment,
    `Erkannte Seiten: ${doc.pageCount}. Regel: ${ruleText}.`,
    reason,
    status === 'gruen' ? 'Keine unmittelbare Nacharbeit erkennbar.' : 'Reinen Projektbericht, Verzeichnisse und Anlagen manuell trennen und gegen die regionale Vorgabe pruefen.',
    status === 'rot' ? 'hoch' : 'mittel'
  );
}

function evaluateIhkFileSizeRule(results, doc, profile) {
  if (!profile.pdfMaxMb) return;
  if (doc.format !== 'pdf') {
    addResult(
      results,
      'IHK-Profilregeln',
      `PDF-Dateigroesse nach ${profile.label}`,
      'grau',
      'nur fuer finale PDF pruefbar',
      `Regel: PDF max. ${profile.pdfMaxMb} MB. Aktuelles Format: ${doc.format}.`,
      'Die regionale Dateigroesse bezieht sich auf die Abgabe-PDF.',
      'Finale PDF erzeugen und erneut pruefen.',
      'mittel',
      0.7
    );
    return;
  }

  const sizeMb = (doc.fileSizeBytes || 0) / 1024 / 1024;
  const ok = sizeMb <= profile.pdfMaxMb;
  addResult(
    results,
    'IHK-Profilregeln',
    `PDF-Dateigroesse nach ${profile.label}`,
    ok ? 'gruen' : 'rot',
    ok ? 'im Limit' : 'Limit ueberschritten',
    `Dateigroesse: ${formatFileSize(doc.fileSizeBytes)}. Regel: max. ${profile.pdfMaxMb} MB.`,
    ok ? 'Die Datei liegt innerhalb des hinterlegten PDF-Limits.' : 'Die Datei liegt ueber dem hinterlegten PDF-Limit der gewaehlten IHK.',
    ok ? 'Keine unmittelbare Nacharbeit erkennbar.' : 'PDF komprimieren, Anlagen reduzieren oder regionale Uploadvorgabe pruefen.',
    ok ? 'niedrig' : 'hoch'
  );
}

function evaluateIhkRules({ results, doc, text, profile }) {
  addResult(
    results,
    'IHK-Profilregeln',
    'Ausgewaehltes IHK-Regelprofil',
    'gruen',
    profile.label,
    profile.summary || 'Regelprofil hinterlegt.',
    'Allgemeine Regeln werden immer angewandt; regionale Regeln werden entsprechend dem Dropdown-Profil zusaetzlich angewandt.',
    'Vor Abgabe immer die aktuelle Fassung der zustaendigen IHK gegenpruefen.',
    'niedrig',
    0.4
  );

  for (const rule of GENERAL_IHK_RULES) {
    evaluatePatternRule(results, text, 'Allgemeine IHK-Regeln', rule, 'mittel');
  }

  if (profile.layout) {
    addResult(
      results,
      'IHK-Profilregeln',
      `Layout/Form nach ${profile.label}`,
      'grau',
      'manuell gegenpruefen',
      profile.layout,
      'Schriftart, Zeilenabstand und Seitenraender koennen aus PDF/Text nur eingeschraenkt und aus DOCX nicht vollstaendig belastbar automatisch bewertet werden.',
      'Finale Datei anhand dieser regionalen Layoutregel manuell pruefen.',
      'mittel',
      0.6
    );
  }

  evaluateIhkPageRule(results, doc, profile);
  evaluateIhkFileSizeRule(results, doc, profile);

  for (const rule of profile.requirements || []) {
    evaluatePatternRule(results, text, 'IHK-Profilregeln', rule, 'hoch');
  }
}

const AI_TERM_PATTERNS = [
  /\bchatgpt\b/i,
  /\bopenai\b/i,
  /\bcopilot\b/i,
  /\bgemini\b/i,
  /\bclaude\b/i,
  /\bperplexity\b/i,
  /\bdeepseek\b/i,
  /\b(?:ki|kuenstliche intelligenz|künstliche intelligenz|generative ki|llm)\b/i,
  /\bprompt(?:s)?\b/i
];

const AI_DISCLOSURE_PATTERNS = [
  /ki[-\s]?nachweis/i,
  /ki[-\s]?nutzung/i,
  /tool\s*\/\s*url/i,
  /prompt\s*\/\s*eingabe/i,
  /antwort\s*\/\s*ergebnis/i,
  /verwendete stelle/i,
  /rechtschreib|grammatik|orthografie/i,
  /quellenverzeichnis/i
];

const AI_SUSPICIOUS_PATTERNS = [
  /als ki[-\s]?sprachmodell/i,
  /ich kann (?:leider )?nicht/i,
  /hier ist (?:eine|der|das) (?:moegliche|mögliche|ueberarbeitete|überarbeitete)/i,
  /von chatgpt generiert/i,
  /ki[-\s]?generiert/i
];

function analyzeAiUsage(text) {
  const aiEvidence = evidenceList(text, AI_TERM_PATTERNS, 'KI-Hinweise', 5);
  const suspiciousEvidence = evidenceList(text, AI_SUSPICIOUS_PATTERNS, 'Auffaellige KI-Formulierungen', 3);
  const disclosureEvidence = evidenceList(text, AI_DISCLOSURE_PATTERNS, 'KI-/Quellen-Nachweis', 5);
  const hasAiHints = aiEvidence !== '-';
  const hasSuspiciousPhrases = suspiciousEvidence !== '-';
  const hasDisclosure = disclosureEvidence !== '-';
  const hasPromptDocs = /prompt|eingabe|antwort|screenshot|ki[-\s]?nachweis/i.test(text);
  const hasToolReference = /chatgpt|openai|copilot|gemini|claude|perplexity|deepseek|https?:\/\/[^\s]*(?:openai|chatgpt|copilot|gemini|claude|perplexity)/i.test(text);
  const deniesAiUse = /(?:keine|kein|nicht)\s+(?:ki|kuenstliche intelligenz|künstliche intelligenz|chatgpt)\s+(?:verwendet|genutzt|eingesetzt)/i.test(text)
    || /(?:ki|kuenstliche intelligenz|künstliche intelligenz|chatgpt)\s+(?:wurde|wird)\s+(?:nicht|keine)\s+(?:verwendet|genutzt|eingesetzt)/i.test(text);

  return {
    hasAiHints,
    hasSuspiciousPhrases,
    hasDisclosure,
    hasPromptDocs,
    hasToolReference,
    deniesAiUse,
    aiEvidence,
    suspiciousEvidence,
    disclosureEvidence
  };
}

function evaluateAiGuidelines({ results, text, profile }) {
  const usage = analyzeAiUsage(text);
  const policy = profile.aiPolicy || getIhkRuleProfile('allgemein').aiPolicy;

  addResult(
    results,
    'KI-Richtlinien',
    `KI-Richtlinie nach ${profile.label}`,
    'grau',
    policy.label,
    policy.rule,
    'Die hinterlegte KI-Regel wird fuer die folgende KI-Pruefung angewandt.',
    'Regionale KI-Hinweise vor Abgabe mit der aktuellen IHK-Fassung abgleichen.',
    'mittel',
    0.7
  );

  if (usage.hasAiHints || usage.hasSuspiciousPhrases || usage.deniesAiUse) {
    addResult(
      results,
      'KI-Richtlinien',
      'Moegliche KI-Nutzung / Fundstellen',
      usage.hasSuspiciousPhrases ? 'gelb' : usage.deniesAiUse && !usage.hasAiHints ? 'gruen' : 'gelb',
      usage.deniesAiUse && !usage.hasAiHints ? 'KI-Nichtnutzung erklaert' : 'Hinweise im Dokument erkannt',
      [usage.aiEvidence, usage.suspiciousEvidence].filter((value) => value !== '-').join(' | ') || usage.disclosureEvidence,
      'Das Tool kann KI-Nutzung nicht beweisen, markiert aber sichtbare KI-Begriffe, Nachweise oder typische KI-Formulierungen als Pruefstellen.',
      'Markierte Stellen im Dokument pruefen und Nutzung transparent im KI-Nachweis/Quellenverzeichnis dokumentieren.',
      usage.hasSuspiciousPhrases ? 'hoch' : 'mittel'
    );
  } else {
    addResult(
      results,
      'KI-Richtlinien',
      'Moegliche KI-Nutzung / Fundstellen',
      'grau',
      'keine offensichtlichen Hinweise',
      '-',
      'Im Text wurden keine eindeutigen KI-Begriffe oder typischen KI-Restformulierungen erkannt. Eine Nutzung laesst sich automatisch nicht sicher ausschliessen.',
      'Bei tatsaechlicher KI-Nutzung Nachweis, Tool/URL, Prompt, Antwort und verwendete Stellen ergaenzen.',
      'mittel',
      0.7
    );
  }

  const needsFullDocumentation = ['documentation_required', 'standard'].includes(policy.level);
  const restrictive = ['koeln_restrictive', 'stuttgart_restrictive'].includes(policy.level);
  let status = 'grau';
  let assessment = 'nicht sicher automatisch pruefbar';
  let reason = 'Ohne klare KI-Hinweise ist nur eine Plausibilitaetspruefung moeglich.';
  let recommendation = 'Eigenleistungserklaerung und Quellen-/KI-Nachweise final manuell pruefen.';
  let severity = 'mittel';

  if (restrictive && (usage.hasAiHints || usage.hasSuspiciousPhrases) && !usage.deniesAiUse) {
    status = 'rot';
    assessment = 'kritisch nach regionaler KI-Regel';
    reason = policy.level === 'koeln_restrictive'
      ? 'Das Koeln-Profil erlaubt keine generative KI; nur Recherche sowie Rechtschreib-/Grammatikpruefung sind zulässig.'
      : 'Das Stuttgart-Profil erlaubt KI nicht zur Strukturierung oder Formulierung und nicht als Quelle.';
    recommendation = 'KI-Fundstellen pruefen; generative Formulierungs-/Strukturhilfe entfernen oder mit der IHK klaeren. Erlaubte reine Korrektur-/Recherchehilfe sauber dokumentieren.';
    severity = 'hoch';
  } else if (usage.hasAiHints && needsFullDocumentation) {
    const complete = usage.hasDisclosure && usage.hasPromptDocs && usage.hasToolReference;
    status = complete ? 'gruen' : 'rot';
    assessment = complete ? 'KI-Nachweis wirkt vollstaendig' : 'KI-Nachweis unvollstaendig';
    reason = complete
      ? 'KI-Tool, Nachweis-/Prompt-Bezug und Quellen-/Nachweisstellen sind erkennbar.'
      : 'Es gibt KI-Hinweise, aber Tool/URL, Prompt/Antwort oder genaue Verwendungsstelle sind nicht vollstaendig erkennbar.';
    recommendation = complete
      ? 'KI-Nachweis gegen die regionale Vorgabe und Datenschutz pruefen.'
      : 'KI-Nachweis mit Toolname, Anbieter/URL, Datum, Zweck, Prompt, Antwort/Ergebnis und verwendeter Stelle im Anhang ergaenzen.';
    severity = complete ? 'niedrig' : 'hoch';
  } else if (usage.hasAiHints && !usage.hasDisclosure) {
    status = 'gelb';
    assessment = 'KI-Hinweise ohne klaren Nachweis';
    reason = 'KI-Begriffe wurden erkannt, aber ein sauberer KI-/Quellennachweis ist nicht eindeutig sichtbar.';
    recommendation = 'KI-Nutzung und Fremdquellen transparent kennzeichnen oder Nichtnutzung klar erklaeren.';
    severity = 'hoch';
  } else if (usage.deniesAiUse) {
    status = 'gruen';
    assessment = 'Nichtnutzung erklaert';
    reason = 'Es wurde eine KI-Nichtnutzungserklaerung erkannt.';
    recommendation = 'Sicherstellen, dass Quellen und Fremdinhalte trotzdem vollstaendig gekennzeichnet sind.';
    severity = 'niedrig';
  }

  addResult(
    results,
    'KI-Richtlinien',
    'KI-Nachweis gegen IHK-Richtlinie',
    status,
    assessment,
    usage.disclosureEvidence,
    reason,
    recommendation,
    severity
  );

  return { ...usage, policy };
}

function evaluateDirectory({ results, text, title, existsPatterns, itemRegex, needsItems, category, criterion, notNeededLabel }) {
  const exists = hasAny(text, existsPatterns);
  const count = countRegex(text, itemRegex);
  const numbers = findNumbers(text, new RegExp(itemRegex.source, itemRegex.flags.includes('g') ? itemRegex.flags : `${itemRegex.flags}g`));
  const duplicates = duplicateValues(numbers);
  const missing = missingSequence(numbers);

  if (!needsItems && count === 0) {
    addResult(
      results,
      category,
      criterion,
      'gruen',
      'nicht erforderlich',
      `Keine ${notNeededLabel} erkannt.`,
      `Im Dokument wurden keine ${notNeededLabel} erkannt.`,
      'Kein Verzeichnis notwendig, sofern im Dokument tatsächlich keine entsprechenden Elemente vorhanden sind.',
      'niedrig',
      0.7
    );
    return;
  }

  if (!exists && count > 0) {
    addResult(
      results,
      category,
      criterion,
      'rot',
      'fehlt',
      `${count} mögliche ${title} erkannt, aber kein Verzeichnis gefunden.`,
      `Das Dokument nutzt ${title}, enthält aber kein eindeutig erkennbares Verzeichnis.`,
      `${criterion} ergänzen und alle Elemente mit Nummer, Titel und Seite aufführen.`,
      'hoch'
    );
    return;
  }

  if (!exists) {
    addResult(
      results,
      category,
      criterion,
      'rot',
      'nicht gefunden',
      '-',
      `Das geforderte Verzeichnis wurde nicht erkannt.`,
      `${criterion} anlegen oder bewusst begründen, falls es regional nicht verlangt wird.`,
      'hoch'
    );
    return;
  }

  if (duplicates.length || missing.length) {
    addResult(
      results,
      category,
      criterion,
      'gelb',
      'vorhanden, Nummerierung auffällig',
      `${count} Einträge erkannt. Doppelt: ${duplicates.join(', ') || 'keine'}, Lücken: ${missing.join(', ') || 'keine'}.`,
      `Das Verzeichnis ist vorhanden, aber die Nummerierung wirkt nicht vollständig konsistent.`,
      `Nummerierung und Seitenverweise prüfen; doppelte oder fehlende Nummern korrigieren.`,
      'mittel'
    );
    return;
  }

  addResult(
    results,
    category,
    criterion,
    'gruen',
    'vorhanden und plausibel',
    exists ? firstEvidence(text, existsPatterns, 'Verzeichnis') : `${count} Einträge`,
    `Das Verzeichnis wurde erkannt und die Nummerierung zeigt keine offensichtlichen Dopplungen.`,
    'Keine unmittelbare Nacharbeit erkennbar.',
    'niedrig'
  );
}

function extractAbbreviations(text = '') {
  const common = new Set(['IHK', 'DIN', 'ISO', 'PDF', 'DOCX', 'API', 'UML', 'IT', 'SQL', 'HTML', 'CSS', 'JSON', 'XML', 'HTTP', 'HTTPS', 'UI', 'UX']);
  const matches = normalize(text).match(/\b[A-ZÄÖÜ]{2,}(?:\/[A-ZÄÖÜ]{2,})?\b/g) || [];
  return [...new Set(matches)].filter((a) => !common.has(a)).slice(0, 50);
}

function extractPlanningItems(text = '') {
  const lines = String(text).split(/\n|\r|(?=\b(?:Analyse|Planung|Entwurf|Implementierung|Realisierung|Test|Qualität|Dokumentation|Abnahme)\b)/i);
  const items = [];
  const re = /([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-\/ ]{3,80})\s+(\d+(?:[,.]\d+)?)\s*h\b/gi;
  for (const line of lines) {
    let match;
    while ((match = re.exec(line)) !== null) {
      items.push({ label: normalize(match[1]), hours: match[2].replace(',', '.') });
    }
  }
  return items.slice(0, 60);
}

function containsSemantic(text, item) {
  const n = lower(text);
  const label = lower(item.label || item);
  const directWords = label.split(/\s+|\-|\//).filter((w) => w.length >= 4);
  const directHits = directWords.filter((w) => n.includes(w)).length;
  if (directWords.length && directHits >= Math.min(2, directWords.length)) return true;

  const synonymGroups = [
    [/qualität|test|abnahme|validierung|prüfung/i, ['qualitätssicherung', 'qualitätsmanagement', 'test', 'tests', 'junit', 'unit-test', 'integrationstest', 'manuelle tests', 'abnahme']],
    [/datenmodell|datenbank|erm|erd|klasse|entity/i, ['datenmodell', 'klassendiagramm', 'erm', 'erd', 'entity', 'datenbankmodell', 'relationales modell']],
    [/schnittstelle|api|interface/i, ['schnittstelle', 'api', 'schnittstellendesign', 'endpoint', 'rest', 'http']],
    [/ressource|kosten|wirtschaft|amortisation/i, ['ressourcenplanung', 'projektkosten', 'wirtschaftlichkeit', 'amortisation', 'kosten']],
    [/analyse|ist|soll|lastenheft/i, ['analysephase', 'ist-analyse', 'soll-konzept', 'soll-analyse', 'lastenheft']],
    [/entwurf|design|architektur|pflichtenheft/i, ['entwurfsphase', 'architektur', 'systemdesign', 'pflichtenheft', 'datenmodell']],
    [/implement|realis|entwicklung/i, ['implementierungsphase', 'realisierungsphase', 'implementierung', 'entwicklung', 'geschäftslogik']],
    [/dokumentation|entwicklerdoku|anwender/i, ['dokumentation', 'entwicklerdokumentation', 'anwenderdokumentation', 'benutzerdokumentation']]
  ];

  for (const [matcher, synonyms] of synonymGroups) {
    if (matcher.test(item.label || item) && synonyms.some((s) => n.includes(s))) return true;
  }
  return false;
}

const UML_TEXT_PATTERN = /\b(?:uml|use[-\s]?case|anwendungsfall(?:diagramm)?|aktivit(?:\u00e4|ae)tsdiagramm|klassendiagramm|sequenzdiagramm|komponentendiagramm|deploymentdiagramm|verteilungsdiagramm|paketdiagramm|zustandsdiagramm|objektdiagramm|kommunikationsdiagramm)\b/i;
const UML_FIGURE_PATTERN = /\b(?:abbildung|abb\.?|figure|fig\.?)\s*(?:\d+(?:[.-]\d+)*)?/i;
const UML_RULEBOOK_NOTE = 'Regelbasis aus UML-25.epub: Diagrammtyp, zentrale Notationselemente, korrekte Beziehungen, Lesbarkeit und Bezug zur beschriebenen Loesung pruefen.';

const UML_DIAGRAM_DEFINITIONS = [
  {
    key: 'class',
    label: 'Klassendiagramm',
    typePatterns: [/\bklassendiagramm\b/i, /\bclass diagram\b/i, /\bklasse(?:n)?\b.*\b(?:attribut|operation|methode|assoziation)\b/i],
    notationChecks: [
      { label: 'Klassen sind benannt', patterns: [/\bklasse(?:n)?\b|\bclass(?:es)?\b/i] },
      { label: 'Attribute oder Operationen sind nachvollziehbar', patterns: [/\battribut(?:e)?\b|\boperation(?:en)?\b|\bmethode(?:n)?\b/i] },
      { label: 'Beziehungen sind fachlich benannt', patterns: [/\bassoziation(?:en)?\b|\bbeziehung(?:en)?\b|\bvererbung\b|\bgeneralisierung\b|\bspezialisierung\b/i] },
      { label: 'Multiplizitaeten/Kardinalitaeten sind erkennbar', patterns: [/\bmultiplizit(?:aet|\u00e4t|aeten|\u00e4ten)\b|\bkardinalit(?:aet|\u00e4t|aeten|\u00e4ten)\b|\b0\.\.1\b|\b1\.\.\*\b|\b0\.\.\*\b|\b1\s*:\s*n\b|\bn\s*:\s*m\b/i] },
      { label: 'Aggregation/Komposition wird korrekt abgegrenzt', patterns: [/\baggregation\b|\bkomposition\b|\bdiamant\b/i] }
    ],
    fitPatterns: [/\bdatenmodell\b|\bdatenbank\b|\bdomain\b|\bobjektmodell\b|\bentity\b|\bentwurf\b|\barchitektur\b/i],
    minNotation: 3
  },
  {
    key: 'useCase',
    label: 'Anwendungsfalldiagramm',
    typePatterns: [/\banwendungsfall(?:diagramm)?\b/i, /\buse[-\s]?case(?: diagram)?\b/i],
    notationChecks: [
      { label: 'Akteure sind externe Rollen', patterns: [/\bakteur(?:e)?\b|\bactor(?:s)?\b|\brolle(?:n)?\b/i] },
      { label: 'Use Cases sind als fachliche Ziele formuliert', patterns: [/\banwendungsfall\b|\buse[-\s]?case\b|\bfunktion(?:en)?\b|\bziel(?:e)?\b/i] },
      { label: 'Systemgrenze ist nachvollziehbar', patterns: [/\bsystemgrenze\b|\bsystem boundary\b|\bsystemkontext\b/i] },
      { label: 'include/extend wird bewusst eingesetzt', patterns: [/\binclude\b|\bextend\b|\berweitert\b|\bbeinhaltet\b/i] },
      { label: 'Assoziationen verbinden Akteure und Use Cases', patterns: [/\bassoziation(?:en)?\b|\bverbindung(?:en)?\b|\bbeziehung(?:en)?\b/i] }
    ],
    fitPatterns: [/\banforderung(?:en)?\b|\blastenheft\b|\bsoll[-\s]?konzept\b|\bbenutzer\b|\brolle(?:n)?\b|\bfunktion(?:en)?\b/i],
    minNotation: 3
  },
  {
    key: 'activity',
    label: 'Aktivitaetsdiagramm',
    typePatterns: [/\baktivit(?:\u00e4|ae)tsdiagramm\b/i, /\bactivity diagram\b/i],
    notationChecks: [
      { label: 'Start- und Endknoten sind vorhanden', patterns: [/\bstartknoten\b|\bendknoten\b|\bstart\b.*\bende\b|\binitial node\b|\bfinal node\b/i] },
      { label: 'Aktivitaeten/Aktionen sind als Schritte erkennbar', patterns: [/\baktivitaet(?:en)?\b|\baktivit\u00e4t(?:en)?\b|\baktion(?:en)?\b|\bschritt(?:e)?\b/i] },
      { label: 'Kontrollfluesse verbinden die Aktionen', patterns: [/\bkontrollfluss\b|\bcontrol flow\b|\bablauf\b|\bprozessfluss\b/i] },
      { label: 'Entscheidungen und Guards sind plausibel', patterns: [/\bentscheidung(?:en)?\b|\bverzweigung(?:en)?\b|\bguard(?:s)?\b|\bbedingung(?:en)?\b/i] },
      { label: 'Swimlanes/Verantwortlichkeiten sind bei Bedarf sichtbar', patterns: [/\bswimlane(?:s)?\b|\bpartition(?:en)?\b|\bverantwortlichkeit(?:en)?\b/i] }
    ],
    fitPatterns: [/\bprozess\b|\bworkflow\b|\bablauf\b|\bgesch(?:\u00e4|ae)ftsprozess\b|\bimplementierung\b|\btestablauf\b/i],
    minNotation: 3
  },
  {
    key: 'sequence',
    label: 'Sequenzdiagramm',
    typePatterns: [/\bsequenzdiagramm\b/i, /\bsequence diagram\b/i],
    notationChecks: [
      { label: 'Lebenslinien sind klar benannt', patterns: [/\blebenslinie(?:n)?\b|\blifeline(?:s)?\b|\bobjekt(?:e)?\b|\bteilnehmer\b/i] },
      { label: 'Nachrichten sind zeitlich geordnet', patterns: [/\bnachricht(?:en)?\b|\bmessage(?:s)?\b|\baufruf(?:e)?\b|\brequest\b|\bresponse\b/i] },
      { label: 'Aktivierungen oder Ausfuehrungsspezifikationen sind plausibel', patterns: [/\baktivierung(?:en)?\b|\bausfuehrung(?:en)?\b|\bexecution specification\b/i] },
      { label: 'Rueckgaben/Antworten sind nachvollziehbar', patterns: [/\br(?:\u00fc|ue)ckgabe(?:n)?\b|\bantwort(?:en)?\b|\breturn\b/i] },
      { label: 'Chronologie passt zum beschriebenen Ablauf', patterns: [/\bchronolog(?:ie|isch)\b|\breihenfolge\b|\bablauf\b|\binteraktion(?:en)?\b/i] }
    ],
    fitPatterns: [/\binteraktion\b|\bapi\b|\bschnittstelle\b|\bworkflow\b|\bablauf\b|\bservice\b|\bclient\b|\bserver\b/i],
    minNotation: 3
  },
  {
    key: 'component',
    label: 'Komponentendiagramm',
    typePatterns: [/\bkomponentendiagramm\b/i, /\bcomponent diagram\b/i],
    notationChecks: [
      { label: 'Komponenten sind eindeutig benannt', patterns: [/\bkomponente(?:n)?\b|\bcomponent(?:s)?\b|\bmodul(?:e)?\b/i] },
      { label: 'Schnittstellen sind sichtbar', patterns: [/\bschnittstelle(?:n)?\b|\binterface(?:s)?\b|\bapi\b|\bprovided\b|\brequired\b/i] },
      { label: 'Abhaengigkeiten sind nachvollziehbar', patterns: [/\babhaengigkeit(?:en)?\b|\babh\u00e4ngigkeit(?:en)?\b|\bdependency\b|\bdepends\b/i] },
      { label: 'Architekturbezug ist erkennbar', patterns: [/\barchitektur\b|\bsystemaufbau\b|\bschicht(?:en)?\b|\blayer(?:s)?\b/i] }
    ],
    fitPatterns: [/\barchitektur\b|\bschnittstelle\b|\bmodul\b|\bservice\b|\bkomponente\b|\bsystemdesign\b/i],
    minNotation: 3
  },
  {
    key: 'state',
    label: 'Zustandsdiagramm',
    typePatterns: [/\bzustandsdiagramm\b/i, /\bstate machine\b|\bstate diagram\b/i],
    notationChecks: [
      { label: 'Zustaende sind benannt', patterns: [/\bzustand(?:e|\u00e4nde|aende)?\b|\bstate(?:s)?\b/i] },
      { label: 'Transitionen sind mit Ereignissen verknuepft', patterns: [/\btransition(?:en)?\b|\b(?:\u00fc|ue)bergang(?:e)?\b|\bereignis(?:se)?\b|\bevent(?:s)?\b/i] },
      { label: 'Start-/Endzustand ist erkennbar', patterns: [/\bstartzustand\b|\bendzustand\b|\binitial\b|\bfinal\b/i] },
      { label: 'Guards oder Aktionen sind plausibel', patterns: [/\bguard(?:s)?\b|\bbedingung(?:en)?\b|\baktion(?:en)?\b/i] }
    ],
    fitPatterns: [/\bstatus\b|\bzustand\b|\blebenszyklus\b|\bworkflow\b|\bprozess\b|\bvalidierung\b/i],
    minNotation: 3
  },
  {
    key: 'deployment',
    label: 'Verteilungsdiagramm',
    typePatterns: [/\bverteilungsdiagramm\b|\bdeploymentdiagramm\b/i, /\bdeployment diagram\b/i],
    notationChecks: [
      { label: 'Knoten/Geraete sind benannt', patterns: [/\bknoten\b|\bnode(?:s)?\b|\bgeraet(?:e)?\b|\bger\u00e4t(?:e)?\b|\bserver\b|\bclient\b/i] },
      { label: 'Artefakte oder Deployments sind sichtbar', patterns: [/\bartefakt(?:e)?\b|\bartifact(?:s)?\b|\bdeployment\b|\bcontainer\b|\bpaket\b/i] },
      { label: 'Kommunikationspfade sind nachvollziehbar', patterns: [/\bkommunikationspfad(?:e)?\b|\bverbindung(?:en)?\b|\bnetzwerk\b|\bprotokoll(?:e)?\b/i] },
      { label: 'Infrastrukturbezug passt zum System', patterns: [/\binfrastruktur\b|\bserver\b|\bcloud\b|\bnetzwerk\b|\bumgebung\b/i] }
    ],
    fitPatterns: [/\binfrastruktur\b|\bserver\b|\bcloud\b|\bdeployment\b|\bnetzwerk\b|\bbetrieb\b|\bsystemumgebung\b/i],
    minNotation: 3
  }
];

function regexWithGlobal(pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function excerptAt(text, index, before = 120, after = 300) {
  return normalize(text.slice(Math.max(0, index - before), Math.min(text.length, index + after)));
}

function extractContextSnippets(text, pattern, limit = 8) {
  const raw = normalize(text);
  const snippets = [];
  const regex = regexWithGlobal(pattern);
  let match;
  while ((match = regex.exec(raw)) !== null && snippets.length < limit) {
    snippets.push(excerptAt(raw, match.index));
  }
  return snippets;
}

function isMissingUmlFigureText(text = '') {
  return /\b(?:kein(?:e|en)?|ohne|fehlt|fehlend(?:e|es|er)?|nicht vorhanden|nur textlich|nur im flie(?:ss|ß)text)\b.{0,100}\b(?:abbildung|abb\.?|diagramm|grafik|bild)\b/i.test(text)
    || /\b(?:abbildung|abb\.?|diagramm|grafik|bild)\b.{0,100}\b(?:fehlt|fehlend(?:e|es|er)?|nicht vorhanden|nur textlich|nur im flie(?:ss|ß)text)\b/i.test(text);
}

function extractFigureMentions(text = '') {
  const raw = normalize(text);
  const mentions = [];
  const captionRegex = /\b(?:abbildung|abb\.?|figure|fig\.?)\s*(?:\d+(?:[.-]\d+)*)?(?:\s*[:.-]\s*)?.{0,260}/gi;
  const umlContextRegex = /\b(?:uml|use[-\s]?case|anwendungsfall(?:diagramm)?|aktivit(?:\u00e4|ae)tsdiagramm|klassendiagramm|sequenzdiagramm|komponentendiagramm|deploymentdiagramm|verteilungsdiagramm|paketdiagramm|zustandsdiagramm)\b.{0,260}/gi;
  let match;

  while ((match = captionRegex.exec(raw)) !== null && mentions.length < 24) {
    const textWindow = excerptAt(raw, match.index, 120, 420);
    mentions.push({
      source: isMissingUmlFigureText(textWindow)
        ? 'missing-figure-note'
        : UML_TEXT_PATTERN.test(textWindow) ? 'uml-caption-or-reference' : 'figure-caption-or-reference',
      text: textWindow
    });
  }

  while ((match = umlContextRegex.exec(raw)) !== null && mentions.length < 32) {
    const textWindow = excerptAt(raw, match.index, 120, 360);
    if (isMissingUmlFigureText(textWindow)) {
      mentions.push({ source: 'missing-figure-note', text: textWindow });
    } else if (UML_FIGURE_PATTERN.test(textWindow) || /\bdiagramm\b/i.test(textWindow)) {
      mentions.push({ source: 'uml-context', text: textWindow });
    }
  }

  const seen = new Set();
  return mentions.filter((mention) => {
    const key = mention.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function labelsForChecks(text, checks = []) {
  return checks.filter((check) => hasAny(text, check.patterns)).map((check) => check.label);
}

function buildUmlAnalysis(doc, text) {
  const raw = normalize(text);
  const hasUmlText = UML_TEXT_PATTERN.test(raw);
  const imageContexts = Array.isArray(doc.structure?.bodyImageContexts) ? doc.structure.bodyImageContexts : [];
  const figureMentions = extractFigureMentions(raw);
  const missingFigureMentions = figureMentions.filter((mention) => mention.source === 'missing-figure-note' && UML_TEXT_PATTERN.test(mention.text));
  const umlFigureMentions = figureMentions.filter((mention) => mention.source !== 'missing-figure-note' && UML_TEXT_PATTERN.test(mention.text));
  const umlImageContexts = imageContexts.filter((image) => UML_TEXT_PATTERN.test(image.nearbyText || ''));
  const umlTextSnippets = extractContextSnippets(raw, UML_TEXT_PATTERN, 10);
  const focusedText = normalize([
    ...umlFigureMentions.map((mention) => mention.text),
    ...umlImageContexts.map((image) => image.nearbyText),
    ...umlTextSnippets
  ].join(' '));
  const analysisText = hasUmlText ? (focusedText || raw) : '';

  const detectedTypes = UML_DIAGRAM_DEFINITIONS.map((definition) => {
    const typeMentioned = hasAny(analysisText, definition.typePatterns);
    const notationMatches = labelsForChecks(analysisText, definition.notationChecks);
    const fitMatches = labelsForChecks(raw, [{ label: 'Dokumentationskontext passt zum Diagrammtyp', patterns: definition.fitPatterns }]);
    return {
      key: definition.key,
      label: definition.label,
      typeMentioned,
      notationMatches,
      missingNotation: definition.notationChecks.map((check) => check.label).filter((label) => !notationMatches.includes(label)),
      fitMatches,
      minNotation: definition.minNotation
    };
  }).filter((type) => type.typeMentioned || type.notationMatches.length > 0);

  detectedTypes.sort((a, b) => {
    const aScore = (a.typeMentioned ? 3 : 0) + a.notationMatches.length + a.fitMatches.length;
    const bScore = (b.typeMentioned ? 3 : 0) + b.notationMatches.length + b.fitMatches.length;
    return bScore - aScore;
  });

  return {
    hasUmlText,
    hasEmbeddedImages: Number(doc.structure?.bodyImageCount || 0) > 0,
    hasFigureReference: umlFigureMentions.length > 0 || umlImageContexts.length > 0,
    docxStructureAvailable: Boolean(doc.structure?.docxStructureAvailable),
    figureMentions: umlFigureMentions.slice(0, 6),
    missingFigureMentions: missingFigureMentions.slice(0, 6),
    imageContexts: umlImageContexts.slice(0, 6),
    umlTextSnippets: umlTextSnippets.slice(0, 6),
    detectedTypes: detectedTypes.slice(0, 5),
    bestType: detectedTypes[0] || null
  };
}

function summarizeUmlEvidence(analysis) {
  if (analysis.figureMentions.length) return analysis.figureMentions[0].text;
  if (analysis.imageContexts.length) return `Bildumfeld: ${analysis.imageContexts[0].nearbyText}`;
  if (analysis.missingFigureMentions.length) return analysis.missingFigureMentions[0].text;
  if (analysis.umlTextSnippets.length) return analysis.umlTextSnippets[0];
  return '-';
}

function findPhaseUmlContext(text, phasePatterns) {
  const raw = normalize(text);
  const lRaw = lower(raw);
  for (const pattern of phasePatterns) {
    const match = pattern.exec(lRaw);
    if (match) {
      const start = Math.max(0, match.index);
      const end = Math.min(raw.length, match.index + 5000);
      const section = raw.slice(start, end);
      if (UML_TEXT_PATTERN.test(section)) {
        return {
          evidence: firstEvidence(section, [UML_TEXT_PATTERN], 'UML-Fund in Phase'),
          section
        };
      }
    }
  }
  return null;
}

function evaluateUmlChecklist({ results, doc, text, phaseDefinitions }) {
  const analysis = buildUmlAnalysis(doc, text);
  const evidence = summarizeUmlEvidence(analysis);
  const structureText = `DOCX-Struktur: ${analysis.docxStructureAvailable ? 'ja' : 'nein'}, Bilder im Dokumentkoerper: ${doc.structure?.bodyImageCount ?? 'nicht pruefbar'}.`;

  if (analysis.docxStructureAvailable && analysis.hasEmbeddedImages && analysis.hasFigureReference) {
    addResult(results, 'UML-Pruefung', 'UML-Diagramm als Abbildung vorhanden', 'gruen', 'UML-Abbildung oder Abbildungsverweis erkannt', `${structureText} ${evidence}`, 'Es gibt eingebettete Bilder und einen UML-nahen Abbildungs-/Kontextnachweis.', 'UML-Abbildung mit Nummer, Titel und Textverweis konsistent halten.', 'niedrig');
  } else if (analysis.docxStructureAvailable && analysis.hasEmbeddedImages && analysis.hasUmlText) {
    addResult(results, 'UML-Pruefung', 'UML-Diagramm als Abbildung vorhanden', 'gelb', 'Bild vorhanden, UML-Bezug aber nicht eindeutig', `${structureText} ${evidence}`, 'Im DOCX gibt es Bilder und UML-Text, aber keine eindeutig beschriftete oder referenzierte UML-Abbildung.', 'UML-Diagramm als Abbildung beschriften, im Text referenzieren und ins Abbildungsverzeichnis aufnehmen.', 'hoch');
  } else if (analysis.hasUmlText) {
    addResult(results, 'UML-Pruefung', 'UML-Diagramm als Abbildung vorhanden', 'rot', 'nur textlicher UML-Hinweis erkannt', evidence, 'UML wird im Fliesstext beschrieben, aber eine nachweisbare Abbildung fehlt oder ist bei diesem Dateiformat nicht strukturell pruefbar.', 'Eine echte UML-Abbildung einfuegen; der vorhandene Text kann als Erklaerung der Abbildung genutzt werden.', 'hoch');
  } else if (analysis.hasEmbeddedImages) {
    addResult(results, 'UML-Pruefung', 'UML-Diagramm als Abbildung vorhanden', 'rot', 'Bilder vorhanden, aber kein UML-Nachweis', structureText, 'Das Dokument enthaelt Bilder, aber keinen erkennbaren UML-Diagrammtyp oder UML-Verweis.', 'Mindestens ein passendes UML-Diagramm mit sprechender Beschriftung ergaenzen.', 'hoch');
  } else {
    addResult(results, 'UML-Pruefung', 'UML-Diagramm als Abbildung vorhanden', 'rot', 'nicht erkannt', structureText, 'Es wurde weder ein UML-Diagramm noch eine UML-Abbildung erkannt.', 'Mindestens ein UML-Diagramm als Abbildung in der passenden Projektphase ergaenzen.', 'hoch');
  }

  const bestType = analysis.bestType;
  if (!analysis.hasUmlText) {
    addResult(results, 'UML-Pruefung', 'UML-Notation fachlich plausibel', 'rot', 'nicht pruefbar', '-', 'Ohne UML-Diagrammtyp oder UML-Text kann die Notation nicht fachlich bewertet werden.', `UML-Diagramm ergaenzen. ${UML_RULEBOOK_NOTE}`, 'hoch');
  } else if (!bestType) {
    addResult(results, 'UML-Pruefung', 'UML-Notation fachlich plausibel', 'gelb', 'Diagrammtyp unklar', evidence, 'Es gibt UML-Hinweise, aber der konkrete Diagrammtyp ist nicht eindeutig erkennbar.', `Diagrammtyp in Caption und Text benennen. ${UML_RULEBOOK_NOTE}`, 'hoch');
  } else if (bestType.notationMatches.length >= bestType.minNotation && analysis.hasFigureReference) {
    addResult(results, 'UML-Pruefung', 'UML-Notation fachlich plausibel', 'gruen', `${bestType.label} mit plausiblen Notationshinweisen`, `Erkannt: ${bestType.notationMatches.join('; ')}. ${evidence}`, `Die wichtigsten Notationselemente fuer ${bestType.label} sind im Umfeld der UML-Erwaehnung nachvollziehbar.`, 'Bei aktivierter KI-Pruefung werden eingebettete DOCX-Bilder zusaetzlich visuell gegen die UML-Notation geprueft.', 'mittel');
  } else if (bestType.notationMatches.length >= bestType.minNotation) {
    addResult(results, 'UML-Pruefung', 'UML-Notation fachlich plausibel', 'gelb', `${bestType.label} textlich plausibel, Abbildung fehlt/unklar`, `Erkannt: ${bestType.notationMatches.join('; ')}. ${evidence}`, 'Die Beschreibung enthaelt passende UML-Notationselemente, aber der Abbildungsnachweis ist nicht ausreichend.', 'UML-Abbildung ergaenzen oder klar beschriften; anschliessend Notation gegen Diagrammtyp pruefen.', 'hoch');
  } else {
    addResult(results, 'UML-Pruefung', 'UML-Notation fachlich plausibel', 'gelb', `${bestType.label} erkannt, Notation unvollstaendig`, `Erkannt: ${bestType.notationMatches.join('; ') || bestType.label}. Fehlt/unklar: ${bestType.missingNotation.slice(0, 4).join('; ')}.`, `Fuer ${bestType.label} fehlen wichtige Notationshinweise aus der UML-Regelbasis.`, `Notation ergaenzen/pruefen: ${bestType.missingNotation.slice(0, 4).join(', ')}. ${UML_RULEBOOK_NOTE}`, 'hoch');
  }

  if (bestType?.fitMatches?.length) {
    addResult(results, 'UML-Pruefung', 'UML-Inhaltsbezug zur Dokumentation', 'gruen', `${bestType.label} passt zum Dokumentkontext`, `Kontexttreffer: ${bestType.fitMatches.join('; ')}. ${evidence}`, 'Diagrammtyp und Dokumentationskontext passen semantisch zusammen.', 'Im Text kurz erklaeren, welche konkreten Dokumentationsaussagen durch das Diagramm belegt werden.', 'niedrig');
  } else if (analysis.hasUmlText && bestType) {
    addResult(results, 'UML-Pruefung', 'UML-Inhaltsbezug zur Dokumentation', 'gelb', 'Bezug nicht eindeutig', evidence, `Ein ${bestType.label} wurde erkannt, aber der Bezug zu Architektur, Prozess, Anforderungen oder Implementierung ist nicht eindeutig genug.`, 'Vor und nach der Abbildung kurz erlaeutern, welche Projektentscheidung oder welcher Ablauf dargestellt wird.', 'hoch');
  } else {
    addResult(results, 'UML-Pruefung', 'UML-Inhaltsbezug zur Dokumentation', 'rot', 'nicht bewertbar', '-', 'Ohne UML-Nachweis kann kein fachlicher Bezug zur Dokumentation bewertet werden.', 'UML-Diagramm passend zur beschriebenen Loesung einfuegen und im Text auswerten.', 'hoch');
  }

  for (const phase of phaseDefinitions) {
    const phaseContext = findPhaseUmlContext(text, phase.patterns);
    if (phaseContext) {
      const phaseHasFigure = !isMissingUmlFigureText(phaseContext.section) && (UML_FIGURE_PATTERN.test(phaseContext.section) || /\babbildung\b|\babb\./i.test(phaseContext.section));
      const phaseStatus = analysis.docxStructureAvailable && analysis.hasEmbeddedImages && phaseHasFigure ? 'gruen' : 'gelb';
      const phaseAssessment = phaseHasFigure ? 'UML mit Abbildungsbezug erkannt' : 'UML nur textlich erkannt';
      const phaseReason = phaseHasFigure
        ? `Fuer die ${phase.name} gibt es einen UML-Hinweis mit Abbildungsbezug.`
        : `Fuer die ${phase.name} gibt es UML-Text, aber keine eindeutig zugeordnete Abbildung.`;
      const phaseRecommendation = phaseStatus === 'gruen'
        ? 'Diagrammcaption, Textverweis und Abbildungsverzeichnis konsistent halten.'
        : `Im Abschnitt ${phase.name} eine echte UML-Abbildung mit Caption und kurzem fachlichen Bezug ergaenzen.`;
      addResult(results, 'UML-Pruefung', `UML-Diagramm in der ${phase.name}`, phaseStatus, phaseAssessment, phaseContext.evidence, phaseReason, phaseRecommendation, phaseStatus === 'gruen' ? 'niedrig' : 'hoch');
    } else if (analysis.hasUmlText) {
      addResult(results, 'UML-Pruefung', `UML-Diagramm in der ${phase.name}`, 'gelb', 'UML vorhanden, Phasenzuordnung unklar', evidence, `UML-Hinweise sind vorhanden, aber nicht eindeutig dieser Phase zuordenbar.`, `Im Abschnitt ${phase.name} ein passendes UML-Diagramm mit Beschriftung und Textverweis ergaenzen.`, 'hoch');
    } else {
      addResult(results, 'UML-Pruefung', `UML-Diagramm in der ${phase.name}`, 'rot', 'nicht erkannt', '-', `Kein UML-Diagrammhinweis fuer die ${phase.name} erkannt.`, `Mindestens ein UML-Diagramm in der ${phase.name} ergaenzen und im Text referenzieren.`, 'hoch');
    }
  }

  return {
    hasUmlText: analysis.hasUmlText,
    hasEmbeddedImages: analysis.hasEmbeddedImages,
    hasFigureReference: analysis.hasFigureReference,
    detectedTypes: analysis.detectedTypes.map((type) => ({
      label: type.label,
      notationMatches: type.notationMatches,
      missingNotation: type.missingNotation.slice(0, 6),
      fitMatches: type.fitMatches
    })),
    figureMentions: analysis.figureMentions,
    missingFigureMentions: analysis.missingFigureMentions,
    imageContexts: analysis.imageContexts.map((image) => ({
      index: image.index,
      fileName: image.fileName,
      contentType: image.contentType,
      nearbyText: image.nearbyText
    })),
    umlTextSnippets: analysis.umlTextSnippets
  };
}

function findPhaseUml(text, phasePatterns) {
  const umlTerms = /(uml|use[-\s]?case|anwendungsfall|aktivitätsdiagramm|aktivitaetsdiagramm|klassendiagramm|sequenzdiagramm|komponentendiagramm|deploymentdiagramm|paketdiagramm|zustandsdiagramm|datenflussdiagramm)/i;
  const raw = normalize(text);
  const lRaw = lower(raw);
  for (const pattern of phasePatterns) {
    const match = pattern.exec(lRaw);
    if (match) {
      const start = Math.max(0, match.index - 500);
      const end = Math.min(raw.length, match.index + 5000);
      const section = raw.slice(start, end);
      if (umlTerms.test(section)) {
        return firstEvidence(section, [umlTerms], 'UML-Fund in Phase');
      }
    }
  }
  return null;
}

function localAnalyze(doc, AntragDoc, options = {}, sections = extractDocumentSections(doc)) {
  const results = [];
  const text = doc.text || '';
  const lText = lower(text);
  const ihkProfile = getIhkRuleProfile(options.ihkProfile || 'allgemein');
  const meta = {
    fileName: doc.fileName,
    format: doc.format,
    fileSizeBytes: doc.fileSizeBytes,
    pageCount: doc.pageCount,
    headings: extractHeadings(doc.bodyText || doc.text),
    docxStructure: doc.structure,
    sectionKeys: Object.keys(sections || {}).filter((key) => key !== 'fullText'),
    warnings: doc.warnings || [],
    ihkProfile: {
      key: ihkProfile.key,
      label: ihkProfile.label,
      summary: ihkProfile.summary,
      aiPolicy: ihkProfile.aiPolicy
    }
  };

  const projectTitle = options.projectTitle || '';
  const author = options.author || '';
  const company = options.company || '';

  const tocPatterns = [/inhaltsverzeichnis/i, /\btable of contents\b/i];
  const tocExists = hasAny(text, tocPatterns);
  const headings = meta.headings;
  if (tocExists && headings.length >= 5) {
    addResult(results, 'Dokumentstruktur', 'Inhaltsverzeichnis vorhanden und plausibel vollständig', 'gruen', 'vorhanden', firstEvidence(text, tocPatterns, 'Inhaltsverzeichnis'), 'Inhaltsverzeichnis und mehrere Kapitelüberschriften wurden erkannt.', 'Automatisch erzeugtes Inhaltsverzeichnis in Word vor Abgabe aktualisieren.', 'niedrig');
  } else if (tocExists) {
    addResult(results, 'Dokumentstruktur', 'Inhaltsverzeichnis vorhanden und plausibel vollständig', 'gelb', 'vorhanden, Vollständigkeit unklar', firstEvidence(text, tocPatterns, 'Inhaltsverzeichnis'), 'Ein Inhaltsverzeichnis wurde erkannt, aber die Kapitelstruktur konnte nur eingeschränkt ausgelesen werden.', 'TOC gegen alle Überschriften prüfen und in Word aktualisieren.', 'mittel');
  } else {
    addResult(results, 'Dokumentstruktur', 'Inhaltsverzeichnis vorhanden und plausibel vollständig', 'rot', 'fehlt', '-', 'Kein Inhaltsverzeichnis erkannt.', 'Inhaltsverzeichnis mit allen Haupt- und Unterkapiteln ergänzen.', 'hoch');
  }

  const figureCount = Math.max(
    countRegex(text, /Abbildung\s+\d+/gi),
    doc.structure.bodyImageCount ?? 0
  );
  evaluateDirectory({
    results,
    text,
    title: 'Abbildungen',
    existsPatterns: [/abbildungsverzeichnis/i, /bildverzeichnis/i],
    itemRegex: /Abbildung\s+(\d+)/gi,
    needsItems: figureCount > 0,
    category: 'Verzeichnisse',
    criterion: 'Abbildungsverzeichnis vorhanden und vollständig',
    notNeededLabel: 'Abbildungen'
  });

  const tableCount = Math.max(
    countRegex(text, /Tabelle\s+\d+/gi),
    doc.structure.tableCount ?? 0
  );
  evaluateDirectory({
    results,
    text,
    title: 'Tabellen',
    existsPatterns: [/tabellenverzeichnis/i],
    itemRegex: /Tabelle\s+(\d+)/gi,
    needsItems: tableCount > 0,
    category: 'Verzeichnisse',
    criterion: 'Tabellenverzeichnis vorhanden und vollständig',
    notNeededLabel: 'Tabellen'
  });

  const listingCount = countRegex(text, /(Listing|Quellcode)\s+\d+/gi) + countRegex(text, /```|public\s+class|function\s+\w+|def\s+\w+/gi);
  evaluateDirectory({
    results,
    text,
    title: 'Listings/Quellcode',
    existsPatterns: [/listingverzeichnis/i, /quellcodeverzeichnis/i],
    itemRegex: /(Listing|Quellcode)\s+(\d+)/gi,
    needsItems: listingCount > 0,
    category: 'Verzeichnisse',
    criterion: 'Listingverzeichnis vorhanden und vollständig',
    notNeededLabel: 'Listings oder Quellcode-Blöcke'
  });

  const abbrExists = /abkürzungsverzeichnis|abkuerzungsverzeichnis/i.test(text);
  const abbreviations = extractAbbreviations(doc.bodyText || doc.text);
  if (abbrExists && abbreviations.length <= 20) {
    addResult(results, 'Verzeichnisse', 'Abkürzungsverzeichnis vorhanden und vollständig', 'gruen', 'vorhanden und plausibel', firstEvidence(text, [/abkürzungsverzeichnis|abkuerzungsverzeichnis/i], 'Abkürzungsverzeichnis'), 'Ein Abkürzungsverzeichnis wurde erkannt; die Anzahl nicht erklärter Großabkürzungen wirkt unauffällig.', 'Abkürzungen beim ersten Auftreten zusätzlich ausschreiben.', 'niedrig');
  } else if (abbrExists) {
    addResult(results, 'Verzeichnisse', 'Abkürzungsverzeichnis vorhanden und vollständig', 'gelb', 'vorhanden, mögliche Lücken', `Mögliche zusätzliche Abkürzungen: ${abbreviations.slice(0, 12).join(', ')}`, 'Ein Verzeichnis wurde erkannt, aber es gibt viele potenziell prüfpflichtige Abkürzungen.', 'Abkürzungsverzeichnis gegen den gesamten Fließtext abgleichen.', 'mittel');
  } else {
    addResult(results, 'Verzeichnisse', 'Abkürzungsverzeichnis vorhanden und vollständig', 'rot', 'fehlt', abbreviations.length ? `Mögliche Abkürzungen im Text: ${abbreviations.slice(0, 12).join(', ')}` : '-', 'Kein Abkürzungsverzeichnis erkannt.', 'Abkürzungsverzeichnis ergänzen und alle wiederkehrenden Abkürzungen erklären.', 'hoch');
  }

  const glossaryExists = /fremdwortverzeichnis|glossar|begriffsverzeichnis/i.test(text);
  if (glossaryExists) {
    addResult(results, 'Verzeichnisse', 'Fremdwortverzeichnis/Glossar vorhanden und vollständig', 'gruen', 'vorhanden', firstEvidence(text, [/fremdwortverzeichnis|glossar|begriffsverzeichnis/i], 'Glossar/Fremdwörter'), 'Ein Fremdwortverzeichnis oder Glossar wurde erkannt.', 'Fachbegriffe auf Konsistenz und Verständlichkeit prüfen.', 'niedrig');
  } else {
    addResult(results, 'Verzeichnisse', 'Fremdwortverzeichnis/Glossar vorhanden und vollständig', 'rot', 'nicht erkannt', '-', 'Kein Fremdwortverzeichnis oder Glossar erkannt. Laut deiner Prüfliste ist es Pflicht.', 'Glossar/Fremdwortverzeichnis ergänzen, besonders bei Fachbegriffen, Frameworks und Abkürzungen.', 'mittel');
  }

  const literatureExists = /literaturverzeichnis|quellenverzeichnis|quellen/i.test(text);
  const sourceHints = countRegex(text, /https?:\/\/|\(.*?\d{4}.*?\)|\[\d+\]/gi);
  if (literatureExists) {
    addResult(results, 'Verzeichnisse', 'Literatur-/Quellenverzeichnis vorhanden und vollständig', 'gruen', 'vorhanden', firstEvidence(text, [/literaturverzeichnis|quellenverzeichnis/i], 'Quellenverzeichnis'), 'Ein Literatur- oder Quellenverzeichnis wurde erkannt.', 'Quellen auf Einheitlichkeit, Zugriffsdaten und Verweise im Text prüfen.', 'niedrig');
  } else if (sourceHints > 0) {
    addResult(results, 'Verzeichnisse', 'Literatur-/Quellenverzeichnis vorhanden und vollständig', 'rot', 'fehlt trotz Quellenhinweisen', `${sourceHints} mögliche Quellenhinweise erkannt.`, 'Quellenhinweise im Text vorhanden, aber kein Verzeichnis erkannt.', 'Literatur-/Quellenverzeichnis ergänzen.', 'hoch');
  } else {
    addResult(results, 'Verzeichnisse', 'Literatur-/Quellenverzeichnis vorhanden und vollständig', 'rot', 'fehlt', '-', 'Kein Literatur-/Quellenverzeichnis erkannt.', 'Quellenverzeichnis ergänzen oder begründen, falls wirklich keine fremden Quellen genutzt wurden.', 'hoch');
  }

  const appendixExists = /anhang\b|anlagen\b/i.test(text);
  const appendixIndexExists = /anhangsverzeichnis|anlagenverzeichnis/i.test(text);
  if (appendixExists && appendixIndexExists) {
    addResult(results, 'Verzeichnisse', 'Anhangsverzeichnis vorhanden und vollständig', 'gruen', 'vorhanden', firstEvidence(text, [/anhangsverzeichnis|anlagenverzeichnis/i], 'Anhangsverzeichnis'), 'Anhang und Anhangsverzeichnis wurden erkannt.', 'Verweise aus dem Fließtext auf jeden Anhang prüfen.', 'niedrig');
  } else if (appendixExists) {
    addResult(results, 'Verzeichnisse', 'Anhangsverzeichnis vorhanden und vollständig', 'rot', 'Anhang vorhanden, Verzeichnis fehlt', firstEvidence(text, [/anhang\b|anlagen\b/i], 'Anhang'), 'Anhang erkannt, aber kein Anhangsverzeichnis.', 'Anhangsverzeichnis ergänzen und Anhänge durchnummerieren.', 'hoch');
  } else {
    addResult(results, 'Verzeichnisse', 'Anhangsverzeichnis vorhanden und vollständig', 'gruen', 'nicht erforderlich', 'Kein Anhang erkannt.', 'Kein Anhang erkannt.', 'Kein Anhangsverzeichnis notwendig, sofern keine Anlagen vorhanden sind.', 'niedrig', 0.7);
  }

  const cover = (doc.bodyText || doc.text).slice(0, 3500);
  const coverChecks = [
    { label: 'Name des Erstellers', ok: author ? titleAppears(cover, author) : /prüfungsbewerber|autor|name|ersteller/i.test(cover) },
    { label: 'Name der Firma/des Betriebs', ok: company ? titleAppears(cover, company) : /firma|betrieb|ausbildungsbetrieb|unternehmen/i.test(cover) },
    { label: 'Projekttitel', ok: projectTitle ? titleAppears(cover, projectTitle) : /projektthema|projektarbeit|abschlussprojekt|dokumentation zur betrieblichen projektarbeit/i.test(cover) },
    { label: 'Name des Ausbilders', ok: /ausbilder|ausbilderin/i.test(cover) },
    { label: 'Name des Projektbetreuers', ok: /projektbetreuer|projektbetreuung|betreuer|betreuerin/i.test(cover) }
  ];
  const missingCover = coverChecks.filter((c) => !c.ok).map((c) => c.label);
  if (!missingCover.length) {
    addResult(results, 'Formale Prüfung', 'Deckblatt mit Name, Firma, Projekttitel, Ausbilder und Projektbetreuer', 'gruen', 'vollständig erkannt', 'Deckblattbereich enthält alle Pflichtinformationen.', 'Die Pflichtinformationen wurden im vorderen Dokumentbereich erkannt.', 'Vor Abgabe regionale IHK-Vorgaben zur Deckblattgestaltung prüfen.', 'niedrig');
  } else {
    addResult(results, 'Formale Prüfung', 'Deckblatt mit Name, Firma, Projekttitel, Ausbilder und Projektbetreuer', 'gelb', 'unvollständig oder nicht sicher erkannt', `Fehlt/unklar: ${missingCover.join(', ')}`, 'Nicht alle geforderten Deckblattinformationen konnten erkannt werden.', 'Deckblatt gezielt um die fehlenden Angaben ergänzen.', 'hoch');
  }

  if (doc.format === 'docx') {
    const headerHasTitle = projectTitle ? titleAppears(doc.headerText, projectTitle) : doc.headerText.length > 10;
    const headerHasLogo = (doc.structure.headerImageCount || 0) > 0;
    if (headerHasTitle && headerHasLogo) {
      addResult(results, 'Formale Prüfung', 'Kopfzeile mit Projekttitel und Firmenlogo', 'gruen', 'vorhanden', `Kopfzeilentext: ${doc.headerText || '-'}, Bilder in Kopfzeile: ${doc.structure.headerImageCount}`, 'DOCX-Kopfzeile enthält Text und mindestens ein Bild.', 'Keine unmittelbare Nacharbeit erkennbar.', 'niedrig');
    } else {
      addResult(results, 'Formale Prüfung', 'Kopfzeile mit Projekttitel und Firmenlogo', 'gelb', 'teilweise oder unklar', `Kopfzeilentext: ${doc.headerText || '-'}, Bilder in Kopfzeile: ${doc.structure.headerImageCount || 0}`, 'Kopfzeile wurde strukturell geprüft, aber Projekttitel oder Logo sind nicht eindeutig vorhanden.', 'Projekttitel als Text und Firmenlogo als Bild in der Kopfzeile ergänzen.', 'hoch');
    }

    const footerHasPage = Boolean(doc.structure.pageFieldInFooter) || /seite\s*\d+|page\s*\d+/i.test(doc.footerText);
    const footerHasAuthor = author ? titleAppears(doc.footerText, author) : /autor|ersteller|prüfling|prüfungsbewerber/i.test(doc.footerText) || doc.footerText.length > 2;
    if (footerHasPage && footerHasAuthor) {
      addResult(results, 'Formale Prüfung', 'Fußzeile mit Seitenzahl und Name des Dokumentationserstellers', 'gruen', 'vorhanden', `Fußzeilentext: ${doc.footerText || '-'}, Seitenfeld erkannt: ${doc.structure.pageFieldInFooter ? 'ja' : 'nein'}`, 'DOCX-Fußzeile enthält einen Autoren-/Namenshinweis und eine Seitenzahl bzw. ein Seitenfeld.', 'Keine unmittelbare Nacharbeit erkennbar.', 'niedrig');
    } else {
      addResult(results, 'Formale Prüfung', 'Fußzeile mit Seitenzahl und Name des Dokumentationserstellers', 'gelb', 'teilweise oder unklar', `Fußzeilentext: ${doc.footerText || '-'}, Seitenfeld erkannt: ${doc.structure.pageFieldInFooter ? 'ja' : 'nein'}`, 'Fußzeile ist nicht vollständig nachweisbar.', 'Name des Erstellers und automatische Seitenzahl in die Fußzeile einfügen.', 'hoch');
    }
  } else {
    addResult(results, 'Formale Prüfung', 'Kopfzeile mit Projekttitel und Firmenlogo', 'grau', 'bei PDF/Text nur eingeschränkt prüfbar', 'DOCX-Struktur nicht verfügbar.', 'Logo und echte Kopfzeilenstruktur können aus PDF/TXT nicht zuverlässig automatisch geprüft werden.', 'Für sichere Prüfung die DOCX-Datei hochladen.', 'mittel');
    addResult(results, 'Formale Prüfung', 'Fußzeile mit Seitenzahl und Name des Dokumentationserstellers', 'grau', 'bei PDF/Text nur eingeschränkt prüfbar', 'DOCX-Struktur nicht verfügbar.', 'Seitenzahlen und Fußzeilenstruktur können aus PDF/TXT nur heuristisch erkannt werden.', 'Für sichere Prüfung die DOCX-Datei hochladen.', 'mittel');
  }

  evaluateIhkRules({ results, doc, text, profile: ihkProfile });
  meta.aiUsage = evaluateAiGuidelines({ results, text, profile: ihkProfile });

  const phaseDefinitions = [
    { name: 'Analysephase', patterns: [/analysephase/i, /ist-analyse/i, /anforderungsanalyse/i, /lastenheft/i] },
    { name: 'Planungsphase', patterns: [/projektplanung/i, /planungsphase/i, /projektphasen/i, /ressourcenplanung/i] },
    { name: 'Entwurfsphase', patterns: [/entwurfsphase/i, /architekturdesign/i, /systemdesign/i, /datenmodell/i, /pflichtenheft/i] },
    { name: 'Implementierungsphase', patterns: [/implementierungsphase/i, /realisierungsphase/i, /implementierung/i, /realisierung/i] }
  ];
  meta.umlAnalysis = evaluateUmlChecklist({ results, doc, text, phaseDefinitions });

  const qsPatterns = [/qualitätssicherung/i, /qualitätsmanagement/i, /testphase/i, /automatisierte tests/i, /manuelle tests/i, /unit[-\s]?test/i, /integrationstest/i, /testfall/i, /grenzwertanalyse/i, /pfadabdeckung/i];
  const qsEvidence = firstEvidence(text, qsPatterns, 'QS/Test');
  if (hasAny(text, qsPatterns) && /(erwartet|tatsächlich|testfall|ergebnis|bestanden|fehler|validierung|abnahme|grenzwert|pfad)/i.test(text)) {
    addResult(results, 'Inhaltliche Prüfung', 'Testphase/Qualitätssicherung vorhanden und passend zur Dokumentation', 'gruen', 'vorhanden und plausibel', qsEvidence, 'Test-/QS-Kapitel mit konkreten Testbegriffen und Ergebnisbezug erkannt.', 'Prüfen, ob die Testfälle direkt aus Anforderungen und Projektrisiken abgeleitet sind.', 'niedrig');
  } else if (hasAny(text, qsPatterns)) {
    addResult(results, 'Inhaltliche Prüfung', 'Testphase/Qualitätssicherung vorhanden und passend zur Dokumentation', 'gelb', 'vorhanden, Plausibilität unklar', qsEvidence, 'QS/Test wird erwähnt, aber konkrete Testfälle, erwartete Ergebnisse oder Projektbezug sind nicht sicher erkennbar.', 'Testfälle, Testdaten, erwartete Ergebnisse und tatsächliche Ergebnisse ergänzen.', 'hoch');
  } else {
    addResult(results, 'Inhaltliche Prüfung', 'Testphase/Qualitätssicherung vorhanden und passend zur Dokumentation', 'rot', 'fehlt', '-', 'Kein Test-/Qualitätssicherungskapitel erkannt.', 'Qualitätssicherung mit Teststrategie, Testfällen und Ergebnissen ergänzen.', 'hoch');
  }

  const sollIstPatterns = [/soll\s*[-/]?\s*ist\s*[-/]?\s*vergleich/i, /ist\s*[-/]?\s*soll\s*[-/]?\s*vergleich/i, /gegenüberstellung\s+der\s+zeiten/i];
  if (hasAny(text, sollIstPatterns)) {
    addResult(results, 'Inhaltliche Prüfung', 'Soll-/Ist-Vergleich vorhanden und passend zur Dokumentation', 'gruen', 'vorhanden', firstEvidence(text, sollIstPatterns, 'Soll-/Ist'), 'Ein Soll-/Ist-Vergleich wurde erkannt.', 'Sicherstellen, dass nicht nur Zeiten, sondern auch Zielerreichung und fachliches Ergebnis verglichen werden.', 'niedrig');
  } else {
    addResult(results, 'Inhaltliche Prüfung', 'Soll-/Ist-Vergleich vorhanden und passend zur Dokumentation', 'rot', 'fehlt', '-', 'Kein Soll-/Ist-Vergleich erkannt.', 'Soll-/Ist-Vergleich mit Planung, tatsächlicher Umsetzung, Abweichungen und Begründung ergänzen.', 'hoch');
  }

  if (/\bfazit\b|lessons learned|ausblick|schlussbetrachtung/i.test(text)) {
    addResult(results, 'Inhaltliche Prüfung', 'Fazit vorhanden', 'gruen', 'vorhanden', firstEvidence(text, [/\bfazit\b|lessons learned|ausblick|schlussbetrachtung/i], 'Fazit'), 'Fazit, Lessons Learned oder Ausblick wurde erkannt.', 'Fazit sollte Zielerreichung, Reflexion und Ausblick enthalten.', 'niedrig');
  } else {
    addResult(results, 'Inhaltliche Prüfung', 'Fazit vorhanden', 'rot', 'fehlt', '-', 'Kein Fazit erkannt.', 'Fazit mit Zielerreichung, Reflexion und Ausblick ergänzen.', 'hoch');
  }

  if (AntragDoc?.text) {
    const planningItems = extractPlanningItems(AntragDoc.text);
    const matched = planningItems.filter((item) => containsSemantic(text, item));
    const missing = planningItems.filter((item) => !containsSemantic(text, item));
    meta.antragItems = planningItems;

    if (planningItems.length === 0) {
      addResult(results, 'Antrag-Abgleich', 'Projektantrag gegen Dokumentation abgeglichen', 'gelb', 'Antrag vorhanden, aber Zeitplanung nicht sauber extrahierbar', 'Keine klaren Antragspunkte mit Stundenangaben erkannt.', 'Der Antrag wurde hochgeladen, aber die Zeitplanung konnte nicht zuverlässig normalisiert werden.', 'Zeitplanung im Antrag tabellarisch oder klar nummeriert bereitstellen.', 'mittel');
    } else if (missing.length === 0) {
      addResult(results, 'Antrag-Abgleich', 'Projektantrag gegen Dokumentation abgeglichen', 'gruen', 'alle extrahierten Antragspunkte plausibel gefunden', `${matched.length}/${planningItems.length} Antragspunkte gefunden.`, 'Alle aus dem Antrag extrahierten Arbeitspunkte wurden semantisch in der Dokumentation wiedergefunden.', 'Bei größeren Abweichungen trotzdem Kapitel „Abweichungen vom Projektantrag“ prüfen.', 'niedrig');
    } else if (matched.length / planningItems.length >= 0.65) {
      addResult(results, 'Antrag-Abgleich', 'Projektantrag gegen Dokumentation abgeglichen', 'gelb', 'teilweise passend', `Gefunden: ${matched.length}/${planningItems.length}. Fehlend/unklar: ${missing.slice(0, 8).map((m) => m.label).join(', ')}`, 'Mehrere Antragspunkte wurden gefunden, einige fehlen oder heißen stark anders.', 'Fehlende Antragspunkte als Kapitel, Unterkapitel oder begründete Abweichung ergänzen.', 'hoch');
    } else {
      addResult(results, 'Antrag-Abgleich', 'Projektantrag gegen Dokumentation abgeglichen', 'rot', 'kritische Abweichung', `Gefunden: ${matched.length}/${planningItems.length}. Fehlend/unklar: ${missing.slice(0, 10).map((m) => m.label).join(', ')}`, 'Der Antrag lässt sich nur schwach in der Dokumentation wiederfinden.', 'Dokumentation enger an genehmigten Antrag, Zeitplanung und Phasenstruktur anpassen.', 'hoch');
    }
  } else {
    addResult(results, 'Antrag-Abgleich', 'Projektantrag gegen Dokumentation abgeglichen', 'grau', 'nicht prüfbar', 'Kein Projektantrag hochgeladen.', 'Ohne Antrag ist kein belastbarer Antrag-Doku-Abgleich möglich.', 'Projektantrag zusätzlich hochladen.', 'mittel');
  }

  const formatChecks = [
    { label: 'Eigenständigkeitserklärung/persönliche Erklärung', patterns: [/eigenständigkeitserklärung/i, /persönliche erklärung/i, /ohne fremde hilfe/i] },
    { label: 'Änderungen gegenüber Projektantrag erläutert', patterns: [/abweichungen?\s+(zum|vom)\s+projektantrag/i, /änderungen?\s+(gegenüber|zum|vom)\s+projektantrag/i] },
    { label: 'Version/Datum/Autor-Metadaten', patterns: [/version\s*[:\d]/i, /datum|fertigstellung|abgabedatum/i, /autor|ersteller/i] }
  ];
  for (const fc of formatChecks) {
    if (hasAny(text, fc.patterns)) {
      addResult(results, 'Formale Prüfung', fc.label, 'gruen', 'vorhanden', firstEvidence(text, fc.patterns, fc.label), `${fc.label} wurde erkannt.`, 'Keine unmittelbare Nacharbeit erkennbar.', 'niedrig', 0.7);
    } else {
      addResult(results, 'Formale Prüfung', fc.label, 'gelb', 'nicht erkannt', '-', `${fc.label} wurde nicht sicher erkannt.`, `${fc.label} prüfen und ggf. ergänzen.`, 'mittel', 0.7);
    }
  }

  const rulesetEvaluation = evaluateAbschlussprojektRuleset({
    doc,
    AntragDoc,
    options,
    profile: ihkProfile
  });
  meta.ruleset = rulesetEvaluation.metadata;
  results.push(...rulesetEvaluation.results);

  const fiaeRulesetEvaluation = evaluateFiaeRulesetV2({
    doc,
    AntragDoc,
    options,
    profile: ihkProfile,
    sections
  });
  meta.rulesets = {
    ihk_abschlussprojekt_ruleset_v1: rulesetEvaluation.metadata?.summary || rulesetEvaluation.metadata?.ruleset,
    kosten_ressourcen_rules_v3: rulesetEvaluation.metadata?.kostenRessourcenRuleset,
    fiae_ruleset_v2: fiaeRulesetEvaluation.metadata?.summary
  };
  results.push(...fiaeRulesetEvaluation.results);

  const weighted = results.reduce((acc, item) => {
    acc.total += item.weight || 1;
    acc.score += statusScore(item.status) * (item.weight || 1);
    return acc;
  }, { score: 0, total: 0 });

  const score = weighted.total > 0 ? Math.round((weighted.score / weighted.total) * 100) : 0;
  const redCount = results.filter((r) => r.status === 'rot').length;
  const yellowCount = results.filter((r) => r.status === 'gelb').length;
  const grayCount = results.filter((r) => r.status === 'grau').length;
  const grade = score >= 90 ? 'sehr gut vorbereitet' : score >= 75 ? 'solide, kleinere Nacharbeit' : score >= 60 ? 'prüfbar, aber deutliche Lücken' : score >= 40 ? 'kritisch' : 'hohes Abgaberisiko';

  return {
    generatedAt: new Date().toISOString(),
    tool: 'IHK DokuTool',
    model: options.useAi ? model : null,
    options,
    summary: {
      score,
      grade,
      redCount,
      yellowCount,
      grayCount,
      totalCriteria: results.length,
      note: 'Automatische Vorprüfung. Sie ersetzt keine verbindliche Bewertung durch die IHK oder den Prüfungsausschuss.'
    },
    metadata: meta,
    checklistReference: CHECKLIST_REFERENCE,
    results
  };
}

function truncate(text = '', max = 12000) {
  const n = normalize(text);
  return n.length > max ? `${n.slice(0, max)}\n...[gekürzt]` : n;
}

function extractJsonObject(output = '') {
  const raw = String(output).trim();
  try { return JSON.parse(raw); } catch { /* continue */ }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  throw new Error('KI-Antwort war kein gültiges JSON.');
}

function selectUmlReviewImages(doc, maxImages = 4) {
  const images = Array.isArray(doc.images) ? doc.images.filter((image) => image.base64 && image.contentType) : [];
  if (!images.length) return [];
  const umlNearImages = images.filter((image) => UML_TEXT_PATTERN.test(image.nearbyText || ''));
  if (umlNearImages.length) return umlNearImages.slice(0, maxImages);
  if (UML_TEXT_PATTERN.test(doc.text || '')) return images.slice(0, maxImages);
  return [];
}

async function runAiReview({ doc, AntragDoc, baseReport, options, user }) {
  const aiConfig = getEffectiveAiConfig(user);
  const client = createClient(user);
  const umlReviewImages = selectUmlReviewImages(doc);
  const imageContextBlock = umlReviewImages.length
    ? `UML-nahe DOCX-Bilder fuer die Bildpruefung:\n${umlReviewImages.map((image, index) => `${index + 1}. ${image.fileName} | Kontext: ${image.nearbyText || '-'}`).join('\n')}`
    : 'Keine DOCX-Bilder fuer eine visuelle UML-Bildpruefung verfuegbar.';
  const prompt = `
Du prüfst eine IHK-Projektdokumentation als Analysewerkzeug. Erzeuge ausschließlich JSON.
Keine Markdown-Tabelle, keine Kommentare außerhalb des JSON.

Bewerte ergänzend zu den regelbasierten Ergebnissen diese Punkte:
1. Passt die Dokumentation semantisch zum Projektantrag?
2. Ist die Qualitätssicherung inhaltlich passend und projektbezogen?
3. Ist der Soll-/Ist-Vergleich plausibel?
4. Sind die wichtigsten kritischen Nacharbeiten konkret benannt?

Erlaubte Statuswerte: gruen, gelb, rot, grau.
JSON-Schema:
{
  "items": [
    {
      "category": "KI-Semantik",
      "criterion": "...",
      "status": "gruen|gelb|rot|grau",
      "assessment": "kurze Bewertung",
      "evidence": "kurze Fundstelle oder '-'",
      "reason": "Begründung",
      "recommendation": "konkrete Empfehlung",
      "severity": "niedrig|mittel|hoch"
    }
  ],
  "overallNote": "maximal 5 Sätze"
}

Projekt-Metadaten:
${JSON.stringify(options || {}, null, 2)}

Regelbasierte Zusammenfassung:
${JSON.stringify(baseReport.summary, null, 2)}

Projektdokumentation-Auszug:
${truncate(doc.text, 14000)}

Projektantrag-Auszug:
${AntragDoc?.text ? truncate(AntragDoc.text, 8000) : 'Kein Projektantrag hochgeladen.'}
`.trim();

  const enrichedPrompt = `${prompt}

Zusaetzliche UML-Pruefanweisung:
- Pruefe, ob ein UML-Diagramm wirklich als Abbildung vorhanden ist oder nur im Fliesstext beschrieben wird.
- Wenn UML-Bilder angehaengt sind, pruefe die Abbildung fachlich nach Diagrammtyp, Notationselementen und inhaltlichem Bezug zur Dokumentation.
- Wenn kein UML-Bild angehaengt ist, bewerte trotzdem die textliche UML-Beschreibung und benenne klar, dass die Abbildung fehlt.

Regelbasierte UML-Auswertung:
${JSON.stringify(baseReport.metadata?.umlAnalysis || {}, null, 2)}

Ausgewaehltes IHK-Regelprofil:
${JSON.stringify(baseReport.metadata?.ihkProfile || {}, null, 2)}

Regelbasierte KI-Richtlinien-Auswertung:
${JSON.stringify(baseReport.metadata?.aiUsage || {}, null, 2)}

${imageContextBlock}`.trim();

  const inputContent = [{ type: 'input_text', text: enrichedPrompt }];
  for (const image of umlReviewImages) {
    inputContent.push({
      type: 'input_image',
      image_url: `data:${image.contentType};base64,${image.base64}`
    });
  }

  const response = await client.responses.create({
    model: aiConfig.model,
    instructions: 'Du bist ein strenges, aber faires IHK-Doku-Prüfwerkzeug. Du gibst ausschließlich gültiges JSON zurück.',
    input: [{ role: 'user', content: inputContent }],
    max_output_tokens: maxOutputTokens
  });

  return {
    ...extractJsonObject(response.output_text || '{}'),
    _aiMeta: {
      model: aiConfig.model,
      keySource: aiConfig.effectiveKeySource
    }
  };
}

function mergeAiReview(report, aiReview) {
  const items = Array.isArray(aiReview?.items) ? aiReview.items : [];
  for (const item of items) {
    addResult(
      report.results,
      item.category || 'KI-Semantik',
      item.criterion || 'Semantische Zusatzprüfung',
      ['gruen', 'gelb', 'rot', 'grau'].includes(item.status) ? item.status : 'grau',
      item.assessment || 'KI-Bewertung',
      item.evidence || '-',
      item.reason || 'Keine Begründung geliefert.',
      item.recommendation || 'Manuell prüfen.',
      item.severity || 'mittel',
      1
    );
  }
  report.ai = {
    used: true,
    model: aiReview?._aiMeta?.model || model,
    keySource: aiReview?._aiMeta?.keySource || 'unknown',
    overallNote: aiReview?.overallNote || ''
  };

  const weighted = report.results.reduce((acc, item) => {
    acc.total += item.weight || 1;
    acc.score += statusScore(item.status) * (item.weight || 1);
    return acc;
  }, { score: 0, total: 0 });
  report.summary.score = weighted.total > 0 ? Math.round((weighted.score / weighted.total) * 100) : 0;
  report.summary.redCount = report.results.filter((r) => r.status === 'rot').length;
  report.summary.yellowCount = report.results.filter((r) => r.status === 'gelb').length;
  report.summary.grayCount = report.results.filter((r) => r.status === 'grau').length;
  report.summary.totalCriteria = report.results.length;
  report.summary.grade = report.summary.score >= 90 ? 'sehr gut vorbereitet' : report.summary.score >= 75 ? 'solide, kleinere Nacharbeit' : report.summary.score >= 60 ? 'prüfbar, aber deutliche Lücken' : report.summary.score >= 40 ? 'kritisch' : 'hohes Abgaberisiko';
}

function safeCell(value) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function statusFill(status) {
  const fills = {
    gruen: 'C6EFCE',
    gelb: 'FFEB9C',
    rot: 'FFC7CE',
    grau: 'D9E1F2'
  };
  return fills[status] || 'FFFFFF';
}

function styleWorksheetHeader(sheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addAiConsensusSheets(workbook, report) {
  const consensus = report.aiConsensus;
  const items = Array.isArray(consensus?.items) ? consensus.items : [];

  const consensusSheet = workbook.addWorksheet('KI-Konsens');
  consensusSheet.columns = [
    { header: 'Regel-ID', key: 'ruleId', width: 18 },
    { header: 'Basisergebnis', key: 'baseStatus', width: 16 },
    { header: 'KI 1', key: 'primaryStatus', width: 12 },
    { header: 'KI 2', key: 'counterStatus', width: 12 },
    { header: 'Revision', key: 'revisionStatus', width: 12 },
    { header: 'Schlichter', key: 'arbiterStatus', width: 12 },
    { header: 'Final', key: 'finalStatus', width: 12 },
    { header: 'Konsens erreicht', key: 'consensusReached', width: 18 },
    { header: 'Manuelle Pruefung', key: 'manualReviewRequired', width: 18 },
    { header: 'Begruendung', key: 'finalReason', width: 70 },
    { header: 'Empfehlung', key: 'finalRecommendation', width: 70 }
  ];
  items.forEach((item) => consensusSheet.addRow(item));
  styleWorksheetHeader(consensusSheet);

  const conflictSheet = workbook.addWorksheet('KI-Konflikte');
  conflictSheet.columns = [
    { header: 'Regel-ID', key: 'ruleId', width: 18 },
    { header: 'Runde', key: 'round', width: 10 },
    { header: 'Konflikttyp', key: 'type', width: 26 },
    { header: 'Konfliktstufe', key: 'level', width: 16 },
    { header: 'Beschreibung', key: 'description', width: 80 },
    { header: 'Status KI 1', key: 'primaryStatus', width: 14 },
    { header: 'Status KI 2', key: 'counterStatus', width: 14 },
    { header: 'Entscheidung', key: 'decision', width: 28 }
  ];
  items.flatMap((item) => item.conflictHistory || []).forEach((conflict) => conflictSheet.addRow({
    ...conflict,
    decision: conflict.requiresAnotherRound ? 'weitere Runde/manuell' : 'geloest'
  }));
  styleWorksheetHeader(conflictSheet);

  const manualSheet = workbook.addWorksheet('Manuelle Pruefung');
  manualSheet.columns = [
    { header: 'Regel-ID', key: 'ruleId', width: 18 },
    { header: 'Kategorie', key: 'category', width: 32 },
    { header: 'Grund', key: 'reason', width: 70 },
    { header: 'Fundstelle', key: 'evidence', width: 70 },
    { header: 'Empfehlung', key: 'recommendation', width: 70 }
  ];
  items.filter((item) => item.manualReviewRequired).forEach((item) => {
    const base = (report.results || []).find((result) => result.ruleset?.id === item.ruleId);
    manualSheet.addRow({
      ruleId: item.ruleId,
      category: base?.category || '',
      reason: item.finalReason || 'Manuelle Pruefung erforderlich.',
      evidence: base?.evidence || '-',
      recommendation: item.finalRecommendation || base?.recommendation || ''
    });
  });
  styleWorksheetHeader(manualSheet);
}

function formatResultReferences(references = []) {
  if (!Array.isArray(references) || !references.length) return '';
  return references
    .map((reference) => {
      const topics = Array.isArray(reference.topics) && reference.topics.length
        ? ` (${reference.topics.slice(0, 4).join(', ')})`
        : '';
      return `${reference.title}${topics}`;
    })
    .join('; ');
}

async function createExcel(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IHK DokuTool';
  workbook.created = new Date();

  const overview = workbook.addWorksheet('Übersicht');
  overview.columns = [
    { header: 'Kennzahl', key: 'key', width: 32 },
    { header: 'Wert', key: 'value', width: 90 }
  ];
  overview.addRows([
    { key: 'Gesamtscore', value: `${report.summary.score} %` },
    { key: 'Bewertung', value: report.summary.grade },
    { key: 'Rote Punkte', value: report.summary.redCount },
    { key: 'Gelbe Punkte', value: report.summary.yellowCount },
    { key: 'Graue Punkte', value: report.summary.grayCount },
    { key: 'Datei', value: report.metadata.fileName },
    { key: 'Format', value: report.metadata.format },
    { key: 'Hinweis', value: report.summary.note },
    { key: 'KI genutzt', value: report.ai?.used ? `ja, ${report.ai.model}` : 'nein' },
    { key: 'KI-Hinweis', value: report.ai?.overallNote || '' }
  ]);
  overview.getRow(1).font = { bold: true };

  const all = workbook.addWorksheet('Prüfergebnisse');
  all.columns = [
    { header: 'Kategorie', key: 'category', width: 24 },
    { header: 'Prüfkriterium', key: 'criterion', width: 48 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Bewertung', key: 'assessment', width: 32 },
    { header: 'Fundstelle', key: 'evidence', width: 60 },
    { header: 'Begründung', key: 'reason', width: 70 },
    { header: 'Empfehlung', key: 'recommendation', width: 70 },
    { header: 'Schweregrad', key: 'severity', width: 14 },
    { header: 'Referenzen', key: 'referencesText', width: 52 }
  ];
  report.results.forEach((item) => all.addRow({
    ...item,
    referencesText: formatResultReferences(item.references)
  }));
  all.getRow(1).font = { bold: true };
  all.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) {
      const status = row.getCell('status').value;
      row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(status) } };
    }
  });
  all.views = [{ state: 'frozen', ySplit: 1 }];
  all.autoFilter = 'A1:I1';

  const critical = workbook.addWorksheet('Kritische Mängel');
  critical.columns = all.columns;
  report.results.filter((r) => r.status === 'rot' || r.severity === 'hoch').forEach((item) => critical.addRow({
    ...item,
    referencesText: formatResultReferences(item.references)
  }));
  critical.getRow(1).font = { bold: true };
  critical.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(row.getCell('status').value) } };
  });

  addAiConsensusSheets(workbook, report);

  const raw = workbook.addWorksheet('Rohdaten');
  raw.columns = [
    { header: 'Typ', key: 'type', width: 30 },
    { header: 'Wert', key: 'value', width: 120 }
  ];
  raw.addRow({ type: 'Erkannte Überschriften', value: JSON.stringify(report.metadata.headings || []) });
  raw.addRow({ type: 'DOCX-Struktur', value: JSON.stringify(report.metadata.docxStructure || {}) });
  raw.addRow({ type: 'Antragspunkte', value: JSON.stringify(report.metadata.antragItems || []) });
  raw.addRow({ type: 'Warnungen', value: JSON.stringify(report.metadata.warnings || []) });

  return workbook.xlsx.writeBuffer();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model,
    uploadLimitMb,
    auth: true,
    storage: dataStore.kind,
    profilePhotoLimitMb
  });
});

app.get('/api/ihk-profiles', requireAuth, (_req, res) => {
  res.json({ profiles: ihkProfilesForClient() });
});

app.get('/api/references', requireAuth, (req, res) => {
  res.json({ references: searchReferenceMetadata(req.query.q || '') });
});

app.get('/api/references/topics', requireAuth, (_req, res) => {
  res.json(getReferenceTopics());
});

app.post('/api/references/scan', requireAuth, (_req, res) => {
  res.json(scanLocalReferences());
});

app.get('/api/ai-config', requireAuth, (req, res) => {
  res.json(getAiProviderInfo(req.user));
});

app.post('/api/ai-config', requireAuth, async (req, res) => {
  try {
    const provider = String(req.body?.provider || 'openai').trim();
    if (provider !== 'openai') {
      return res.status(400).json({ error: 'Aktuell wird nur OpenAI unterstuetzt.' });
    }

    const validation = validateApiKeyInput(req.body?.apiKey);
    if (validation.error) return res.status(400).json({ error: validation.error });

    const user = await setUserApiKey(req.user.id, validation.apiKey, {
      dataStore,
      provider,
      useOwnKey: req.body?.useOwnKey !== false,
      existingConfig: req.user.aiConfig
    });
    res.json(getAiProviderInfo(user));
  } catch (error) {
    console.error('KI-Konfiguration konnte nicht gespeichert werden:', safeErrorMessage(error));
    res.status(500).json({ error: safeErrorMessage(error, 'KI-Konfiguration konnte nicht gespeichert werden.') });
  }
});

app.post('/api/ai-config/test', requireAuth, async (req, res) => {
  try {
    const temporaryKey = req.body?.apiKey;
    let userForTest = req.user;

    if (temporaryKey != null && temporaryKey !== '') {
      const validation = validateApiKeyInput(temporaryKey);
      if (validation.error) return res.status(400).json({ ok: false, message: validation.error });
      const timestamp = new Date().toISOString();
      userForTest = {
        ...req.user,
        aiConfig: {
          provider: 'openai',
          ...encryptApiKey(validation.apiKey),
          createdAt: timestamp,
          updatedAt: timestamp,
          keyMask: maskApiKey(validation.apiKey),
          useOwnKey: true
        }
      };
    }

    const aiConfig = getEffectiveAiConfig(userForTest);
    const client = createClient(userForTest);
    await client.responses.create({
      model: aiConfig.model,
      input: 'Antworte nur mit OK.',
      max_output_tokens: 16
    });

    res.json({
      ok: true,
      provider: 'openai',
      model: aiConfig.model,
      keySource: aiConfig.effectiveKeySource,
      message: 'KI-Verbindung erfolgreich.'
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      message: safeErrorMessage(error, 'KI-Verbindung konnte nicht getestet werden.')
    });
  }
});

app.delete('/api/ai-config', requireAuth, async (req, res) => {
  try {
    const user = await clearUserApiKey(req.user.id, { dataStore });
    res.json(getAiProviderInfo(user));
  } catch (error) {
    console.error('KI-Konfiguration konnte nicht geloescht werden:', safeErrorMessage(error));
    res.status(500).json({ error: safeErrorMessage(error, 'KI-Konfiguration konnte nicht geloescht werden.') });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt.' });
  res.json({ user: toPublicUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = normalizeEmailInput(req.body?.email);
    const password = String(req.body?.password || '');
    const displayName = String(req.body?.displayName || '').trim();

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse eingeben.' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
    }

    const user = await dataStore.createUser({
      email,
      displayName: displayName || email.split('@')[0],
      role: 'user',
      photo: null,
      ...hashPassword(password)
    });

    await startSession(req, res, user.id);
    res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Registrierung konnte nicht gespeichert werden.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmailInput(req.body?.email);
    const password = String(req.body?.password || '');
    const user = await dataStore.findUserByEmail(email);

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ist falsch.' });
    }

    await startSession(req, res, user.id);
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login konnte nicht verarbeitet werden.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

app.patch('/api/profile', requireAuth, async (req, res) => {
  const displayName = String(req.body?.displayName || '').trim();
  if (!displayName) return res.status(400).json({ error: 'Bitte einen Namen eingeben.' });

  const user = await dataStore.updateUserProfile(req.user.id, { displayName });
  res.json({ user: toPublicUser(user) });
});

app.post('/api/profile/photo', requireAuth, profileUpload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Bitte ein Profilbild hochladen.' });

  const photo = {
    dataUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
    mimeType: req.file.mimetype,
    size: req.file.size,
    updatedAt: new Date().toISOString()
  };
  const user = await dataStore.updateUserProfile(req.user.id, { photo });
  res.json({ user: toPublicUser(user) });
});

app.get('/api/quiz/config', requireAuth, async (req, res) => {
  const questionPools = await loadQuizQuestionPools();
  res.json({
    sourceRepo: quizSourceRepo,
    fachrichtungen: quizFachrichtungen,
    roleTemplates: quizRoleTemplates,
    questionSchema: quizQuestionSchema,
    questionPools,
    profile: quizProfileForUser(req.user)
  });
});

app.get('/api/quiz/questions', requireAuth, async (req, res) => {
  try {
    const data = await loadQuizQuestions({
      poolId: req.query.poolId,
      topic: req.query.topic,
      max: req.query.max
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Quizfragen konnten nicht geladen werden.' });
  }
});

app.patch('/api/quiz/profile', requireAuth, async (req, res) => {
  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();
  const fach = String(req.body?.fach || '').trim();

  if (fach && !quizFachrichtungen[fach]) {
    return res.status(400).json({ error: 'Bitte eine gueltige Fachrichtung waehlen.' });
  }

  const quizProfile = {
    firstName,
    lastName,
    fach: fach || null,
    updatedAt: new Date().toISOString()
  };

  const patch = {
    firstName: firstName || null,
    lastName: lastName || null,
    fach: fach || null,
    quizProfile
  };

  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (displayName) patch.displayName = displayName;

  const user = await dataStore.updateUserProfile(req.user.id, patch);
  res.json({
    user: toPublicUser(user),
    profile: quizProfileForUser(user)
  });
});

app.get('/api/reports', requireAuth, async (req, res) => {
  const reports = await dataStore.listReports(req.user.id);
  res.json({ reports });
});

app.get('/api/reports/:id', requireAuth, async (req, res) => {
  const entry = await dataStore.getReport(req.user.id, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Bericht nicht gefunden.' });
  res.json({ report: entry.report, meta: entry });
});

app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message, mode = 'allgemein', history = [], context = '' } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return res.status(400).json({ error: 'Bitte eine Nachricht eingeben.' });
    }

    const aiConfig = getEffectiveAiConfig(req.user);
    const client = createClient(req.user);
    const response = await client.responses.create({
      model: aiConfig.model,
      instructions: buildInstructions(mode),
      input: buildPrompt({ message: message.trim(), history, context }),
      max_output_tokens: maxOutputTokens
    });

    res.json({
      answer: response.output_text || 'Es wurde keine Antwort erzeugt.',
      model: aiConfig.model,
      keySource: aiConfig.effectiveKeySource
    });
  } catch (error) {
    console.error('Chat konnte nicht verarbeitet werden:', safeErrorMessage(error));
    const message = safeErrorMessage(error);
    res.status(500).json({ error: message });
  }
});

app.post('/api/analyze', requireAuth, upload.fields([
  { name: 'documentation', maxCount: 1 },
  { name: 'application', maxCount: 1 }
]), async (req, res) => {
  try {
    const docFile = req.files?.documentation?.[0];
    const applicationFile = req.files?.application?.[0];
    if (!docFile) return res.status(400).json({ error: 'Bitte eine Projektdokumentation hochladen.' });

    const options = {
      projectTitle: req.body.projectTitle || '',
      author: req.body.author || '',
      company: req.body.company || '',
      ihkProfile: getIhkRuleProfile(req.body.ihkProfile || 'allgemein').key,
      aiReviewMode: ['disabled', 'simple', 'multi'].includes(req.body.aiReviewMode) ? req.body.aiReviewMode : (req.body.useAi === 'true' ? 'simple' : 'disabled'),
      useAi: req.body.useAi === 'true' || req.body.aiReviewMode === 'simple' || req.body.aiReviewMode === 'multi'
    };

    const doc = await extractFile(docFile);
    const AntragDoc = applicationFile ? await extractFile(applicationFile) : null;
    const sections = extractDocumentSections(doc);
    const report = localAnalyze(doc, AntragDoc, options, sections);

    if (options.aiReviewMode === 'simple') {
      try {
        const aiReview = await runAiReview({ doc, AntragDoc, baseReport: report, options, user: req.user });
        mergeAiReview(report, aiReview);
      } catch (aiError) {
        const message = safeErrorMessage(aiError, aiUnavailableMessage());
        report.ai = { used: false, error: message };
        addResult(
          report.results,
          'KI-Semantik',
          'KI-Zusatzprüfung',
          'grau',
          'nicht ausgeführt',
          '-',
          message,
          'API-Key, Modellname und Internetverbindung prüfen. Die regelbasierte Prüfung ist trotzdem vorhanden.',
          'mittel'
        );
      }
    } else {
      report.ai = { used: false, reason: 'KI-Prüfung im Formular deaktiviert.' };
    }

    if (options.aiReviewMode === 'multi') {
      report.ai = { used: false, reason: 'Einfache KI-Zusatzpruefung zugunsten Multi-KI-Konsenspruefung uebersprungen.' };
      report.aiConsensus = await runAiConsensusReview({
        doc,
        AntragDoc,
        sections,
        baseReport: report,
        maxRounds: 3,
        apiKeyAvailable: hasOpenAiApiKey(req.user)
      });
      if (!hasOpenAiApiKey(req.user)) {
        addResult(
          report.results,
          'KI-Konsens',
          'Multi-KI-Konsenspruefung',
          'grau',
          'nicht ausgefuehrt',
          '-',
          aiUnavailableMessage(),
          'Eigenen API-Key speichern oder lokalen Standard-Key konfigurieren. Die regelbasierte Pruefung ist trotzdem vorhanden.',
          'mittel'
        );
      }
    } else if (!report.aiConsensus) {
      report.aiConsensus = { enabled: false, maxRounds: 3, completedRounds: 0, consensusReached: false, openConflictCount: 0, manualReviewCount: 0, reviewedRuleCount: 0, items: [] };
    }

    const savedReport = await dataStore.createReport(req.user.id, {
      projectTitle: options.projectTitle || doc.fileName,
      documentFileName: doc.fileName,
      applicationFileName: AntragDoc?.fileName || '',
      ihkProfile: options.ihkProfile,
      report
    });
    report.historyId = savedReport.id;

    res.json(report);
  } catch (error) {
    console.error('Analyse konnte nicht durchgefuehrt werden:', safeErrorMessage(error));
    res.status(500).json({ error: safeErrorMessage(error, 'Analyse konnte nicht durchgeführt werden.') });
  }
});

app.post('/api/report/excel', requireAuth, async (req, res) => {
  try {
    const report = req.body;
    if (!report?.results || !report?.summary) {
      return res.status(400).json({ error: 'Ungültiger Bericht.' });
    }
    const buffer = await createExcel(report);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ihk-pruefbericht.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'Excel-Bericht konnte nicht erzeugt werden.' });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error?.message || 'Unbekannter Serverfehler.' });
});

const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];
const server = isMainModule
  ? app.listen(port, () => {
    console.log(`IHK DokuTool laeuft auf http://localhost:${port}`);
  })
  : null;

if (server) {
  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`Port ${port} ist bereits belegt.`);
      console.error(`Wenn das DokuTool schon laeuft, oeffne http://localhost:${port}`);
      console.error('Falls dort nichts reagiert, beende den alten node.exe-Prozess im Task-Manager und starte erneut.');
      process.exit(1);
    }

    console.error(error);
    process.exit(1);
  });
}

export { app, server, createExcel };
