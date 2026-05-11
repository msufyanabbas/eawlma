import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/search', '/auth/login', '/dashboard', '/admin'];

test('no runtime errors across key routes', async ({ page }) => {
  test.setTimeout(120_000);

  // Suppress the first-visit welcome modal that intercepts clicks elsewhere.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eawlma.welcome.seen', '1');
    } catch {
      /* storage may be blocked */
    }
  });

  const failures: string[] = [];

  for (const route of ROUTES) {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    const onPageError = (err: Error) => pageErrors.push(`${err.message}`);
    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    await page.goto(route, { waitUntil: 'networkidle' }).catch(() => undefined);
    await page.waitForTimeout(1500);

    page.off('pageerror', onPageError);
    page.off('console', onConsole);

    // eslint-disable-next-line no-console
    console.log(`\n=== ${route} ===`);
    if (pageErrors.length === 0 && consoleErrors.length === 0) {
      // eslint-disable-next-line no-console
      console.log('  OK — no errors');
    } else {
      for (const e of pageErrors) {
        // eslint-disable-next-line no-console
        console.log(`  PAGE ERROR: ${e}`);
        failures.push(`${route}: ${e}`);
      }
      for (const e of consoleErrors) {
        // Allow expected backend-down 401/network noise; only count true JS errors.
        if (
          e.includes('Failed to load resource') ||
          e.includes('ERR_CONNECTION_REFUSED') ||
          e.includes('Network Error') ||
          e.includes('AxiosError') ||
          e.includes('401') ||
          e.includes('404')
        ) {
          // eslint-disable-next-line no-console
          console.log(`  (network noise, ignored): ${e.slice(0, 120)}`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`  CONSOLE ERROR: ${e}`);
          failures.push(`${route}: ${e}`);
        }
      }
    }
  }

  expect(failures, `Runtime errors found:\n${failures.join('\n')}`).toEqual([]);
});
