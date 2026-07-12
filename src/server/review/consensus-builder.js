function finalStatusFromReviews(reviews = []) {
  const arbiter = reviews.find((item) => item.reviewer === 'arbiter');
  if (arbiter) return arbiter.status;
  const revision = reviews.findLast?.((item) => item.reviewer === 'revision') || reviews.filter((item) => item.reviewer === 'revision').at(-1);
  if (revision) return revision.status;
  const statuses = reviews.map((item) => item.status).filter(Boolean);
  if (!statuses.length) return 'grau';
  const counts = statuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function buildConsensusItem({ ruleId, rule = null, baseResult, reviews = [], conflicts = [], usedRuleContext = null }) {
  const primary = reviews.find((item) => item.reviewer === 'primary');
  const counter = reviews.find((item) => item.reviewer === 'counter');
  const revision = reviews.findLast?.((item) => item.reviewer === 'revision') || reviews.filter((item) => item.reviewer === 'revision').at(-1);
  const arbiter = reviews.find((item) => item.reviewer === 'arbiter');
  const finalStatus = finalStatusFromReviews(reviews);
  const openConflicts = conflicts.filter((item) => item.requiresAnotherRound);

  return {
    ruleId,
    ruleTitle: rule?.title || baseResult?.criterion || '',
    category: rule?.category || baseResult?.ruleset?.category || baseResult?.category || '',
    baseStatus: baseResult?.status || 'grau',
    primaryStatus: primary?.status || '',
    counterStatus: counter?.status || '',
    revisionStatus: revision?.status || '',
    arbiterStatus: arbiter?.status || '',
    finalStatus,
    consensusReached: openConflicts.length === 0,
    conflictResolved: conflicts.length > 0 && openConflicts.length === 0,
    manualReviewRequired: reviews.some((item) => item.manualReviewRequired) || finalStatus === 'grau',
    conflictHistory: conflicts,
    finalReason: arbiter?.reason || revision?.reason || primary?.reason || baseResult?.reason || '',
    finalRecommendation: arbiter?.recommendation || revision?.recommendation || primary?.recommendation || baseResult?.recommendation || '',
    usedRuleContext: usedRuleContext || null
  };
}

export function buildConsensusReport({ enabled, actualAiUsed = false, model = '', maxRounds, completedRounds, items }) {
  const safeItems = Array.isArray(items) ? items : [];
  const openConflictCount = safeItems.reduce((acc, item) => acc + (item.conflictHistory || []).filter((conflict) => conflict.requiresAnotherRound).length, 0);
  return {
    enabled: Boolean(enabled),
    actualAiUsed: Boolean(actualAiUsed),
    model,
    maxRounds,
    completedRounds,
    consensusReached: openConflictCount === 0,
    openConflictCount,
    manualReviewCount: safeItems.filter((item) => item.manualReviewRequired).length,
    reviewedRuleCount: safeItems.length,
    items: safeItems
  };
}
