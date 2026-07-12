import { reviewFromBase } from './review-schema.js';
import { buildPrimaryReviewerPrompt } from './review-prompt-builder.js';
import { runModelReview } from './model-review-runner.js';

export async function runPrimaryReviewer({ client = null, model = 'gpt-5.5', context = null, baseResult = null, evidence = [], round = 1 }) {
  if (client && context) {
    return runModelReview({
      client,
      model,
      prompt: buildPrimaryReviewerPrompt(context),
      reviewer: 'primary',
      round,
      ruleId: context.rule?.id,
      fallbackReason: 'Primary Reviewer konnte keine valide JSON-Antwort liefern.',
      fallbackRecommendation: context.rule?.recommendation
    });
  }

  const fallbackBase = baseResult || {
    ruleset: { id: context?.rule?.id },
    status: context?.baseResult?.status,
    assessment: context?.baseResult?.assessment,
    evidence: context?.baseResult?.evidence,
    reason: context?.baseResult?.reason,
    recommendation: context?.baseResult?.recommendation
  };
  return reviewFromBase({
    reviewer: 'primary',
    round,
    baseResult: fallbackBase,
    evidence: evidence.length ? evidence : (context?.documentEvidence || []),
    note: 'Primary Reviewer bindet die Bewertung an Ruleset, Basisergebnis und vorhandene Fundstellen.'
  });
}
