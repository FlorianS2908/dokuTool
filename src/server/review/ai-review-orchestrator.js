import { runPrimaryReviewer } from './primary-reviewer.js';
import { runCounterReviewer } from './counter-reviewer.js';
import { runRevisionReviewer } from './revision-reviewer.js';
import { runArbiterReviewer } from './arbiter-reviewer.js';
import { detectReviewConflicts, severeConflicts } from './conflict-detector.js';
import { buildConsensusItem, buildConsensusReport } from './consensus-builder.js';
import { buildRuleReviewBatch } from './ruleset-context-builder.js';
import { createReviewItem } from './review-schema.js';

function baseResultFromContext(baseReport, context) {
  return (baseReport?.results || []).find((result) => result.ruleset?.id === context.rule?.id) || {
    ruleset: { id: context.rule?.id },
    status: context.baseResult?.status || 'grau',
    assessment: context.baseResult?.assessment || '',
    evidence: context.baseResult?.evidence || '',
    reason: context.baseResult?.reason || '',
    recommendation: context.baseResult?.recommendation || ''
  };
}

function errorReview(context, error, round = 1) {
  return createReviewItem({
    reviewer: 'primary',
    round,
    ruleId: context.rule?.id,
    status: 'grau',
    confidence: 0.1,
    finding: 'Multi-KI-Review fuer diese Regel fehlgeschlagen',
    evidence: [],
    reason: error?.message || 'Unbekannter Fehler im Regelreview.',
    recommendation: 'Regel manuell anhand der Fundstellen und des Rulesets pruefen.',
    manualReviewRequired: true
  });
}

function usedRuleContext(context) {
  return {
    ruleId: context.rule?.id,
    ruleTitle: context.rule?.title,
    statusRulesIncluded: Boolean(context.rule?.statusRules),
    evidenceCount: context.documentEvidence?.length || 0,
    referenceHintCount: context.referenceHints?.length || 0,
    applicationExcerptIncluded: Boolean(context.applicationExcerpt)
  };
}

export async function runAiConsensusReview({
  doc,
  AntragDoc,
  sections,
  baseReport,
  maxRounds = Number(process.env.MULTI_AI_MAX_ROUNDS || 3),
  maxItems = Number(process.env.MULTI_AI_MAX_RULES || 12),
  apiKeyAvailable = false,
  client = null,
  model = process.env.OPENAI_MODEL || 'gpt-5.5'
}) {
  const contexts = buildRuleReviewBatch({ baseReport, sections, doc, AntragDoc, maxItems });

  if (!apiKeyAvailable || !client) {
    return {
      enabled: false,
      actualAiUsed: false,
      model,
      maxRounds,
      completedRounds: 0,
      consensusReached: false,
      openConflictCount: 0,
      manualReviewCount: contexts.length,
      reviewedRuleCount: 0,
      reason: 'Kein effektiver API-Key verfuegbar. Multi-KI-Konsenspruefung wurde nicht ausgefuehrt.',
      items: []
    };
  }

  const items = [];
  let completedRounds = 0;
  let actualAiUsed = false;

  for (const context of contexts) {
    const baseResult = baseResultFromContext(baseReport, context);
    const reviews = [];
    const conflictHistory = [];
    let latestConflicts = [];

    try {
      const primary = await runPrimaryReviewer({ client, model, context, round: 1 });
      actualAiUsed = true;
      reviews.push(primary);

      const counter = await runCounterReviewer({ client, model, context, primaryReview: primary, round: 1 });
      reviews.push(counter);
      completedRounds = Math.max(completedRounds, 1);

      latestConflicts = detectReviewConflicts(primary, counter, context.rule);
      conflictHistory.push(...latestConflicts);

      let revisionBase = primary;
      let counterBase = counter;
      for (let round = 2; round <= maxRounds && severeConflicts(latestConflicts).length; round += 1) {
        const revision = await runRevisionReviewer({
          client,
          model,
          context,
          primaryReview: revisionBase,
          counterReview: counterBase,
          conflicts: latestConflicts,
          round
        });
        reviews.push(revision);

        const counterAgain = await runCounterReviewer({
          client,
          model,
          context,
          primaryReview: revision,
          round
        });
        reviews.push(counterAgain);
        completedRounds = Math.max(completedRounds, round);

        latestConflicts = detectReviewConflicts(revision, counterAgain, context.rule);
        conflictHistory.push(...latestConflicts);
        revisionBase = revision;
        counterBase = counterAgain;
      }

      if (severeConflicts(latestConflicts).length) {
        const arbiter = await runArbiterReviewer({
          client,
          model,
          context,
          ruleId: context.rule?.id,
          reviews,
          conflicts: latestConflicts,
          round: maxRounds
        });
        reviews.push(arbiter);
      }
    } catch (error) {
      reviews.push(errorReview(context, error));
      conflictHistory.push({
        ruleId: context.rule?.id,
        round: 1,
        type: 'review_error',
        level: 'hoch',
        description: error?.message || 'Review-Fehler',
        requiresAnotherRound: false
      });
    }

    items.push(buildConsensusItem({
      ruleId: context.rule?.id,
      rule: context.rule,
      baseResult,
      reviews,
      conflicts: conflictHistory,
      usedRuleContext: usedRuleContext(context)
    }));
  }

  return buildConsensusReport({
    enabled: true,
    actualAiUsed,
    model,
    maxRounds,
    completedRounds,
    items
  });
}
