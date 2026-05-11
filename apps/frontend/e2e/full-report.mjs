// Plain Node.js ESM — no TS toolchain required. Parses
// `apps/frontend/test-results/results.json` (the Playwright JSON reporter
// output) and emits an opinionated HTML dashboard alongside the existing
// playwright-report folder.
//
// Run via: node e2e/full-report.mjs

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function classify(spec) {
  const t = spec.tests?.[0];
  const status = t?.status;
  if (status === 'expected') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

function flatten(suites, parent = '') {
  if (!suites) return [];
  const out = [];
  for (const s of suites) {
    const title = parent ? `${parent} ▸ ${s.title ?? ''}` : (s.title ?? 'Suite');
    out.push({ ...s, title });
    out.push(...flatten(s.suites, title));
  }
  return out;
}

function parsePlaywright(jsonPath) {
  if (!fs.existsSync(jsonPath)) return [];
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const suites = [];
  for (const file of flatten(data.suites)) {
    const specs = file.specs ?? [];
    if (specs.length === 0) continue;
    const suite = {
      name: file.title ?? 'Suite',
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      duration: 0,
    };
    for (const spec of specs) {
      const status = classify(spec);
      const result = spec.tests?.[0]?.results?.[0];
      const dur = result?.duration ?? 0;
      suite.tests.push({
        name: spec.title ?? '(unnamed test)',
        status,
        duration: dur,
        error: result?.error?.message?.slice(0, 200),
      });
      suite.duration += dur;
      if (status === 'passed') suite.passed++;
      else if (status === 'failed') suite.failed++;
      else suite.skipped++;
    }
    suites.push(suite);
  }
  return suites;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateReport(suites) {
  const totalPassed = suites.reduce((a, s) => a + s.passed, 0);
  const totalFailed = suites.reduce((a, s) => a + s.failed, 0);
  const totalSkipped = suites.reduce((a, s) => a + s.skipped, 0);
  const total = totalPassed + totalFailed + totalSkipped;
  const passRate = total > 0 ? Math.round((totalPassed / total) * 100) : 0;
  const totalDuration = suites.reduce((a, s) => a + s.duration, 0);

  const statusLabel =
    passRate >= 90 ? '✅ Production Ready' : passRate >= 70 ? '⚠️ Needs Attention' : '❌ Critical Issues';
  const statusClass =
    passRate >= 90 ? 'status-excellent' : passRate >= 70 ? 'status-good' : 'status-needs-work';

  const generatedAt = new Date().toLocaleString('en-SA', {
    timeZone: 'Asia/Riyadh',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const suiteCards = suites
    .map((suite) => {
      const tests = suite.tests
        .map((t) => {
          const icon = t.status === 'passed' ? '✓' : t.status === 'skipped' ? '○' : '✗';
          const badge =
            t.status === 'passed'
              ? 'badge-pass'
              : t.status === 'skipped'
                ? 'badge-skip'
                : 'badge-fail';
          const failedClass = t.status === 'failed' ? 'failed' : '';
          const errBlock = t.error ? `<div class="test-error">${escapeHtml(t.error)}</div>` : '';
          return `<div class="test-item">
  <div>
    <div class="test-name ${failedClass}">${icon} ${escapeHtml(t.name)}</div>
    ${errBlock}
  </div>
  <div class="test-right">
    <span class="test-duration">${t.duration}ms</span>
    <span class="badge ${badge}">${t.status}</span>
  </div>
</div>`;
        })
        .join('');

      const failBadge = suite.failed > 0 ? `<span class="badge badge-fail">${suite.failed} fail</span>` : '';
      const skipBadge = suite.skipped > 0 ? `<span class="badge badge-skip">${suite.skipped} skip</span>` : '';
      return `<div class="suite-card">
  <div class="suite-header">
    <span class="suite-name">${escapeHtml(suite.name)}</span>
    <div class="suite-stats">
      <span class="badge badge-pass">${suite.passed} pass</span>
      ${failBadge}
      ${skipBadge}
    </div>
  </div>
  <div class="test-list">${tests}</div>
</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eawlma Complete Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; color: #1a1a2e; }
    .header { background: linear-gradient(135deg, #6C63A6 0%, #4A4080 100%); color: white; padding: 48px 40px; }
    .header h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.85; font-size: 1.1rem; }
    .header .meta { margin-top: 16px; opacity: 0.7; font-size: 0.9rem; display: flex; gap: 24px; flex-wrap: wrap; }
    .container { max-width: 1400px; margin: 0 auto; padding: 32px 40px; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: white; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-top: 4px solid transparent; }
    .stat-card.total { border-top-color: #6C63A6; }
    .stat-card.passed { border-top-color: #22c55e; }
    .stat-card.failed { border-top-color: #ef4444; }
    .stat-card.skipped { border-top-color: #f59e0b; }
    .stat-card.rate { border-top-color: #3b82f6; }
    .stat-num { font-size: 3rem; font-weight: 900; line-height: 1; margin-bottom: 8px; }
    .stat-num.total { color: #6C63A6; }
    .stat-num.passed { color: #22c55e; }
    .stat-num.failed { color: #ef4444; }
    .stat-num.skipped { color: #f59e0b; }
    .stat-num.rate { color: #3b82f6; }
    .stat-label { font-size: 0.85rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .progress-section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 32px; }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .progress-title { font-size: 1.1rem; font-weight: 700; }
    .progress-status { padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 0.9rem; }
    .status-excellent { background: #dcfce7; color: #166534; }
    .status-good { background: #fef9c3; color: #713f12; }
    .status-needs-work { background: #fee2e2; color: #991b1b; }
    .progress-bar-bg { background: #e5e7eb; border-radius: 999px; height: 16px; overflow: hidden; margin-bottom: 8px; }
    .progress-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 1s ease; }
    .suite-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .suite-card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
    .suite-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; background: #fafafa; gap: 12px; }
    .suite-name { font-weight: 700; font-size: 1rem; }
    .suite-stats { display: flex; gap: 8px; align-items: center; font-size: 0.85rem; flex-shrink: 0; }
    .badge { padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-skip { background: #fef3c7; color: #92400e; }
    .test-list { padding: 0; }
    .test-item { padding: 10px 20px; border-bottom: 1px solid #f9fafb; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .test-item:last-child { border-bottom: none; }
    .test-name { font-size: 0.88rem; color: #374151; flex: 1; line-height: 1.4; }
    .test-name.failed { color: #dc2626; }
    .test-right { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .test-duration { font-size: 0.78rem; color: #9ca3af; white-space: nowrap; }
    .test-error { font-size: 0.78rem; color: #dc2626; font-family: monospace; margin-top: 4px; background: #fef2f2; padding: 4px 8px; border-radius: 4px; word-break: break-word; }
    .section-title { font-size: 1.3rem; font-weight: 800; margin-bottom: 20px; color: #1f2937; display: flex; align-items: center; gap: 10px; }
    .footer { background: white; border-top: 1px solid #e5e7eb; padding: 24px 40px; margin-top: 32px; text-align: center; color: #6b7280; font-size: 0.9rem; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .suite-grid { grid-template-columns: 1fr; }
      .container { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏠 Eawlma — Complete Test Report</h1>
    <p class="subtitle">Full platform test coverage: APIs, Components, Pages, E2E, Security, Performance</p>
    <div class="meta">
      <span>📅 ${generatedAt}</span>
      <span>⏱️ Total duration: ${(totalDuration / 1000).toFixed(1)}s</span>
      <span>📊 ${total} total tests</span>
    </div>
  </div>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card total"><div class="stat-num total">${total}</div><div class="stat-label">Total Tests</div></div>
      <div class="stat-card passed"><div class="stat-num passed">${totalPassed}</div><div class="stat-label">Passed ✅</div></div>
      <div class="stat-card failed"><div class="stat-num failed">${totalFailed}</div><div class="stat-label">Failed ❌</div></div>
      <div class="stat-card skipped"><div class="stat-num skipped">${totalSkipped}</div><div class="stat-label">Skipped ⚠️</div></div>
      <div class="stat-card rate"><div class="stat-num rate">${passRate}%</div><div class="stat-label">Pass Rate</div></div>
    </div>

    <div class="progress-section">
      <div class="progress-header">
        <span class="progress-title">Overall Platform Health</span>
        <span class="progress-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${passRate}%"></div>
      </div>
      <p style="text-align:center; color:#6b7280; font-size:0.9rem; margin-top:8px">
        ${totalPassed} of ${total} tests passing (${totalSkipped} skipped)
      </p>
    </div>

    <h2 class="section-title">📋 Test Suites</h2>
    <div class="suite-grid">${suiteCards}</div>
  </div>

  <div class="footer">
    <p>Eawlma Platform Test Report • Generated ${new Date().toISOString()} • Riyadh/Bahrain Region</p>
  </div>
</body>
</html>`;
}

const jsonPath = path.resolve(__dirname, '../test-results/results.json');
const suites = parsePlaywright(jsonPath);

if (suites.length === 0) {
  console.log('⚠️  No test results found. Run `npx playwright test` first.');
  process.exit(0);
}

const html = generateReport(suites);
const outDir = path.resolve(__dirname, '../playwright-report');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'eawlma-full-report.html');
fs.writeFileSync(outPath, html);
console.log(`✅ Full report: ${outPath}`);
