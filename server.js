import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { createDataStore, toPublicUser } from './data-store.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-5.5';
const maxOutputTokens = Number(process.env.MAX_OUTPUT_TOKENS || 1800);
const uploadLimitMb = Number(process.env.UPLOAD_LIMIT_MB || 30);
const profilePhotoLimitMb = Number(process.env.PROFILE_PHOTO_LIMIT_MB || 0.5);
const dataStore = await createDataStore();
const sessionSecret = process.env.AUTH_SESSION_SECRET || randomBytes(48).toString('hex');
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

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

function createSessionToken(userId) {
  const payload = base64UrlEncode(JSON.stringify({
    userId,
    expiresAt: Date.now() + sessionMaxAgeSeconds * 1000
  }));
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[sessionCookieName] || '';
}

function verifySessionToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (!data.userId || !data.expiresAt || Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

function setSessionCookie(res, userId) {
  const token = createSessionToken(userId);
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
  const session = verifySessionToken(readSessionToken(req));
  if (!session) return null;
  return dataStore.getUser(session.userId);
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

function createClient() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dein_api_key_hier') {
    throw new Error('OPENAI_API_KEY fehlt. Bitte .env anlegen und API-Key eintragen.');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    'Mindestens ein UML-Diagramm in Analyse, Planung, Entwurf und Implementierung',
    'Testphase/Qualitätssicherung vorhanden und passend zur Dokumentation',
    'Soll-/Ist-Vergleich vorhanden und passend zur Dokumentation',
    'Fazit vorhanden'
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

  const bodyImageCount = (documentXml.match(/<a:blip\b/g) || []).length;
  const headerImageCount = (headerXml.match(/<a:blip\b/g) || []).length;
  const footerImageCount = (footerXml.match(/<a:blip\b/g) || []).length;
  const tableCount = (documentXml.match(/<w:tbl\b/g) || []).length;
  const pageFieldInFooter = /PAGE|NUMPAGES|PAGEREF|w:fldChar/i.test(footerXml);

  return {
    fileName: file.originalname,
    format: 'docx',
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
      docxStructureAvailable: true
    },
    warnings: []
  };
}

