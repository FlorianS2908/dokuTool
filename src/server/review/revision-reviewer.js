import { createReviewItem } from './review-schema.js';
import { buildRevisionReviewerPrompt } from './review-prompt-builder.js';
import { runModelReview } from './model-review-runner.js';

export async function runRevisionReviewer({ client = null, model = 'gpt-5.5', context = null, primaryReview, counterReview = null, conflicts = [], round = 2 }) {
  if (client && context) {
    return runModelReview({
      client,
      model,
      prompt: buildRevisionReviewerPrompt(context, primaryReview, counterReview, conflicts),
      reviewer: 'revision',
      round,
      ruleId: context.rule?.id || primaryReview?.ruleId,
      fallbackReason: 'Revision Reviewer konnte keine valide JSON-Antwort liefern.',
      fallbackRecommendation: context.rule?.recommendation
    });
  }

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
