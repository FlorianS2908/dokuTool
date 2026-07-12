function statusLabel(status = '') {
  return {
    success: 'Erfolgreich',
    warning: 'Warnung',
    error: 'Fehler',
    skipped: 'Nicht ausgeführt',
    gruen: 'Grün',
    gelb: 'Gelb',
    rot: 'Rot',
    grau: 'Grau',
    passed: 'Bestanden',
    failed: 'Fehler'
  }[status] || status || '-';
}

function flattenChapters(chapters = []) {
  const result = [];
  for (const chapter of chapters || []) {
    result.push(chapter);
    result.push(...flattenChapters(chapter.children || []));
  }
  return result;
}

function qualityForRule(evidence = [], ruleId) {
  const hits = evidence.filter((item) => item.ruleId === ruleId);
  if (hits.some((item) => item.evidenceQuality === 'strong')) return 'strong';
  if (hits.some((item) => item.evidenceQuality === 'medium')) return 'medium';
  if (hits.length) return 'weak';
  return 'none';
}

function recommendationForStatus(status) {
  return {
    gruen: 'Kein akuter Handlungsbedarf erkennbar.',
    gelb: 'Inhalt nachschärfen und Fundstelle klarer belegen.',
    rot: 'Fehlenden Inhalt fachlich ergänzen oder korrigieren.',
    grau: 'Manuell prüfen, da die automatische Bewertung unsicher ist.'
  }[status] || 'Manuell prüfen.';
}

function buildRuleDetails(audit) {
  return audit.ruleMappings.map((mapping) => {
    const evidence = audit.evidence.filter((item) => item.ruleId === mapping.ruleId);
    const references = audit.references.filter((item) => item.ruleId === mapping.ruleId);
    const reviews = audit.aiReviews.filter((item) => item.ruleId === mapping.ruleId);
    return {
      ruleId: mapping.ruleId,
      title: mapping.ruleTitle,
      status: mapping.status,
      statusLabel: statusLabel(mapping.status),
      reason: mapping.mappingReason,
      confidence: mapping.confidence,
      chapterTitle: mapping.chapterTitle,
      evidence,
      recommendation: recommendationForStatus(mapping.status),
      references,
      aiUsed: reviews.length > 0,
      aiReviews: reviews
    };
  });
}

function buildMatrix(audit) {
  const byChapter = new Map();
  for (const mapping of audit.ruleMappings || []) {
    const key = mapping.chapterId || mapping.chapterTitle || 'unbekannt';
    if (!byChapter.has(key)) {
      byChapter.set(key, {
        chapterId: mapping.chapterId,
        chapterTitle: mapping.chapterTitle,
        detectedMeaning: mapping.detectedMeaning || 'Dokumentabschnitt',
        rules: [],
        status: 'gruen',
        evidenceQuality: 'none',
        recommendation: ''
      });
    }
    const entry = byChapter.get(key);
    entry.rules.push({
      ruleId: mapping.ruleId,
      title: mapping.ruleTitle,
      status: mapping.status,
      confidence: mapping.confidence
    });
    if (mapping.status === 'rot') entry.status = 'rot';
    else if (mapping.status === 'gelb' && entry.status !== 'rot') entry.status = 'gelb';
    else if (mapping.status === 'grau' && !['rot', 'gelb'].includes(entry.status)) entry.status = 'grau';
  }

  return [...byChapter.values()].map((entry) => ({
    ...entry,
    evidenceQuality: entry.rules.reduce((best, rule) => {
      const quality = qualityForRule(audit.evidence || [], rule.ruleId);
      if (best === 'strong' || quality === 'none') return best;
      if (quality === 'strong') return 'strong';
      if (quality === 'medium' && best === 'weak') return 'medium';
      return best === 'none' ? quality : best;
    }, 'none'),
    recommendation: recommendationForStatus(entry.status)
  }));
}

export function buildVisualReportModel(reportOrAudit = {}) {
  const audit = reportOrAudit.auditReport || reportOrAudit;
  const summary = audit.summary || {};
  const chapters = flattenChapters(audit.outline?.chapters || []);
  const matrix = buildMatrix(audit);

  return {
    title: 'Auswertung',
    createdAt: audit.createdAt,
    summaryCards: [
      { label: 'Gesamtscore', value: `${summary.score || 0}%` },
      { label: 'Geprüfte Regeln', value: matrix.reduce((acc, item) => acc + item.rules.length, 0) },
      { label: 'Rot', value: summary.redCount || 0, status: 'rot' },
      { label: 'Gelb', value: summary.yellowCount || 0, status: 'gelb' },
      { label: 'Grau', value: summary.grayCount || 0, status: 'grau' },
      { label: 'Kapitel', value: audit.outline?.chapterCount || chapters.length || 0 },
      { label: 'Zugeordnete Regeln', value: summary.mappedRuleCount || 0 },
      { label: 'KI genutzt', value: summary.aiUsed ? 'Ja' : 'Nein' },
      { label: 'Manuelle Prüfung', value: summary.manualReviewCount || 0 }
    ],
    timeline: (audit.steps || []).map((step) => ({
      ...step,
      statusLabel: statusLabel(step.status)
    })),
    chapters,
    matrix,
    ruleDetails: buildRuleDetails(audit),
    prompts: audit.prompts || [],
    aiConsensus: {
      reviews: audit.aiReviews || [],
      conflicts: audit.conflicts || []
    },
    testReport: audit.testReport || null,
    warnings: summary.warnings || []
  };
}