async function extractPdf(file) {
  const data = await pdfParse(file.buffer);
  return {
    fileName: file.originalname,
    format: 'pdf',
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

function localAnalyze(doc, AntragDoc, options = {}) {
  const results = [];
  const text = doc.text || '';
  const lText = lower(text);
  const meta = {
    fileName: doc.fileName,
    format: doc.format,
    pageCount: doc.pageCount,
    headings: extractHeadings(doc.bodyText || doc.text),
    docxStructure: doc.structure,
    warnings: doc.warnings || []
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

  const phaseDefinitions = [
    { name: 'Analysephase', patterns: [/analysephase/i, /ist-analyse/i, /anforderungsanalyse/i, /lastenheft/i] },
    { name: 'Planungsphase', patterns: [/projektplanung/i, /planungsphase/i, /projektphasen/i, /ressourcenplanung/i] },
    { name: 'Entwurfsphase', patterns: [/entwurfsphase/i, /architekturdesign/i, /systemdesign/i, /datenmodell/i, /pflichtenheft/i] },
    { name: 'Implementierungsphase', patterns: [/implementierungsphase/i, /realisierungsphase/i, /implementierung/i, /realisierung/i] }
  ];
  for (const phase of phaseDefinitions) {
    const evidence = findPhaseUml(text, phase.patterns);
    if (evidence) {
      addResult(results, 'UML-Prüfung', `UML-Diagramm in der ${phase.name}`, 'gruen', 'UML-/Diagrammhinweis erkannt', evidence, `Für die ${phase.name} wurde ein Diagrammhinweis erkannt.`, 'Prüfen, ob das Diagramm tatsächlich UML-konform und im richtigen Abschnitt verankert ist.', 'niedrig');
    } else if (/(uml|use[-\s]?case|klassendiagramm|sequenzdiagramm|aktivitätsdiagramm|komponentendiagramm|deploymentdiagramm)/i.test(text)) {
      addResult(results, 'UML-Prüfung', `UML-Diagramm in der ${phase.name}`, 'gelb', 'UML vorhanden, Phasenzuordnung unklar', firstEvidence(text, [/(uml|use[-\s]?case|klassendiagramm|sequenzdiagramm|aktivitätsdiagramm|komponentendiagramm|deploymentdiagramm)/i], 'Allgemeiner UML-Fund'), `UML-Hinweise sind vorhanden, aber nicht eindeutig dieser Phase zuordenbar.`, `Im Abschnitt ${phase.name} mindestens ein passendes UML-Diagramm mit Beschriftung und Textverweis ergänzen.`, 'hoch');
    } else {
      addResult(results, 'UML-Prüfung', `UML-Diagramm in der ${phase.name}`, 'rot', 'nicht erkannt', '-', `Kein UML-Diagrammhinweis für die ${phase.name} erkannt.`, `Mindestens ein UML-Diagramm in der ${phase.name} ergänzen und im Text referenzieren.`, 'hoch');
    }
  }

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
    model: process.env.OPENAI_API_KEY ? model : null,
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

async function runAiReview({ doc, AntragDoc, baseReport, options }) {
  const client = createClient();
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

  const response = await client.responses.create({
    model,
    instructions: 'Du bist ein strenges, aber faires IHK-Doku-Prüfwerkzeug. Du gibst ausschließlich gültiges JSON zurück.',
    input: prompt,
    max_output_tokens: maxOutputTokens
  });

  return extractJsonObject(response.output_text || '{}');
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
    model,
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
    { header: 'Schweregrad', key: 'severity', width: 14 }
  ];
  report.results.forEach((item) => all.addRow(item));
  all.getRow(1).font = { bold: true };
  all.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) {
      const status = row.getCell('status').value;
      row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(status) } };
    }
  });
  all.views = [{ state: 'frozen', ySplit: 1 }];
  all.autoFilter = 'A1:H1';

  const critical = workbook.addWorksheet('Kritische Mängel');
  critical.columns = all.columns;
  report.results.filter((r) => r.status === 'rot' || r.severity === 'hoch').forEach((item) => critical.addRow(item));
  critical.getRow(1).font = { bold: true };
  critical.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(row.getCell('status').value) } };
  });

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
      photo: null,
      ...hashPassword(password)
    });

    setSessionCookie(res, user.id);
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

    setSessionCookie(res, user.id);
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login konnte nicht verarbeitet werden.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
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

    const client = createClient();
    const response = await client.responses.create({
      model,
      instructions: buildInstructions(mode),
      input: buildPrompt({ message: message.trim(), history, context }),
      max_output_tokens: maxOutputTokens
    });

    res.json({
      answer: response.output_text || 'Es wurde keine Antwort erzeugt.',
      model
    });
  } catch (error) {
    console.error(error);
    const message = error?.message || 'Unbekannter Serverfehler.';
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
      ihkProfile: req.body.ihkProfile || 'allgemein',
      useAi: req.body.useAi === 'true'
    };

    const doc = await extractFile(docFile);
    const AntragDoc = applicationFile ? await extractFile(applicationFile) : null;
    const report = localAnalyze(doc, AntragDoc, options);

    if (options.useAi) {
      try {
        const aiReview = await runAiReview({ doc, AntragDoc, baseReport: report, options });
        mergeAiReview(report, aiReview);
      } catch (aiError) {
        report.ai = { used: false, error: aiError.message };
        addResult(
          report.results,
          'KI-Semantik',
          'KI-Zusatzprüfung',
          'grau',
          'nicht ausgeführt',
          '-',
          `Die KI-Zusatzprüfung konnte nicht ausgeführt werden: ${aiError.message}`,
          'API-Key, Modellname und Internetverbindung prüfen. Die regelbasierte Prüfung ist trotzdem vorhanden.',
          'mittel'
        );
      }
    } else {
      report.ai = { used: false, reason: 'KI-Prüfung im Formular deaktiviert.' };
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
    console.error(error);
    res.status(500).json({ error: error?.message || 'Analyse konnte nicht durchgeführt werden.' });
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

app.listen(port, () => {
  console.log(`IHK DokuTool läuft auf http://localhost:${port}`);
});
