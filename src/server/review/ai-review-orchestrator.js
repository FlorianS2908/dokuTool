import { FIAE_RULESET_V2 } from '../../../ruleset-evaluator.js';
import { extractEvidenceForRule } from '../analysis/evidence-extractor.js';
import { runPrimaryReviewer } from './primary-reviewer.js';
import { runCounterReviewer } from './counter-reviewer.js';
import { runRevisionReviewer } from './revision-reviewer.js';
import { runArbiterReviewer } from './arbiter-reviewer.js';
import { detectReviewConflicts, severeConflicts } from './conflict-detector.js';
import { buildConsensusItem, buildConsensusReport } from './consensus-builder.js';

function candidateResults(baseReport, maxItems = 18) {
  return (baseReport.results || [])
    .filter((item) => item.ruleset?.source === FIAE_RULESET_V2.id || /^FIAE Ruleset v2/.test(item.category || ''))
    .filter((item) => item.status === 'rot' || item.status === 'gelb' || item.severity === 'hoch')
    .slice(0, maxItems);
}

function findRule(ruleId) {
  return (FIAE_RULESET_V2.rules || []).find((rule) => rule.id === ruleId);
}

export async function runAiConsensusReview({
  doc,
  AntragDoc,
  sections,
  baseReport,
  maxRounds = 3,
  apiKeyAvailable = false
}) {
  const candidates = candidateResults(baseReport);

  if (!apiKeyAvailable) {
    return {
      enabled: false,
      maxRounds,
      completedRounds: 0,
      consensusReached: false,
      openConflictCount: 0,
      manualReviewCount: candidates.length,
      reviewedRuleCount: 0,
      reason: 'OPENAI_API_KEY fehlt oder ist Platzhalter. Multi-KI-Konsenspruefung wurde nicht ausgefuehrt.',
      items: []
    };
  }

  const items = [];
  let completedRounds = 0;

  for (const baseResult of candidates) {
    const ruleId = baseResult.ruleset?.id;
    const rule = findRule(ruleId);
    const evidence = rule ? extractEvidenceForRule({ rule, sections, doc, AntragDoc }) : [];
    const reviews = [];
    const conflictHistory = [];

    const primary = await runPrimaryReviewer({ baseResult, evidence, round: 1 });
    reviews.push(primary);
    const counter = await runCounterReviewer({ primaryReview: primary, baseResult, evidence, round: 1 });
    reviews.push(counter);
    completedRounds = Math.max(completedRounds, 1);

    let conflicts = detectReviewConflicts(primary, counter, rule);
    conflictHistory.push(...conflicts);

    for (let round = 2; round <= maxRounds && severeConflicts(conflicts).length; round += 1) {
      const revision = await runRevisionReviewer({ primaryReview: primary, conflicts, round });
      reviews.push(revision);
      const counterAgain = await runCounterReviewer({ primaryReview: revision, baseResult, evidence, round });
      reviews.push(counterAgain);
      completedRounds = Math.max(completedRounds, round);
      conflicts = detectReviewConflicts(revision, counterAgain, rule);
      conflictHistory.push(...conflicts);
    }

    if (severeConflicts(conflicts).length) {
      reviews.push(await runArbiterReviewer({ ruleId, reviews, conflicts, round: maxRounds }));
    }

    items.push(buildConsensusItem({ ruleId, baseResult, reviews, conflicts: conflictHistory }));
  }

  return buildConsensusReport({
    enabled: true,
    maxRounds,
    completedRounds,
    items
  });
}
