import { runFunctionalTests } from '../src/server/tests/function-test-runner.js';
import { buildFunctionalTestReport } from '../src/server/tests/function-test-report.js';

const includeAi = process.argv.includes('--include-ai');
const includeFileTests = !process.argv.includes('--no-file-tests');

const testRun = await runFunctionalTests({ includeAi, includeFileTests });
const report = buildFunctionalTestReport(testRun);

console.log(JSON.stringify(report, null, 2));

if (testRun.summary.failed > 0) {
  process.exitCode = 1;
}
