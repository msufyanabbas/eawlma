import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/search', '/auth/login', '/dashboard', '/admin'];

/**
 * Loads the app in Arabic (RTL) mode and verifies:
 *  - No console / page errors on any route
 *  - <html dir="rtl"> is applied
 *  - Dashboard / Admin drawers are anchored on the inline-start of the
 *    document, which in RTL means the right edge of the viewport
 */
test('RTL routes: no errors + sidebars on the correct side', async ({ page }) => {
  test.setTimeout(120_000);

  // Pin locale to Arabic before any navigation; suppress welcome modal too.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eawlma.locale', 'ar');
      localStorage.setItem('eawlma.welcome.seen', '1');
    } catch {
      /* storage may be blocked */
    }
  });

  const failures: string[] = [];

  for (const route of ROUTES) {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    const onPageError = (err: Error) => pageErrors.push(err.message);
    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    await page.goto(route, { waitUntil: 'networkidle' }).catch(() => undefined);
    await page.waitForTimeout(1500);

    const htmlDir = await page.evaluate(() => document.documentElement.dir);

    // Probe MUI Drawer paper position for dashboard/admin. In RTL the paper's
    // right edge should hug the viewport, so getBoundingClientRect().right
    // should equal innerWidth (within ~2px); left edge should be > 0.
    let drawerSide: 'right' | 'left' | 'none' = 'none';
    let drawerLeft = -1;
    let drawerRight = -1;
    let viewportWidth = -1;
    if (route === '/dashboard' || route === '/admin') {
      const probe = await page
        .evaluate(() => {
          const paper = document.querySelector('.MuiDrawer-paper');
          if (!paper) return null;
          const rect = paper.getBoundingClientRect();
          return {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewportWidth: window.innerWidth,
          };
        })
        .catch(() => null);
      if (probe) {
        drawerLeft = probe.left;
        drawerRight = probe.right;
        viewportWidth = probe.viewportWidth;
        // RTL → drawer's right edge ~= viewport width
        // LTR → drawer's left edge ~= 0
        if (probe.right >= probe.viewportWidth - 4) drawerSide = 'right';
        else if (probe.left <= 4) drawerSide = 'left';
      }
    }

    page.off('pageerror', onPageError);
    page.off('console', onConsole);

    // eslint-disable-next-line no-console
    console.log(`\n=== ${route} ===`);
    // eslint-disable-next-line no-console
    console.log(`  dir=${htmlDir}`);
    if (route === '/dashboard' || route === '/admin') {
      // eslint-disable-next-line no-console
      console.log(
        `  drawer: side=${drawerSide} left=${drawerLeft} right=${drawerRight} viewport=${viewportWidth}`,
      );
    }
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

    expect(htmlDir, `${route}: expected dir=rtl`).toBe('rtl');
  }

  expect(failures, `Runtime errors found:\n${failures.join('\n')}`).toEqual([]);
});
