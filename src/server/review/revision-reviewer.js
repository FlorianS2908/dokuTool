import { createReviewItem } from './review-schema.js';

export async function runRevisionReviewer({ primaryReview, conflicts = [], round = 2 }) {
  const criticalEvidenceConflict = conflicts.some((item) => item.type === 'evidence_conflict');
  const status = criticalEvidenceConflict && primaryReview.status === 'rot' ? 'gelb' : primaryReview.status;
  return createReviewItem({
    reviewer: 'revision',
    round,
    ruleId: primaryReview.ruleId,
    status,
    confidence: Math.max(0.35, primaryReview.confidence - (conflicts.length ? 0.12 : 0)),
    finding: primaryReview.finding,
    evidence: primaryReview.evidence,
    reason: conflicts.length
      ? `Primary Reviewer hat ${conflicts.length} Konflikt(e) beruecksichtigt und die Bewertung ${status === primaryReview.status ? 'verteidigt' : 'angepasst'}.`
      : 'Keine Revision erforderlich.',
    recommendation: primaryReview.recommendation,
    manualReviewRequired: primaryReview.manualReviewRequired || conflicts.some((item) => item.level === 'hoch'),
    disagreements: conflicts.map((item) => ({
      againstReviewer: 'counter',
      type: item.type,
      reason: item.description,
      suggestedStatus: item.counterStatus
    }))
  });
}
