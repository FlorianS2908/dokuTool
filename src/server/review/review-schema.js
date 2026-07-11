export const REVIEW_STATUSES = new Set(['gruen', 'gelb', 'rot', 'grau']);
export const REVIEWERS = new Set(['primary', 'counter', 'revision', 'arbiter']);

export function createReviewItem({
  reviewer,
  round = 1,
  ruleId,
  status = 'grau',
  confidence = 0,
  finding = '',
  evidence = [],
  reason = '',
  recommendation = '',
  manualReviewRequired = false,
  disagreements = []
}) {
  return {
    reviewer,
    round,
    ruleId,
    status: REVIEW_STATUSES.has(status) ? status : 'grau',
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    finding,
    evidence: Array.isArray(evidence) ? evidence.map((item) => ({
      section: String(item.section || ''),
      quote: String(item.quote || '').slice(0, 800),
      evidenceQuality: ['strong', 'medium', 'weak'].includes(item.evidenceQuality) ? item.evidenceQuality : 'weak'
    })) : [],
    reason,
    recommendation,
    manualReviewRequired: Boolean(manualReviewRequired),
    disagreements: Array.isArray(disagreements) ? disagreements : []
  };
}

export function reviewFromBase({ reviewer, round = 1, baseResult, evidence = [], note = '' }) {
  const hasEvidence = evidence.length > 0 || baseResult?.evidence && baseResult.evidence !== '-';
  const status = hasEvidence ? (baseResult?.status || 'grau') : 'grau';
  return createReviewItem({
    reviewer,
    round,
    ruleId: baseResult?.ruleset?.id || baseResult?.ruleId || '',
    status,
    confidence: hasEvidence ? 0.68 : 0.35,
    finding: baseResult?.assessment || 'nicht sicher automatisch pruefbar',
    evidence: evidence.length ? evidence : baseResult?.evidence && baseResult.evidence !== '-'
      ? [{ section: 'baseReport', quote: baseResult.evidence, evidenceQuality: 'medium' }]
      : [],
    reason: note || baseResult?.reason || 'Aus dem regelbasierten Basisergebnis abgeleitet.',
    recommendation: baseResult?.recommendation || 'Manuell anhand des Rulesets pruefen.',
    manualReviewRequired: !hasEvidence || status === 'grau'
  });
}
