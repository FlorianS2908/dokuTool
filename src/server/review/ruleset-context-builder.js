import { FIAE_RULESET_V2 } from '../../../ruleset-evaluator.js';
import { extractEvidenceForRule } from '../analysis/evidence-extractor.js';
import { resolveReferencesForResult, resolveReferencesForRulesetRule } from '../references/reference-resolver.js';

function normalize(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function trimText(text = '', max = 1200) {
  const value = normalize(text);
  return value.length > max ? `${value.slice(0, max).trim()} ...` : value;
}

function findRule(ruleId) {
  return (FIAE_RULESET_V2.rules || []).find((rule) => rule.id === ruleId) || null;
}

function sectionExcerpt(item) {
  return {
    section: item.section || 'unknown',
    quote: trimText(item.quote || '', 1200),
    reason: trimText(item.reason || '', 320),
    evidenceQuality: item.evidenceQuality || 'weak'
  };
}

function referenceHint(reference) {
  return {
    id: reference.id,
    title: reference.title,
    fileType: reference.fileType,
    topics: (reference.topics || []).slice(0, 8),
    reason: reference.reason || ''
  };
}

function baseResultForRule(baseReport, ruleId) {
  return (baseReport?.results || []).find((result) => result.ruleset?.id === ruleId || result.ruleId === ruleId) || null;
}

function criticalCategory(result = {}, rule = {}) {
  const text = `${result.category || ''} ${result.criterion || ''} ${rule.category || ''} ${rule.title || ''}`.toLowerCase();
  return /projektziel|projektabgrenzung|anforderungsanalyse|datenanalyse|wirtschaftlich|ressourcen|architektur|datenmodell|geschaeftslogik|geschäftslogik|schnittstelle|qualitaet|qualität|soll[-\s]?ist|antrag|ki-richtlinie|datenschutz/.test(text);
}

function candidateScore(result = {}, rule = {}) {
  let score = 0;
  if (result.status === 'rot') score += 100;
  if (result.status === 'gelb') score += 80;
  if (result.severity === 'hoch' || ['CRITICAL', 'MAJOR'].includes(rule.severity)) score += 50;
  if (rule.requiresManualReview || result.status === 'grau') score += 30;
  if (criticalCategory(result, rule)) score += 25;
  return score;
}

export function buildRuleReviewContext({
  rule,
  baseResult,
  sections = {},
  doc = {},
  AntragDoc = null,
  references = null,
  options = {}
}) {
  const selectedRule = rule || findRule(baseResult?.ruleset?.id || baseResult?.ruleId);
  if (!selectedRule) {
    throw new Error('Ruleset-Regel fuer Review-Kontext nicht gefunden.');
  }
  const selectedBase = baseResult || {};
  const documentEvidence = extractEvidenceForRule({ rule: selectedRule, sections, doc, AntragDoc })
    .slice(0, 3)
    .map(sectionExcerpt);
  const referenceHints = (references || resolveReferencesForRulesetRule(selectedRule) || resolveReferencesForResult(selectedBase))
    .slice(0, 4)
    .map(referenceHint);

  return {
    rule: {
      id: selectedRule.id,
      title: selectedRule.title,
      category: selectedRule.category,
      phase: selectedRule.phaseKey || selectedRule.phase,
      severity: selectedRule.severity,
      description: selectedRule.description,
      purpose: selectedRule.purpose,
      requiredEvidence: selectedRule.requiredEvidence || [],
      positiveIndicators: selectedRule.positiveIndicators || [],
      negativeIndicators: selectedRule.negativeIndicators || [],
      statusRules: selectedRule.statusRules || {},
      recommendation: selectedRule.recommendation,
      wordingAliases: selectedRule.wordingAliases || [],
      applies: selectedRule.applies || {},
      referenceTopics: selectedRule.referenceTopics || [],
      requiresManualReview: Boolean(selectedRule.requiresManualReview)
    },
    baseResult: {
      status: selectedBase.status || 'grau',
      assessment: selectedBase.assessment || '',
      evidence: trimText(selectedBase.evidence || '', 1200),
      reason: trimText(selectedBase.reason || '', 1200),
      recommendation: trimText(selectedBase.recommendation || '', 800),
      severity: selectedBase.severity || ''
    },
    documentEvidence,
    referenceHints,
    applicationExcerpt: AntragDoc?.text ? trimText(AntragDoc.text, 1200) : '',
    options: {
      task: options.task || 'multi_ai_review',
      noFullDocument: true,
      maxExcerptLength: 1200
    }
  };
}

export function buildRuleReviewBatch({
  baseReport,
  sections = {},
  doc = {},
  AntragDoc = null,
  maxItems = Number(process.env.MULTI_AI_MAX_RULES || 12)
}) {
  const results = Array.isArray(baseReport?.results) ? baseReport.results : [];
  return results
    .map((result) => {
      const ruleId = result.ruleset?.id || result.ruleId;
      const rule = findRule(ruleId);
      return { result, rule, score: rule ? candidateScore(result, rule) : 0 };
    })
    .filter((item) => item.rule && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((item) => buildRuleReviewContext({
      rule: item.rule,
      baseResult: item.result,
      sections,
      doc,
      AntragDoc
    }));
}
