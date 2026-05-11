import { test, expect } from '@playwright/test';

type Probe = {
  left: number;
  right: number;
  width: number;
  viewportWidth: number;
  htmlDir: string;
  currentUrl: string;
} | null;

const FAR_FUTURE = Date.now() + 1000 * 60 * 60 * 24 * 30;

function authShim(role: 'agent' | 'admin', locale: 'ar' | 'en') {
  return ({ exp, role: r, locale: l }: { exp: number; role: string; locale: string }) => {
    try {
      localStorage.setItem('eawlma.locale', l);
      localStorage.setItem('eawlma.welcome.seen', '1');
      localStorage.setItem(
        'eawlma.auth',
        JSON.stringify({
          state: {
            user: {
              id: 'test-' + r,
              email: r + '@test.local',
              firstName: 'Test',
              lastName: r === 'admin' ? 'Admin' : 'Agent',
              role: r,
              avatarUrl: null,
              preferredLocale: l,
              emailVerified: true,
              phoneVerified: true,
              identityVerified: true,
            },
            tokens: {
              accessToken: 'fake.access',
              refreshToken: 'fake.refresh',
              accessExpiresAt: exp,
              refreshExpiresAt: exp,
            },
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    } catch {
      /* storage blocked */
    }
  };
}

async function probeDrawerOn(
  page: import('@playwright/test').Page,
  url: string,
  role: 'agent' | 'admin',
  locale: 'ar' | 'en',
): Promise<Probe> {
  await page.context().clearCookies();
  await page.addInitScript(authShim(role, locale), { exp: FAR_FUTURE, role, locale });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.MuiDrawer-paper', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const paper = document.querySelector('.MuiDrawer-paper');
    if (!paper) return null;
    const rect = paper.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      viewportWidth: window.innerWidth,
      htmlDir: document.documentElement.dir,
      currentUrl: window.location.pathname,
    };
  });
}

test('dashboard sidebar is on the right in Arabic (RTL)', async ({ page }) => {
  test.setTimeout(60_000);
  const probe = await probeDrawerOn(page, '/dashboard', 'agent', 'ar');
  // eslint-disable-next-line no-console
  console.log('AR /dashboard →', probe);
  expect(probe).not.toBeNull();
  expect(probe!.htmlDir).toBe('rtl');
  expect(
    probe!.right >= probe!.viewportWidth - 4,
    `RTL drawer.right=${probe!.right} should hug viewport=${probe!.viewportWidth}`,
  ).toBe(true);
});

test('admin sidebar is on the right in Arabic (RTL)', async ({ page }) => {
  test.setTimeout(60_000);
  const probe = await probeDrawerOn(page, '/admin', 'admin', 'ar');
  // eslint-disable-next-line no-console
  console.log('AR /admin →', probe);
  expect(probe).not.toBeNull();
  expect(probe!.htmlDir).toBe('rtl');
  expect(
    probe!.right >= probe!.viewportWidth - 4,
    `RTL drawer.right=${probe!.right} should hug viewport=${probe!.viewportWidth}`,
  ).toBe(true);
});

test('LTR sanity: dashboard sidebar still on the left in English', async ({ page }) => {
  test.setTimeout(60_000);
  const probe = await probeDrawerOn(page, '/dashboard', 'agent', 'en');
  // eslint-disable-next-line no-console
  console.log('EN /dashboard →', probe);
  expect(probe).not.toBeNull();
  expect(probe!.htmlDir).toBe('ltr');
  expect(probe!.left <= 4, `LTR drawer.left=${probe!.left} should hug viewport-start (0)`).toBe(true);
});
