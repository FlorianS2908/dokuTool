function scoreForStatus(status) {
  if (status === 'passed') return 100;
  if (status === 'warning') return 60;
  if (status === 'skipped') return 40;
  return 0;
}

function reportStatus(summary = {}) {
  if (summary.failed > 0) return 'failed';
  if (summary.warnings > 0 || summary.skipped > 0) return 'warning';
  return 'passed';
}

function groupTests(tests = []) {
  const groups = new Map();
  for (const test of tests) {
    const key = test.category || 'Allgemein';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(test);
  }
  return [...groups.entries()].map(([category, groupTests]) => ({
    category,
    tests: groupTests
  }));
}

export function buildFunctionalTestReport(testRun = {}) {
  const tests = Array.isArray(testRun.tests) ? testRun.tests : [];
  const summary = testRun.summary || {
    total: tests.length,
    passed: tests.filter((test) => test.status === 'passed').length,
    failed: tests.filter((test) => test.status === 'failed').length,
    warnings: tests.filter((test) => test.status === 'warning').length,
    skipped: tests.filter((test) => test.status === 'skipped').length
  };
  const score = summary.total
    ? Math.round(tests.reduce((acc, test) => acc + scoreForStatus(test.status), 0) / summary.total)
    : 0;
  const recommendations = [...new Set(
    tests
      .filter((test) => test.status !== 'passed' && test.recommendation)
      .map((test) => test.recommendation)
  )];

  return {
    title: 'Funktionstest-Bericht',
    createdAt: testRun.createdAt || new Date().toISOString(),
    durationMs: testRun.durationMs || 0,
    score,
    status: reportStatus(summary),
    summaryCards: [
      { label: 'Tests gesamt', value: summary.total || 0 },
      { label: 'Bestanden', value: summary.passed || 0 },
      { label: 'Warnungen', value: summary.warnings || 0 },
      { label: 'Fehler', value: summary.failed || 0 },
      { label: 'Übersprungen', value: summary.skipped || 0 }
    ],
    summary,
    groups: groupTests(tests),
    tests,
    recommendations
  };
}
