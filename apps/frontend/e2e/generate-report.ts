/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import * as path from 'node:path';

interface PlaywrightTest {
  status?: string;
  results?: Array<{ duration?: number; error?: { message?: string } }>;
}
interface PlaywrightSpec {
  title?: string;
  tests?: PlaywrightTest[];
}
interface PlaywrightSuite {
  title?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}
interface PlaywrightReport {
  suites?: PlaywrightSuite[];
}

function flattenSuites(suites: PlaywrightSuite[] | undefined): PlaywrightSuite[] {
  if (!suites) return [];
  const out: PlaywrightSuite[] = [];
  for (const s of suites) {
    out.push(s);
    out.push(...flattenSuites(s.suites));
  }
  return out;
}

function classify(spec: PlaywrightSpec): 'passed' | 'failed' | 'skipped' {
  const t = spec.tests?.[0];
  const status = t?.status;
  if (status === 'expected') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

function generateHTMLReport(results: PlaywrightReport): string {
  const allSuites = flattenSuites(results.suites);
  const specs = allSuites.flatMap((s) => s.specs ?? []);
  const passed = specs.filter((s) => classify(s) === 'passed').length;
  const failed = specs.filter((s) => classify(s) === 'failed').length;
  const skipped = specs.filter((s) => classify(s) === 'skipped').length;
  const total = passed + failed + skipped;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const verdict = passRate >= 90 ? '✅ Excellent' : passRate >= 70 ? '⚠️ Needs Work' : '❌ Critical Issues';
  const verdictClass = passRate >= 90 ? 'passed' : passRate >= 70 ? 'skipped' : 'failed';

  const suiteRows = allSuites
    .filter((s) => (s.specs?.length ?? 0) > 0)
    .map((suite) => {
      const rows = (suite.specs ?? [])
        .map((spec) => {
          const status = classify(spec);
          const duration = spec.tests?.[0]?.results?.[0]?.duration ?? 0;
          const error = spec.tests?.[0]?.results?.[0]?.error?.message ?? '';
          return `<div class="test-row">
            <div><div>${escape(spec.title ?? '')}</div>${error ? `<div class="error-msg">❌ ${escape(error.slice(0, 120))}</div>` : ''}</div>
            <div style="display:flex;gap:8px;align-items:center"><span class="duration">${duration}ms</span><span class="badge badge-${status}">${status}</span></div>
          </div>`;
        })
        .join('');
      return `<div class="section">
        <div class="section-header"><span>${escape(suite.title ?? 'Suite')}</span><span class="duration">${suite.specs?.length ?? 0} tests</span></div>
        ${rows}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Eawlma Test Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#f5f5f5;padding:20px}
.header{background:linear-gradient(135deg,#6C63A6,#4A4080);color:white;padding:40px;border-radius:12px;margin-bottom:24px}
.header h1{font-size:2rem;margin-bottom:8px}
.header p{opacity:.8}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center}
.stat .num{font-size:2.5rem;font-weight:800}
.stat .label{color:#666;font-size:.9rem;margin-top:4px}
.passed{color:#22c55e}
.failed{color:#ef4444}
.skipped{color:#f59e0b}
.rate{color:#6C63A6}
.progress{background:#e5e7eb;border-radius:9999px;height:12px;margin:16px 0;overflow:hidden}
.progress-bar{background:linear-gradient(90deg,#22c55e,#16a34a);height:100%;border-radius:9999px;transition:width .3s}
.section{background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);margin-bottom:16px;overflow:hidden}
.section-header{padding:16px 20px;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:1.1rem;display:flex;justify-content:space-between}
.test-row{padding:12px 20px;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center}
.test-row:last-child{border-bottom:none}
.badge{padding:4px 10px;border-radius:9999px;font-size:.8rem;font-weight:600}
.badge-passed{background:#dcfce7;color:#166534}
.badge-failed{background:#fee2e2;color:#991b1b}
.badge-skipped{background:#fef3c7;color:#92400e}
.error-msg{font-size:.8rem;color:#ef4444;margin-top:4px;font-family:monospace}
.duration{color:#9ca3af;font-size:.85rem}
</style>
</head>
<body>
<div class="header">
  <h1>🏠 Eawlma Platform — Test Report</h1>
  <p>Generated: ${new Date().toLocaleString('en-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'full', timeStyle: 'short' })}</p>
</div>
<div class="stats">
  <div class="stat"><div class="num">${total}</div><div class="label">Total Tests</div></div>
  <div class="stat"><div class="num passed">${passed}</div><div class="label">Passed</div></div>
  <div class="stat"><div class="num failed">${failed}</div><div class="label">Failed</div></div>
  <div class="stat"><div class="num rate">${passRate}%</div><div class="label">Pass Rate</div></div>
</div>
<div class="section">
  <div class="section-header"><span>Overall Progress</span><span class="${verdictClass}">${verdict}</span></div>
  <div style="padding:16px 20px;">
    <div class="progress"><div class="progress-bar" style="width:${passRate}%"></div></div>
    <p style="text-align:center;color:#666;font-size:.9rem">${passed} of ${total} tests passing (${skipped} skipped)</p>
  </div>
</div>
${suiteRows}
<div class="section">
  <div class="section-header">Coverage Areas</div>
  <div style="padding:16px 20px;color:#374151;font-size:.9rem">
    Auth · RBAC · Listings · Search · Booking · Wallet · Promos · RTL/i18n · Accessibility · SEO · Security · Performance · Responsive
  </div>
</div>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ----- Entry point ---------------------------------------------------------

const resultsPath = path.resolve(__dirname, '../test-results/results.json');
const reportDir = path.resolve(__dirname, '../playwright-report');

if (!fs.existsSync(resultsPath)) {
  console.log('⚠️  No test-results/results.json found — run `npx playwright test` first.');
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as PlaywrightReport;
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const html = generateHTMLReport(results);
const target = path.join(reportDir, 'eawlma-report.html');
fs.writeFileSync(target, html);
console.log(`✅ Report generated: ${path.relative(process.cwd(), target)}`);
