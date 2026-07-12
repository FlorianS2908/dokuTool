import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { FIAE_RULESET_V2 } from '../../../ruleset-evaluator.js';
import { extractDocumentOutline } from '../analysis/document-outline.js';
import { extractDocumentSections } from '../analysis/document-sections.js';
import { extractEvidenceForRule } from '../analysis/evidence-extractor.js';
import { buildUserPrompt } from '../prompting/prompt-builder.js';
import { resolveReferencesForRulesetRule } from '../references/reference-resolver.js';
import { evaluateFiaeRulesetV2 } from '../rules/fiae-ruleset-v2-evaluator.js';
import { mapRulesToOutline } from '../rules/rule-outline-mapper.js';
import { simplifyRuleForUser } from '../rules/rule-simplifier.js';
import {
  addAuditStep,
  addEvidenceAudit,
  addPromptAudit,
  addRuleMappingAudit,
  createAnalysisAudit,
  finalizeAudit
} from '../audit/analysis-audit-log.js';
import { buildVisualReportModel } from '../audit/visual-report-model.js';
import { getAiProviderInfo, hasEffectiveAiKey } from '../ai/ai-provider.js';
import { runAiConsensusReview } from '../review/ai-review-orchestrator.js';
import { buildConsensusItem } from '../review/consensus-builder.js';
import { detectReviewConflicts } from '../review/conflict-detector.js';
import { createReviewItem } from '../review/review-schema.js';
import {
  fixtureApplicationDoc,
  fixtureDoc
} from './function-test-fixtures.js';

const rootDir = fileURLToPath(new URL('../../../', import.meta.url));

function durationSince(start) {
  return Math.max(0, Math.round(performance.now() - start));
}

