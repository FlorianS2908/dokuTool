import { createReviewItem } from './review-schema.js';

export async function runCounterReviewer({ primaryReview, baseResult, evidence = [], round = 1 }) {
  const hasEvidence = evidence.length > 0 || primaryReview.evidence?.length > 0;
  const status = hasEvidence ? primaryReview.status : 'grau';
  return createReviewItem({
    reviewer: 'counter',
    round,
    ruleId: primaryReview.ruleId || baseResult?.ruleset?.id,
    status,
    confidence: hasEvidence ? Math.max(0.55, primaryReview.confidence - 0.05) : 0.3,
    finding: primaryReview.finding,
    evidence: evidence.length ? evidence : primaryReview.evidence,
    reason: hasEvidence
      ? 'Counter Reviewer kann die regelgebundene Bewertung anhand der Fundstellen nachvollziehen.'
      : 'Counter Reviewer findet keine belastbare Fundstelle und fordert manuelle Pruefung.',
    recommendation: primaryReview.recommendation || baseResult?.recommendation || '',
    manualReviewRequired: !hasEvidence || status === 'grau',
    disagreements: []
  });
}
