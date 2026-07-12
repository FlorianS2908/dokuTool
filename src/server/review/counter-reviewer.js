import { createReviewItem } from './review-schema.js';
import { buildCounterReviewerPrompt } from './review-prompt-builder.js';
import { runModelReview } from './model-review-runner.js';

export async function runCounterReviewer({ client = null, model = 'gpt-5.5', context = null, primaryReview, baseResult = null, evidence = [], round = 1 }) {
  if (client && context) {
    return runModelReview({
      client,
      model,
      prompt: buildCounterReviewerPrompt(context, primaryReview),
      reviewer: 'counter',
      round,
      ruleId: context.rule?.id || primaryReview?.ruleId,
      fallbackReason: 'Counter Reviewer konnte keine valide JSON-Antwort liefern.',
      fallbackRecommendation: context.rule?.recommendation
    });
  }

  const hasEvidence = evidence.length > 0 || primaryReview.evidence?.length > 0;
  const status = hasEvidence ? primaryReview.status : 'grau';
  return createReviewItem({
    reviewer: 'counter',
    round,
    ruleId: primaryReview.ruleId || baseResult?.ruleset?.id || context?.rule?.id,
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