function cleanText(value = '', maxLength = 900) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()} ...` : text;
}

function sanitizeDetails(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return cleanText(value, 600);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 4) return '[gekürzt]';
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeDetails(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/api[_-]?key|secret|password|token/i.test(key))
        .map(([key, item]) => [key, sanitizeDetails(item, depth + 1)])
    );
  }
  return String(value);
}

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonFile(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function flattenChapters(chapters = []) {
  const result = [];
  for (const chapter of chapters || []) {
    result.push(chapter);
    result.push(...flattenChapters(chapter.children || []));
  }
  return result;
}

function buildFixtureAnalysis() {
  const doc = { ...fixtureDoc };
  const AntragDoc = { ...fixtureApplicationDoc };
  const sections = extractDocumentSections(doc);
  const outline = extractDocumentOutline(doc);
  const ruleMatrix = mapRulesToOutline({
    outline,
    ruleset: FIAE_RULESET_V2,
    sections,
    doc,
    AntragDoc
  });
  const evaluation = evaluateFiaeRulesetV2({ doc, AntragDoc, sections });
  return { doc, AntragDoc, sections, outline, ruleMatrix, evaluation };
}

function statusResult(status, actual, details = {}, recommendation = '') {
  return {
    status,
    actual: cleanText(actual, 900),
    details: sanitizeDetails(details),
    recommendation
  };
}

function passed(actual, details = {}) {
  return statusResult('passed', actual, details);
}

function warning(actual, details = {}, recommendation = '') {
  return statusResult('warning', actual, details, recommendation);
}

function skipped(actual, details = {}, recommendation = '') {
  return statusResult('skipped', actual, details, recommendation);
}

function baseReportFromEvaluation(analysis) {
  const results = analysis.evaluation.results.slice(0, 12);
  const summary = {
    score: 76,
    grade: 'Funktionstest',
    redCount: results.filter((item) => item.status === 'rot').length,
    yellowCount: results.filter((item) => item.status === 'gelb').length,
    grayCount: results.filter((item) => item.status === 'grau').length,
    note: 'Künstlicher Funktionstestbericht'
  };

  return {
    summary,
    metadata: {
      fileName: analysis.doc.fileName,
      format: analysis.doc.format,
      headings: flattenChapters(analysis.outline.chapters).map((chapter) => chapter.title),
      warnings: []
    },
    results,
    ai: { used: false },
    aiConsensus: {
      enabled: false,
      actualAiUsed: false,
      maxRounds: 3,
      completedRounds: 0,
      consensusReached: false,
      openConflictCount: 0,
      manualReviewCount: 0,
      reviewedRuleCount: 0,
      items: []
    }
  };
}

function buildAuditFixture(analysis) {
  const audit = createAnalysisAudit({
    document: {
      fileName: analysis.doc.fileName,
      format: analysis.doc.format,
      sizeBytes: analysis.doc.fileSizeBytes
    },
    outline: analysis.outline
  });
  addAuditStep(audit, {
    id: 'outline_extraction',
    label: 'Kapitelstruktur erkannt',
    status: 'success',
    durationMs: 3,
    summary: 'Beispielkapitel wurden erkannt.'
  });
  const firstEntry = analysis.ruleMatrix.matrix.find((entry) => entry.matchedRules.length) || analysis.ruleMatrix.matrix[0];
  const firstRule = firstEntry?.matchedRules?.[0];
  if (firstEntry && firstRule) {
    addRuleMappingAudit(audit, {
      chapterId: firstEntry.chapterId,
      chapterTitle: firstEntry.chapterTitle,
      detectedMeaning: firstEntry.detectedMeaning,
      ruleId: firstRule.ruleId,
      ruleTitle: firstRule.simpleTitle || firstRule.title,
      mappingReason: 'Funktionstest-Mapping aus Kapitelbedeutung und Fundstellen.',
      confidence: firstEntry.confidence,
      status: firstRule.status
    });
    addEvidenceAudit(audit, {
      ruleId: firstRule.ruleId,
      section: 'fixture',
      quote: firstRule.evidence,
      evidenceQuality: firstRule.evidence && firstRule.evidence !== '-' ? 'medium' : 'weak',
      reason: 'Kurze Fundstelle aus dem künstlichen Testdokument.'
    });
  }
  addPromptAudit(audit, {
    title: 'Funktionstest-Prompt',
    taskType: 'check_chapter',
    includedRuleIds: firstRule ? [firstRule.ruleId] : [],
    includedChapterIds: firstEntry ? [firstEntry.chapterId] : [],
    estimatedContextSize: 420,
    warnings: []
  });
  return finalizeAudit(audit, baseReportFromEvaluation(analysis));
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  ok(!/sk-[a-z0-9_-]{12,}/i.test(serialized), 'Test- oder Auditdaten enthalten ein API-Key-Muster.');
  ok(!/"apiKey"\s*:/i.test(serialized), 'Test- oder Auditdaten enthalten ein apiKey-Feld.');
  ok(!/"password"\s*:/i.test(serialized), 'Test- oder Auditdaten enthalten ein password-Feld.');
}

function assertNoLongTexts(value) {
  const strings = [];
  const collect = (item) => {
    if (typeof item === 'string') strings.push(item);
    else if (Array.isArray(item)) item.forEach(collect);
    else if (item && typeof item === 'object') Object.values(item).forEach(collect);
  };
  collect(value);
  ok(strings.every((item) => item.length <= 1800), 'Audit/Testreport enthält zu lange Textauszüge.');
}

async function runOne(definition, shared) {
  const start = performance.now();
  try {
    const result = await definition.run(shared);
    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      status: result?.status || 'passed',
      durationMs: durationSince(start),
      expected: definition.expected,
      actual: result?.actual || 'Erwartung erfüllt.',
      details: sanitizeDetails(result?.details || {}),
      recommendation: result?.recommendation || definition.recommendation || ''
    };
  } catch (error) {
    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      status: 'failed',
      durationMs: durationSince(start),
      expected: definition.expected,
      actual: error?.message || 'Test fehlgeschlagen.',
      details: {},
      recommendation: definition.recommendation || 'Fehlerursache im betroffenen Modul prüfen.'
    };
  }
}

function testDefinitions({ includeFileTests }) {
  return [
    {
      id: 'FT-001',
      name: 'FIAE Ruleset v2 wird geladen',
      category: 'Ruleset',
      expected: 'Ruleset existiert, enthält rules[], mindestens 100 Regeln und eindeutige IDs.',
      run() {
        const rules = FIAE_RULESET_V2.rules || [];
        const ids = rules.map((rule) => rule.id).filter(Boolean);
        ok(Array.isArray(rules), 'rules[] fehlt.');
        ok(rules.length >= 100, `Zu wenige Regeln: ${rules.length}.`);
        ok(new Set(ids).size === ids.length, 'Regel-IDs sind nicht eindeutig.');
        return passed(`${rules.length} Regeln geladen.`, { rules: rules.length, uniqueIds: new Set(ids).size });
      }
    },
    {
      id: 'FT-002',
      name: 'Referenzmanifest laden',
      category: 'Referenzen',
      expected: 'reference-manifest.json und reference-topics.json sind lesbar und enthalten keine Buchinhalte.',
      run() {
        const manifest = jsonFile('references/reference-manifest.json');
        const topics = jsonFile('references/reference-topics.json');
        ok(Array.isArray(manifest.references), 'references[] fehlt.');
        ok(Array.isArray(topics.topicMappings), 'topicMappings[] fehlt.');
        assertNoLongTexts(manifest);
        assertNoLongTexts(topics);
        return passed(`${manifest.references.length} Referenzen und ${topics.topicMappings.length} Themen geladen.`, {
          references: manifest.references.length,
          topics: topics.topicMappings.length
        });
      }
    },
    {
      id: 'FT-002B',
      name: 'Lokaler Referenzspeicher',
      category: 'Referenzen',
      expected: '.data/references/books/ existiert oder kann erstellt werden.',
      run() {
        if (!includeFileTests) {
          return skipped('Dateitest wurde deaktiviert.', {}, 'includeFileTests aktivieren.');
        }
        const booksDir = path.join(rootDir, '.data/references/books');
        if (!existsSync(booksDir)) mkdirSync(booksDir, { recursive: true });
        ok(existsSync(booksDir), 'Referenzspeicher konnte nicht erstellt werden.');
        return passed('Referenzspeicher ist vorhanden.', { path: '.data/references/books' });
      }
    },
    {
      id: 'FT-003',
      name: 'Dokument-Outline erkennen',
      category: 'Dokumentanalyse',
      expected: 'Mindestens 6 Kapitel, Analysephase, Entwurfsphase und Qualitätssicherung werden erkannt.',
      run(shared) {
        const chapters = flattenChapters(shared.analysis.outline.chapters);
        ok(chapters.length >= 6, `Nur ${chapters.length} Kapitel erkannt.`);
        ok(chapters.some((chapter) => /analysephase/i.test(chapter.title)), 'Analysephase fehlt.');
        ok(chapters.some((chapter) => /entwurfsphase/i.test(chapter.title)), 'Entwurfsphase fehlt.');
        ok(chapters.some((chapter) => /qualitaetssicherung|qualitätssicherung/i.test(chapter.title)), 'Qualitätssicherung fehlt.');
        return passed(`${chapters.length} Kapitel erkannt.`, { chapters: chapters.map((chapter) => chapter.title) });
      }
    },
    {
      id: 'FT-004',
      name: 'Kapitel-Regel-Matrix erzeugen',
      category: 'Dokumentanalyse',
      expected: 'Analyse, Datenmodell und Qualitätssicherung erhalten passende Regeln mit Confidence-Werten.',
      run(shared) {
        const matrix = shared.analysis.ruleMatrix.matrix;
        const analysis = matrix.find((entry) => /analyse/i.test(entry.chapterTitle));
        const dataModel = matrix.find((entry) => /datenmodell/i.test(entry.chapterTitle));
        const quality = matrix.find((entry) => /qualitaet|qualität|test/i.test(entry.chapterTitle));
        ok(analysis?.matchedRules?.some((rule) => /^AN-|analyse/i.test(`${rule.ruleId} ${rule.simpleTitle}`)), 'Analyse-Regeln fehlen.');
        ok(dataModel?.matchedRules?.some((rule) => /^DM-|datenmodell|datenbank/i.test(`${rule.ruleId} ${rule.simpleTitle}`)), 'Datenmodell-Regeln fehlen.');
        ok(quality?.matchedRules?.some((rule) => /^QM-|test|qualitaet|qualität/i.test(`${rule.ruleId} ${rule.simpleTitle}`)), 'QS-Regeln fehlen.');
        ok(matrix.every((entry) => typeof entry.confidence === 'number'), 'Confidence-Werte fehlen.');
        return passed(`${matrix.length} Matrixzeilen erzeugt.`, {
          mappedRuleCount: shared.analysis.ruleMatrix.summary.mappedRuleCount
        });
      }
    },
    {
      id: 'FT-005',
      name: 'Rule Simplifier',
      category: 'Ruleset',
      expected: 'Regel wird in simpleTitle, simpleExplanation und userChecklist übersetzt.',
      run() {
        const rule = FIAE_RULESET_V2.rules.find((item) => /datenmodell/i.test(`${item.id} ${item.title} ${item.description}`)) || FIAE_RULESET_V2.rules[0];
        const simple = simplifyRuleForUser(rule);
        ok(simple.simpleTitle, 'simpleTitle fehlt.');
        ok(simple.simpleExplanation, 'simpleExplanation fehlt.');
        ok(Array.isArray(simple.userChecklist) && simple.userChecklist.length > 0, 'userChecklist fehlt.');
        ok(simple.simpleTitle !== rule.id, 'Haupttext ist nur eine technische Regel-ID.');
        return passed(`Regel ${rule.id} vereinfacht.`, simple);
      }
    },
    {
      id: 'FT-006',
      name: 'Prompt Builder',
      category: 'Prompt-Assistent',
      expected: 'Prompt enthält Regelbezug, Statuslogik, Kapitelkontext und keine vollständige Doku oder API-Keys.',
      run(shared) {
        const entry = shared.analysis.ruleMatrix.matrix.find((item) => item.matchedRules.length) || shared.analysis.ruleMatrix.matrix[0];
        const promptMeta = buildUserPrompt({
          taskType: 'check_chapter',
          chapter: {
            id: entry.chapterId,
            number: entry.chapterNumber,
            title: entry.chapterTitle,
            detectedMeaning: entry.detectedMeaning,
            textExcerpt: entry.textExcerpt,
            wordCount: entry.wordCount
          },
          matchedRules: entry.matchedRules.slice(0, 3),
          missingRules: entry.missingExpectedRules.slice(0, 1),
          evidence: entry.matchedRules.slice(0, 2).map((rule) => ({ section: rule.ruleId, quote: rule.evidence })),
          references: entry.matchedRules.flatMap((rule) => rule.references || []).slice(0, 3),
          userInstruction: 'Bitte fachlich knapp prüfen.'
        });
        ok(/Statuslogik/i.test(promptMeta.prompt), 'Statuslogik fehlt.');
        ok(/Kapitelkontext/i.test(promptMeta.prompt), 'Kapitelkontext fehlt.');
        ok(promptMeta.includedRuleIds.length > 0, 'Regelbezug fehlt.');
        ok(promptMeta.prompt.length < fixtureDoc.bodyText.length + 5000, 'Prompt enthält zu viel Dokumenttext.');
        assertNoSecrets(promptMeta);
        return passed(`Prompt mit ${promptMeta.includedRuleIds.length} Regeln erzeugt.`, {
          includedRuleIds: promptMeta.includedRuleIds,
          estimatedContextSize: promptMeta.estimatedContextSize
        });
      }
    },
    {
      id: 'FT-007',
      name: 'Evidence Extractor',
      category: 'Dokumentanalyse',
      expected: 'Passende kurze Fundstellen werden erkannt und evidenceQuality ist gesetzt.',
      run(shared) {
        const rule = FIAE_RULESET_V2.rules.find((item) => /datenmodell|anforderung|qualitaet|qualität/i.test(`${item.title} ${item.description}`)) || FIAE_RULESET_V2.rules[0];
        const evidence = extractEvidenceForRule({
          rule,
          sections: shared.analysis.sections,
          doc: shared.analysis.doc,
          AntragDoc: shared.analysis.AntragDoc
        });
        ok(evidence.length > 0, 'Keine Fundstellen erkannt.');
        ok(evidence.every((item) => item.quote.length <= 520), 'Fundstelle ist zu lang.');
        ok(evidence.every((item) => ['strong', 'medium', 'weak'].includes(item.evidenceQuality)), 'evidenceQuality fehlt.');
        return passed(`${evidence.length} Fundstelle(n) erkannt.`, { ruleId: rule.id, evidence });
      }
    },
    {
      id: 'FT-008',
      name: 'API-Key-Config Fallback',
      category: 'KI-Konfiguration',
      expected: 'Fallback-Konfiguration ist nachvollziehbar und publicAiConfig enthält keinen Klartext-Key.',
      run() {
        const publicInfo = getAiProviderInfo(null);
        ok(!Object.prototype.hasOwnProperty.call(publicInfo, 'apiKey'), 'Public Config enthält apiKey.');
        const hasKey = hasEffectiveAiKey(null);
        const actual = hasKey
          ? `Effektiver ${publicInfo.effectiveKeySource}-Key ist konfiguriert, aber nicht öffentlich sichtbar.`
          : 'Kein effektiver Key vorhanden; UI kann eine verständliche Meldung anzeigen.';
        return passed(actual, publicInfo);
      }
    },
    {
      id: 'FT-009',
      name: 'Multi-KI-Fallback ohne Key',
      category: 'Multi-KI',
      expected: 'Ohne API-Key stürzt die Analyse nicht ab und meldet verständlich, dass keine KI genutzt wurde.',
      async run(shared) {
        const report = baseReportFromEvaluation(shared.analysis);
        const consensus = await runAiConsensusReview({
          doc: shared.analysis.doc,
          AntragDoc: shared.analysis.AntragDoc,
          sections: shared.analysis.sections,
          baseReport: report,
          maxRounds: 2,
          maxItems: 3,
          apiKeyAvailable: false,
          client: null
        });
        ok(consensus.enabled === false || consensus.actualAiUsed === false, 'Fallback meldet KI als genutzt.');
        ok(consensus.reason, 'Verständliche reason fehlt.');
        return passed(consensus.reason, consensus);
      }
    },
    {
      id: 'FT-010',
      name: 'Conflict Detector',
      category: 'Multi-KI',
      expected: 'Primary grün vs. Counter rot wird als hoher Konflikt mit weiterer Runde erkannt.',
      run() {
        const primary = createReviewItem({
          reviewer: 'primary',
          ruleId: 'FT-REGEL',
          status: 'gruen',
          confidence: 0.9,
          evidence: [{ section: 'fixture', quote: 'vorhanden', evidenceQuality: 'strong' }]
        });
        const counter = createReviewItem({
          reviewer: 'counter',
          ruleId: 'FT-REGEL',
          status: 'rot',
          confidence: 0.8,
          evidence: []
        });
        const conflicts = detectReviewConflicts(primary, counter, { id: 'FT-REGEL' });
        ok(conflicts.some((item) => item.level === 'hoch' && item.requiresAnotherRound), 'Hoher Konflikt wurde nicht erkannt.');
        return passed(`${conflicts.length} Konflikt(e) erkannt.`, { conflicts });
      }
    },
    {
      id: 'FT-011',
      name: 'Consensus Builder',
      category: 'Multi-KI',
      expected: 'Reviews ohne Konflikt erzeugen finalStatus und consensusReached=true.',
      run() {
        const primary = createReviewItem({ reviewer: 'primary', ruleId: 'FT-REGEL', status: 'gelb', confidence: 0.7 });
        const counter = createReviewItem({ reviewer: 'counter', ruleId: 'FT-REGEL', status: 'gelb', confidence: 0.7 });
        const consensus = buildConsensusItem({
          ruleId: 'FT-REGEL',
          rule: { id: 'FT-REGEL', title: 'Funktionstest-Regel' },
          baseResult: { status: 'gelb', assessment: 'teilweise' },
          reviews: [primary, counter],
          conflicts: []
        });
        ok(consensus.finalStatus, 'finalStatus fehlt.');
        ok(consensus.consensusReached === true, 'Konsens wurde nicht erreicht.');
        return passed(`Finaler Status: ${consensus.finalStatus}.`, consensus);
      }
    },
    {
      id: 'FT-012',
      name: 'Audit Report',
      category: 'Audit',
      expected: 'Audit enthält Schritte, RuleMappings, Evidence, Summary und keine Secrets.',
      run(shared) {
        const audit = buildAuditFixture(shared.analysis);
        ok(audit.steps.length > 0, 'Audit-Schritte fehlen.');
        ok(audit.ruleMappings.length > 0, 'RuleMappings fehlen.');
        ok(audit.evidence.length > 0, 'Evidence fehlt.');
        ok(audit.summary, 'Summary fehlt.');
        assertNoSecrets(audit);
        assertNoLongTexts(audit);
        return passed(`Audit ${audit.id} erzeugt.`, {
          steps: audit.steps.length,
          mappings: audit.ruleMappings.length,
          evidence: audit.evidence.length
        });
      }
    },
    {
      id: 'FT-013',
      name: 'Excel Export mit Audit',
      category: 'Export',
      expected: 'Excel kann Report mit auditReport verarbeiten und Audit-Blätter anlegen.',
      async run(shared) {
        const { createExcel } = await import('../../../server.js');
        const report = {
          ...baseReportFromEvaluation(shared.analysis),
          auditReport: buildAuditFixture(shared.analysis)
        };
        const buffer = await createExcel(report);
        ok(Buffer.byteLength(Buffer.from(buffer)) > 0, 'Excel-Datei ist leer.');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(buffer));
        const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
        ok(sheetNames.includes('Audit Übersicht'), 'Blatt "Audit Übersicht" fehlt.');
        ok(sheetNames.includes('Analyse Schritte'), 'Blatt "Analyse Schritte" fehlt.');
        return passed(`Excel mit ${sheetNames.length} Blättern erzeugt.`, { sheetNames });
      },
      recommendation: 'Excel-Audit-Blätter im Export prüfen.'
    },
    {
      id: 'FT-014',
      name: 'Timer Quiz Bundle',
      category: 'Timer-Quiz',
      expected: 'public/timer-quiz.bundle.js existiert und ist nicht leer.',
      run() {
        if (!includeFileTests) {
          return skipped('Dateitest wurde deaktiviert.', {}, 'includeFileTests aktivieren.');
        }
        const filePath = path.join(rootDir, 'public/timer-quiz.bundle.js');
        if (!existsSync(filePath)) {
          return warning('Timer-Quiz-Bundle fehlt.', {}, 'npm run build:timer-quiz ausführen.');
        }
        const size = statSync(filePath).size;
        if (size <= 0) {
          return warning('Timer-Quiz-Bundle ist leer.', { size }, 'npm run build:timer-quiz ausführen.');
        }
        return passed(`Bundle vorhanden (${size} Bytes).`, { size });
      }
    },
    {
      id: 'FT-015',
      name: 'Prompt-Assistent API-Modell',
      category: 'Prompt-Assistent',
      expected: 'Outline, Matrix und Prompt lassen sich als vollständiger Flow direkt über Funktionen erzeugen.',
      run(shared) {
        const entry = shared.analysis.ruleMatrix.matrix.find((item) => item.matchedRules.length);
        ok(entry, 'Keine Matrixzeile mit Regeln gefunden.');
        const references = entry.matchedRules.flatMap((rule) => rule.references || resolveReferencesForRulesetRule({ id: rule.ruleId, title: rule.title })).slice(0, 4);
        const promptMeta = buildUserPrompt({
          taskType: 'create_todo_list',
          chapter: {
            id: entry.chapterId,
            number: entry.chapterNumber,
            title: entry.chapterTitle,
            detectedMeaning: entry.detectedMeaning,
            textExcerpt: entry.textExcerpt,
            wordCount: entry.wordCount
          },
          matchedRules: entry.matchedRules.slice(0, 4),
          missingRules: entry.missingExpectedRules.slice(0, 2),
          evidence: entry.matchedRules.slice(0, 3).map((rule) => ({ section: rule.ruleId, quote: rule.evidence })),
          references
        });
        ok(shared.analysis.outline.chapters.length > 0, 'Outline fehlt.');
        ok(shared.analysis.ruleMatrix.matrix.length > 0, 'Matrix fehlt.');
        ok(promptMeta.prompt && promptMeta.includedRuleIds.length > 0, 'Prompt fehlt.');
        return passed(`Flow mit ${promptMeta.includedRuleIds.length} Regel(n) funktioniert.`, {
          chapter: entry.chapterTitle,
          includedRuleIds: promptMeta.includedRuleIds,
          estimatedContextSize: promptMeta.estimatedContextSize
        });
      }
    }
  ];
}

export async function runFunctionalTests({
  includeAi = false,
  includeFileTests = true,
  aiAvailable = hasEffectiveAiKey(null),
  aiProviderInfo = getAiProviderInfo(null)
} = {}) {
  const start = performance.now();
  const createdAt = new Date().toISOString();
  const referencesBookDir = path.join(rootDir, '.data/references/books');
  if (includeFileTests && !existsSync(referencesBookDir)) {
    mkdirSync(referencesBookDir, { recursive: true });
  }

  const shared = {
    analysis: buildFixtureAnalysis()
  };

  const tests = [];
  for (const definition of testDefinitions({ includeFileTests })) {
    tests.push(await runOne(definition, shared));
  }

  if (includeAi) {
    const startAi = performance.now();
    const keyAvailable = Boolean(aiAvailable);
    tests.push({
      id: 'FT-AI-001',
      name: 'Optionale KI-Verbindung',
      category: 'KI-Konfiguration',
      status: keyAvailable ? 'passed' : 'skipped',
      durationMs: durationSince(startAi),
      expected: 'KI-Verbindung wird nur geprüft, wenn ein effektiver API-Key vorhanden ist.',
      actual: keyAvailable
        ? `Effektiver KI-Key ist über ${aiProviderInfo.effectiveKeySource} verfügbar.`
        : 'Kein effektiver API-Key vorhanden; KI-Verbindungstest wurde übersprungen.',
      details: sanitizeDetails(aiProviderInfo),
      recommendation: keyAvailable ? '' : 'Eigenen API-Key speichern oder DEFAULT_OPENAI_API_KEY_FILE konfigurieren.'
    });
  }

  const summary = {
    total: tests.length,
    passed: tests.filter((test) => test.status === 'passed').length,
    failed: tests.filter((test) => test.status === 'failed').length,
    warnings: tests.filter((test) => test.status === 'warning').length,
    skipped: tests.filter((test) => test.status === 'skipped').length
  };

  const testRun = {
    createdAt,
    durationMs: durationSince(start),
    summary,
    tests
  };

  const visual = buildVisualReportModel({ auditReport: buildAuditFixture(shared.analysis) });
  testRun.details = {
    auditVisualModelReady: Boolean(visual.summaryCards?.length)
  };
  assertNoSecrets(testRun);

  return testRun;
}
