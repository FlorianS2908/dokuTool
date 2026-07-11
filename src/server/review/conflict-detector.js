const statusDistance = {
  gruen: { rot: 'hoch', gelb: 'niedrig', grau: 'niedrig' },
  rot: { gruen: 'hoch', gelb: 'mittel', grau: 'mittel' },
  gelb: { rot: 'mittel', gruen: 'niedrig', grau: 'niedrig' },
  grau: { rot: 'mittel', gruen: 'niedrig', gelb: 'niedrig' }
};

function hasStrongEvidence(review) {
  return (review.evidence || []).some((item) => item.evidenceQuality === 'strong');
}

function lacksEvidence(review) {
  return !review.evidence || review.evidence.length === 0;
}

function conflict(level, type, description, primary, counter) {
  return {
    ruleId: primary.ruleId || counter.ruleId,
    round: Math.max(primary.round || 1, counter.round || 1),
    type,
    level,
    description,
    primaryStatus: primary.status,
    counterStatus: counter.status,
    requiresAnotherRound: ['hoch', 'mittel'].includes(level)
  };
}

export function detectReviewConflicts(primary, counter, rule = null) {
  const conflicts = [];
  const distance = statusDistance[primary.status]?.[counter.status];
  if (distance) {
    conflicts.push(conflict(distance, 'status_conflict', `Status weicht ab: ${primary.status} vs ${counter.status}.`, primary, counter));
  }

  if (primary.status === 'rot' && hasStrongEvidence(counter)) {
    conflicts.push(conflict('mittel', 'evidence_conflict', 'Counter-Review findet starke Fundstelle, waehrend Primary fehlt/rot bewertet.', primary, counter));
  }
  if (counter.status === 'rot' && hasStrongEvidence(primary)) {
    conflicts.push(conflict('mittel', 'evidence_conflict', 'Primary-Review findet starke Fundstelle, waehrend Counter fehlt/rot bewertet.', primary, counter));
  }

  for (const review of [primary, counter]) {
    if (review.confidence >= 0.75 && lacksEvidence(review)) {
      conflicts.push(conflict('mittel', 'confidence_conflict', `${review.reviewer} setzt hohe Confidence ohne Fundstelle.`, primary, counter));
    }
    if (!review.ruleId) {
      conflicts.push(conflict('hoch', 'ruleset_conflict', `${review.reviewer} bewertet ohne Regel-ID.`, primary, counter));
    }
  }

  if (rule?.applies?.always === false && primary.status === 'rot' && counter.status !== 'rot') {
    conflicts.push(conflict('mittel', 'ruleset_conflict', 'Bedingte Regel moeglicherweise falsch als zwingend angewandt.', primary, counter));
  }

  return conflicts;
}

export function severeConflicts(conflicts = []) {
  return conflicts.filter((item) => item.level === 'hoch' || item.level === 'mittel');
}
