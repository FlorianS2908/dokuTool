import { randomUUID } from 'node:crypto';

const VALID_STEP_STATUSES = new Set(['success', 'warning', 'error', 'skipped']);
const VALID_RULE_STATUSES = new Set(['gruen', 'gelb', 'rot', 'grau']);
const VALID_EVIDENCE_QUALITY = new Set(['strong', 'medium', 'weak']);
const SECRET_KEY_PATTERN = /api[_-]?key|secret|password|token/i;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value = '', maxLength = 1200) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()} ...` : text;
}

function sanitizeValue(value, maxStringLength = 1200, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return cleanText(value, maxStringLength);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 5) return '[gekürzt]';

  if (Array.isArray(value)) {
    return value.slice(0, 60).map((item) => sanitizeValue(item, maxStringLength, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEY_PATTERN.test(key))
        .map(([key, item]) => [key, sanitizeValue(item, maxStringLength, depth + 1)])
    );
  }

  return String(value);
}

function normalizeStepStatus(status) {
  return VALID_STEP_STATUSES.has(status) ? status : 'success';
}

function normalizeRuleStatus(status) {
  return VALID_RULE_STATUSES.has(status) ? status : 'grau';
}

function clampConfidence(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function documentMeta(document = {}) {
  return {
    fileName: cleanText(document.fileName || document.originalname || '', 180),
    format: cleanText(document.format || document.mimetype || '', 80),
    sizeBytes: Number(document.sizeBytes || document.fileSizeBytes || document.size || 0) || 0
  };
}

export function createAnalysisAudit({ document = {}, outline = null } = {}) {
  return {
    id: randomUUID(),
    createdAt: nowIso(),
    document: documentMeta(document),
    steps: [],
    outline: {
      chapterCount: 0,
      chapters: []
    },
    ruleMappings: [],
    evidence: [],
    references: [],
    prompts: [],
    aiReviews: [],
    conflicts: [],
    summary: {
      score: 0,
      redCount: 0,
      yellowCount: 0,
      grayCount: 0,
      mappedRuleCount: 0,
      unmappedRuleCount: 0,
      manualReviewCount: 0,
      aiUsed: false,
      warnings: []
    },
    ...(outline ? { outline: sanitizeOutline(outline) } : {})
  };
}

export function sanitizeOutline(outline = {}) {
  const flatten = (chapters = []) => chapters.slice(0, 80).map((chapter) => ({
    id: cleanText(chapter.id || '', 80),
    number: cleanText(chapter.number || '', 24),
    title: cleanText(chapter.title || '', 180),
    level: Number(chapter.level || 1),
    wordCount: Number(chapter.wordCount || 0),
    textExcerpt: cleanText(chapter.textExcerpt || '', 420),
    children: flatten(chapter.children || [])
  }));

  const chapters = flatten(outline.chapters || []);
  const count = (list) => list.reduce((acc, item) => acc + 1 + count(item.children || []), 0);
  return {
    chapterCount: Number(outline.chapterCount || count(chapters) || 0),
    chapters,
    warnings: sanitizeValue(outline.warnings || [], 320)
  };
}

export function addAuditStep(audit, step) {
  if (!audit) return null;
  const entry = {
    id: cleanText(step?.id || `step_${audit.steps.length + 1}`, 80),
    label: cleanText(step?.label || 'Analyseschritt', 180),
    status: normalizeStepStatus(step?.status),
    durationMs: Math.max(0, Number(step?.durationMs || 0)),
    summary: cleanText(step?.summary || '', 360),
    details: sanitizeValue(step?.details || {}, 800)
  };
  audit.steps.push(entry);
  return entry;
}

export function addRuleMappingAudit(audit, mapping) {
  if (!audit) return null;
  const entry = {
    chapterId: cleanText(mapping?.chapterId || '', 80),
    chapterTitle: cleanText(mapping?.chapterTitle || '', 180),
    detectedMeaning: cleanText(mapping?.detectedMeaning || '', 160),
    ruleId: cleanText(mapping?.ruleId || '', 80),
    ruleTitle: cleanText(mapping?.ruleTitle || mapping?.title || '', 220),
    mappingReason: cleanText(mapping?.mappingReason || mapping?.reason || '', 420),
    confidence: clampConfidence(mapping?.confidence),
    status: normalizeRuleStatus(mapping?.status)
  };
  audit.ruleMappings.push(entry);
  return entry;
}

export function addEvidenceAudit(audit, evidence) {
  if (!audit) return null;
  const entry = {
    ruleId: cleanText(evidence?.ruleId || '', 80),
    section: cleanText(evidence?.section || '', 120),
    quote: cleanText(evidence?.quote || evidence?.evidence || '', 520),
    evidenceQuality: VALID_EVIDENCE_QUALITY.has(evidence?.evidenceQuality) ? evidence.evidenceQuality : 'weak',
    reason: cleanText(evidence?.reason || '', 360)
  };
  audit.evidence.push(entry);
  return entry;
}

export function addReferenceAudit(audit, reference) {
  if (!audit) return null;
  const entry = {
    ruleId: cleanText(reference?.ruleId || '', 80),
    referenceId: cleanText(reference?.referenceId || reference?.id || '', 120),
    title: cleanText(reference?.title || '', 220),
    topics: sanitizeValue(reference?.topics || [], 80),
    reason: cleanText(reference?.reason || '', 360)
  };
  audit.references.push(entry);
  return entry;
}

export function addPromptAudit(audit, promptMeta) {
  if (!audit) return null;
  const entry = {
    title: cleanText(promptMeta?.title || 'Prompt-Kontext', 180),
    taskType: cleanText(promptMeta?.taskType || '', 80),
    includedRuleIds: sanitizeValue(promptMeta?.includedRuleIds || [], 80),
    includedChapterIds: sanitizeValue(promptMeta?.includedChapterIds || [], 80),
    estimatedContextSize: Number(promptMeta?.estimatedContextSize || promptMeta?.prompt?.length || 0),
    warnings: sanitizeValue(promptMeta?.warnings || [], 240),
    promptExcerpt: cleanText(promptMeta?.prompt || '', 900)
  };
  audit.prompts.push(entry);
  return entry;
}

export function addAiReviewAudit(audit, review) {
  if (!audit) return null;
  const entry = {
    ruleId: cleanText(review?.ruleId || '', 80),
    reviewer: cleanText(review?.reviewer || '', 32),
    round: Number(review?.round || 1),
    status: cleanText(review?.status || 'grau', 24),
    confidence: clampConfidence(review?.confidence),
    reason: cleanText(review?.reason || review?.finalReason || '', 520),
    manualReviewRequired: Boolean(review?.manualReviewRequired)
  };
  audit.aiReviews.push(entry);
  return entry;
}

export function addConflictAudit(audit, conflict) {
  if (!audit) return null;
  const entry = {
    ruleId: cleanText(conflict?.ruleId || '', 80),
    round: Number(conflict?.round || 1),
    type: cleanText(conflict?.type || '', 80),
    level: cleanText(conflict?.level || '', 40),
    description: cleanText(conflict?.description || '', 520),
    requiresAnotherRound: Boolean(conflict?.requiresAnotherRound)
  };
  audit.conflicts.push(entry);
  return entry;
}

export function finalizeAudit(audit, report = {}) {
  if (!audit) return null;
  const statusSource = audit.ruleMappings.length
    ? audit.ruleMappings
    : (report.results || []).map((result) => ({ status: result.status }));
  const redCount = statusSource.filter((item) => item.status === 'rot').length;
  const yellowCount = statusSource.filter((item) => item.status === 'gelb').length;
  const grayCount = statusSource.filter((item) => item.status === 'grau').length;
  const mappedIds = new Set(audit.ruleMappings.map((item) => item.ruleId).filter(Boolean));
  const resultIds = new Set((report.results || []).map((item) => item.ruleset?.id || item.ruleId).filter(Boolean));
  const manualReviewCount = audit.aiReviews.filter((item) => item.manualReviewRequired).length
    || report.aiConsensus?.manualReviewCount
    || (report.results || []).filter((item) => item.status === 'grau').length;
  const warnings = [
    ...(audit.outline?.warnings || []),
    ...audit.steps.filter((step) => step.status === 'warning' || step.status === 'error').map((step) => step.summary || step.label),
    ...((report.metadata?.warnings || []).map((warning) => cleanText(warning, 260)))
  ].filter(Boolean);

  audit.summary = {
    score: Number(report.summary?.score || 0),
    redCount,
    yellowCount,
    grayCount,
    mappedRuleCount: mappedIds.size,
    unmappedRuleCount: Math.max(0, resultIds.size - mappedIds.size),
    manualReviewCount,
    aiUsed: Boolean(report.ai?.used || report.aiConsensus?.actualAiUsed),
    warnings: [...new Set(warnings)].slice(0, 30)
  };

  return sanitizeValue(audit, 1200);
}
