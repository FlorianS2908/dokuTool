import { extractEvidenceForRule } from '../analysis/evidence-extractor.js';
import { evaluateFiaeRulesetV2 } from './fiae-ruleset-v2-evaluator.js';
import { simplifyRuleForUser } from './rule-simplifier.js';
import { resolveReferencesForRulesetRule } from '../references/reference-resolver.js';

function normalize(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function lower(text = '') {
  return normalize(text).toLowerCase();
}

function flattenChapters(chapters = []) {
  const result = [];
  for (const chapter of chapters || []) {
    result.push(chapter);
    result.push(...flattenChapters(chapter.children || []));
  }
  return result;
}

const meaningPatterns = [
  { meaning: 'Formalia / Verzeichnisse', phaseKeys: ['formal'], patterns: [/inhaltsverzeichnis|abbildungsverzeichnis|quellen|anhang|verzeichnis/i] },
  { meaning: 'Einleitung / Projektkontext', phaseKeys: ['introduction'], patterns: [/einleitung|projektumfeld|projektziel|projektbegruendung|ausgangssituation/i] },
  { meaning: 'Analyse / Anforderungen', phaseKeys: ['analysis'], patterns: [/analyse|ist[-\s]?zustand|soll[-\s]?zustand|anforderung|stakeholder|datenanalyse/i] },
  { meaning: 'Wirtschaftlichkeit / Ressourcen', phaseKeys: ['economic_analysis', 'planning'], patterns: [/wirtschaft|kosten|ressource|zeitplanung|projektplanung|amortisation/i] },
  { meaning: 'Planung / Vorgehen', phaseKeys: ['planning'], patterns: [/planung|projektphase|meilenstein|vorgehensmodell|scrum|agil/i] },
  { meaning: 'Entwurf / Architektur', phaseKeys: ['design', 'uml'], patterns: [/entwurf|architektur|uml|diagramm|datenmodell|schnittstelle|api|komponente/i] },
  { meaning: 'Implementierung / Umsetzung', phaseKeys: ['implementation'], patterns: [/implementierung|realisierung|umsetzung|entwicklung|code|klasse/i] },
  { meaning: 'Test / Qualitaetssicherung', phaseKeys: ['quality_management'], patterns: [/test|qualitaet|qualität|qs|abnahme|testfall/i] },
  { meaning: 'Dokumentation / Uebergabe', phaseKeys: ['documentation'], patterns: [/dokumentation|handbuch|uebergabe|betrieb/i] },
  { meaning: 'Fazit / Soll-Ist-Vergleich', phaseKeys: ['conclusion'], patterns: [/fazit|soll[-\s]?ist|schluss|ausblick|lessons learned/i] },
  { meaning: 'KI / Quellen / Eigenstaendigkeit', phaseKeys: ['ai_compliance'], patterns: [/ki|chatgpt|quelle|eigenstaendigkeit|hilfsmittel/i] }
];

function detectMeaning(chapter = {}) {
  const text = `${chapter.number || ''} ${chapter.title || ''} ${chapter.textExcerpt || ''}`;
  let best = { detectedMeaning: 'Allgemeiner Dokumentabschnitt', phaseKeys: [], confidence: 0.35 };
  for (const entry of meaningPatterns) {
    const hits = entry.patterns.filter((pattern) => pattern.test(text)).length;
    if (!hits) continue;
    const confidence = Math.min(0.96, 0.56 + hits * 0.16);
    if (confidence > best.confidence) {
      best = {
        detectedMeaning: entry.meaning,
        phaseKeys: entry.phaseKeys,
        confidence
      };
    }
  }
  return best;
}

function wordsForRule(rule = {}) {
  return [
    rule.title,
    rule.category,
    rule.phase,
    ...(rule.wordingAliases || []),
    ...(rule.positiveIndicators || []),
    ...(rule.referenceTopics || [])
  ]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function scoreRuleForChapter(rule, chapter, meaning) {
  const chapterText = lower(`${chapter.number || ''} ${chapter.title || ''} ${chapter.textExcerpt || ''}`);
  let score = 0;
  const phaseKey = rule.phaseKey || rule.phase;

  if (meaning.phaseKeys.includes(phaseKey)) score += 8;
  if (phaseKey === 'regional_ihk') score += 1;
  if (phaseKey === 'formal' && chapter.startIndex < 9000) score += 4;
  if (phaseKey === 'ai_compliance' && /quelle|eigenstaendigkeit|eigenständigkeit|ki|hilfsmittel/.test(chapterText)) score += 5;
  if (phaseKey === 'uml' && /uml|diagramm|klasse|sequenz|aktivitaet|aktivität/.test(chapterText)) score += 7;

  const uniqueWords = [...new Set(wordsForRule(rule))].slice(0, 45);
  const wordHits = uniqueWords.filter((word) => chapterText.includes(word)).length;
  score += Math.min(8, wordHits);

  if (chapterText.includes(lower(rule.category))) score += 3;
  if (chapterText.includes(lower(rule.title).replace(/\bpruefen\b/g, '').trim())) score += 4;

  return score;
}

function severityToApp(severity = '') {
  return {
    CRITICAL: 'hoch',
    MAJOR: 'hoch',
    MINOR: 'mittel',
    INFO: 'niedrig'
  }[severity] || 'mittel';
}

function statusForRule(rule, resultById, evidence) {
  const result = resultById.get(rule.id);
  if (result) {
    return {
      status: result.status,
      severity: result.severity,
      assessment: result.assessment,
      recommendation: result.recommendation
    };
  }
  if (evidence.length >= 2) return { status: 'gruen', severity: severityToApp(rule.severity), assessment: 'vorhanden', recommendation: rule.recommendation };
  if (evidence.length === 1) return { status: 'gelb', severity: severityToApp(rule.severity), assessment: 'teilweise belegt', recommendation: rule.recommendation };
  return { status: rule.severity === 'CRITICAL' ? 'rot' : 'gelb', severity: severityToApp(rule.severity), assessment: 'nicht ausreichend erkannt', recommendation: rule.recommendation };
}

function evidenceText(evidence = []) {
  return evidence.slice(0, 2).map((item) => `${item.section}: ${item.quote}`).join(' | ');
}

function toMatchedRule(rule, resultById, evidence) {
  const simplified = simplifyRuleForUser(rule);
  const status = statusForRule(rule, resultById, evidence);
  return {
    ruleId: rule.id,
    title: rule.title,
    simpleTitle: simplified.simpleTitle,
    simpleExplanation: simplified.simpleExplanation,
    userChecklist: simplified.userChecklist,
    status: status.status,
    severity: status.severity,
    assessment: status.assessment,
    evidence: evidenceText(evidence) || '-',
    recommendation: status.recommendation || rule.recommendation || 'Manuell pruefen und konkretisieren.',
    references: resolveReferencesForRulesetRule(rule)
  };
}

function toMissingRule(rule, reason) {
  const simplified = simplifyRuleForUser(rule);
  return {
    ruleId: rule.id,
    simpleTitle: simplified.simpleTitle,
    simpleExplanation: simplified.simpleExplanation,
    reason
  };
}

function promptSuggestionsFor(meaning, matchedRules, missingRules) {
  const suggestions = ['Kapitel gegen IHK-Regeln pruefen', 'Fehlende Inhalte als To-do-Liste anzeigen'];
  if (/entwurf|architektur/i.test(meaning.detectedMeaning)) suggestions.push('UML oder Datenmodell gezielt pruefen');
  if (/test|qualitaet/i.test(meaning.detectedMeaning)) suggestions.push('QS/Test fachlich pruefen');
  if (missingRules.length) suggestions.push('Fehlende kritische Inhalte finden');
  if (matchedRules.some((rule) => rule.status === 'rot' || rule.status === 'gelb')) suggestions.push('IHK-Risiko bewerten');
  return [...new Set(suggestions)].slice(0, 5);
}

export function mapRulesToOutline({ outline = {}, ruleset = {}, sections = {}, doc = {}, AntragDoc = null }) {
  const rules = Array.isArray(ruleset.rules) ? ruleset.rules : [];
  const chapters = flattenChapters(outline.chapters || []);
  const evaluation = evaluateFiaeRulesetV2({ doc, AntragDoc, sections });
  const resultById = new Map((evaluation.results || []).map((result) => [result.ruleset?.id, result]));
  const mappedRuleIds = new Set();

  const matrix = chapters.map((chapter) => {
    const meaning = detectMeaning(chapter);
    const scoredRules = rules
      .map((rule) => ({
        rule,
        score: scoreRuleForChapter(rule, chapter, meaning),
        evidence: extractEvidenceForRule({ rule, sections, doc, AntragDoc })
      }))
      .filter((item) => item.score >= 5 || item.evidence.length)
      .sort((a, b) => b.score - a.score || String(a.rule.id).localeCompare(String(b.rule.id)));

    const expectedRules = rules
      .filter((rule) => meaning.phaseKeys.includes(rule.phaseKey || rule.phase))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const matchedRules = scoredRules.slice(0, 14).map((item) => {
      mappedRuleIds.add(item.rule.id);
      return toMatchedRule(item.rule, resultById, item.evidence);
    });

    const matchedIds = new Set(matchedRules.map((rule) => rule.ruleId));
    const missingExpectedRules = expectedRules
      .filter((rule) => !matchedIds.has(rule.id))
      .filter((rule) => ['CRITICAL', 'MAJOR'].includes(rule.severity) || rule.requiresManualReview)
      .slice(0, 8)
      .map((rule) => toMissingRule(rule, `In diesem Kapitel wurde kein klarer Bezug zu "${rule.title}" erkannt.`));

    return {
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      chapterLevel: chapter.level,
      detectedMeaning: meaning.detectedMeaning,
      confidence: Number(meaning.confidence.toFixed(2)),
      textExcerpt: chapter.textExcerpt,
      wordCount: chapter.wordCount,
      matchedRules,
      missingExpectedRules,
      promptSuggestions: promptSuggestionsFor(meaning, matchedRules, missingExpectedRules)
    };
  });

  const criticalRuleIds = new Set(
    rules
      .filter((rule) => ['CRITICAL', 'MAJOR'].includes(rule.severity))
      .map((rule) => rule.id)
  );
  const unmappedCriticalRuleCount = [...criticalRuleIds].filter((id) => !mappedRuleIds.has(id)).length;

  return {
    matrix,
    summary: {
      chapterCount: chapters.length,
      mappedRuleCount: mappedRuleIds.size,
      unmappedCriticalRuleCount
    }
  };
}
