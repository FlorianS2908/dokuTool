import { loadReferenceManifest, listLocalReferences } from './reference-store.js';
import { loadReferenceTopics } from './reference-store.js';

function ruleMatchesPattern(ruleId = '', pattern = '') {
  if (!pattern) return false;
  if (pattern.endsWith('*')) return ruleId.startsWith(pattern.slice(0, -1));
  return ruleId === pattern;
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function scoreReferenceForRule(reference, rule, topics = []) {
  let score = 0;
  const reasons = [];
  const ruleId = rule?.id || rule?.ruleset?.id || '';
  const ruleText = `${rule?.title || ''} ${rule?.criterion || ''} ${rule?.category || ''} ${rule?.phase || ''}`.toLowerCase();
  const requestedTopics = [...new Set([...normalizeList(rule?.referenceTopics), ...normalizeList(topics)])];

  if ((reference.mappedRules || []).some((pattern) => ruleMatchesPattern(ruleId, pattern))) {
    score += 5;
    reasons.push(`Regelzuordnung ${ruleId}`);
  }

  for (const topic of reference.topics || []) {
    const lTopic = String(topic).toLowerCase();
    if (requestedTopics.map((item) => item.toLowerCase()).includes(lTopic)) {
      score += 4;
      reasons.push(`Topic ${topic}`);
    } else if (ruleText.includes(lTopic)) {
      score += 2;
      reasons.push(`Kategorie/Regeltext enthaelt ${topic}`);
    }
  }

  return { score, reasons };
}

function toReferenceMetadata(reference, reasons = []) {
  return {
    id: reference.id,
    title: reference.title,
    fileType: reference.fileType,
    topics: reference.topics || [],
    mappedRules: reference.mappedRules || [],
    status: reference.status || 'missing',
    reason: reasons.join('; ') || 'Metadaten-Match'
  };
}

export function resolveReferencesForRule({ rule, topics = [] }) {
  const references = listLocalReferences();
  return references
    .map((reference) => {
      const match = scoreReferenceForRule(reference, rule, topics);
      return { reference, ...match };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => toReferenceMetadata(item.reference, item.reasons));
}

export function resolveReferencesForRulesetRule(rule) {
  return resolveReferencesForRule({ rule, topics: rule?.referenceTopics || [] });
}

export function resolveReferencesForResult(result) {
  return resolveReferencesForRule({
    rule: {
      id: result?.ruleset?.id,
      title: result?.criterion,
      category: result?.ruleset?.category || result?.category,
      phase: result?.ruleset?.phase,
      referenceTopics: result?.ruleset?.referenceTopics || []
    }
  });
}

export function availableReferenceMetadata() {
  const manifest = loadReferenceManifest();
  const topics = loadReferenceTopics();
  return {
    manifest,
    topics,
    references: listLocalReferences()
  };
}
