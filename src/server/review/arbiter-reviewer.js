import { createReviewItem } from './review-schema.js';
import { buildArbiterReviewerPrompt } from './review-prompt-builder.js';
import { runModelReview } from './model-review-runner.js';

export async function runArbiterReviewer({ client = null, model = 'gpt-5.5', context = null, ruleId, reviews = [], conflicts = [], round = 3 }) {
  if (client && context) {
    return runModelReview({
      client,
      model,
      prompt: buildArbiterReviewerPrompt(context, reviews, conflicts),
      reviewer: 'arbiter',
      round,
      ruleId: context.rule?.id || ruleId,
      fallbackReason: 'Arbiter Reviewer konnte keine valide JSON-Antwort liefern.',
      fallbackRecommendation: context.rule?.recommendation
    });
  }

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
