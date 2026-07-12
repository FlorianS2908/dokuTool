export function buildInternalTestReport(testRun = {}) {
  const tests = Array.isArray(testRun.tests) ? testRun.tests : [];
  const summary = testRun.summary || {};
  const score = summary.total
    ? Math.round(tests.reduce((acc, test) => {
      if (test.status === 'passed') return acc + 100;
      if (test.status === 'warning') return acc + 60;
      if (test.status === 'skipped') return acc + 40;
      return acc;
    }, 0) / summary.total)
    : 0;

  return {
    title: 'Interner Testbericht',
    createdAt: testRun.createdAt || new Date().toISOString(),
    durationMs: testRun.durationMs || 0,
    score,
    status: summary.failed > 0 ? 'failed' : summary.warnings > 0 || summary.skipped > 0 ? 'warning' : 'passed',
    summary,
    tests,
    recommendations: tests
      .filter((test) => test.recommendation)
      .filter((test) => test.status !== 'passed')
      .map((test) => test.recommendation)
  };
}
