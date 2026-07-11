import { createReviewItem } from './review-schema.js';

export async function runArbiterReviewer({ ruleId, reviews = [], conflicts = [], round = 3 }) {
  const withEvidence = reviews.filter((review) => review.evidence?.length);
  const preferred = withEvidence.at(-1) || reviews.at(-1);
  return createReviewItem({
    reviewer: 'arbiter',
    round,
    ruleId,
    status: preferred?.status || 'grau',
    confidence: preferred?.confidence ? Math.max(0.4, preferred.confidence - 0.08) : 0.35,
    finding: preferred?.finding || 'Schlichtung erforderlich',
    evidence: preferred?.evidence || [],
    reason: conflicts.length
      ? 'Arbiter entscheidet auf Basis der vorhandenen Fundstellen; offene starke Konflikte bleiben manuell pruefpflichtig.'
      : 'Arbiter bestaetigt den konsistenten Review-Verlauf.',
    recommendation: preferred?.recommendation || 'Manuelle Pruefung durch fachkundige Person vornehmen.',
    manualReviewRequired: conflicts.some((item) => item.level === 'hoch') || !preferred?.evidence?.length,
    disagreements: conflicts.map((item) => ({
      againstReviewer: 'primary',
      type: item.type,
      reason: item.description,
      suggestedStatus: item.counterStatus || item.primaryStatus
    }))
  });
}
