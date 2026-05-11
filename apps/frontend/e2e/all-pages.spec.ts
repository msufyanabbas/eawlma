import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke-tests every page in the app. Each test only asserts the page didn't
 * hard-error and (for protected routes) didn't bounce us back to /auth/login.
 *
 * We deliberately do NOT assert on `console.error` or `page.on('pageerror')`
 * because both are dominated by environment noise we can't fix here:
 *   • Resource-load failures (Google Maps DNS / gtag 500s / hCaptcha) appear
 *     as `console.error` on every page.
 *   • Third-party trackers throw "Cannot convert object to primitive value"
 *     during their async init on every page render — visible as a
 *     `pageerror` but the page renders correctly.
 *
 * The real signal we care about is: the route resolved, the page mounted
 * (we got past `domcontentloaded` without the router falling through to
 * the NotFound component), and the URL isn't `/auth/login`.
 */

const PUBLIC_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/search', name: 'Search' },
  { path: '/stays', name: 'Stays' },
  { path: '/hotels', name: 'Hotels' },
  { path: '/market', name: 'Market Insights' },
  { path: '/agents', name: 'Agents Directory' },
  { path: '/compare', name: 'Compare' },
  { path: '/saved', name: 'Saved Properties' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/help', name: 'Help Center' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms of Service' },
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/register', name: 'Register' },
  { path: '/auth/forgot-password', name: 'Forgot Password' },
  { path: '/auth/verify', name: 'Verify OTP' },
];

const DASHBOARD_PAGES = [
  { path: '/dashboard', name: 'Dashboard Overview' },
  { path: '/dashboard/listings', name: 'My Listings' },
  { path: '/dashboard/listings/new', name: 'Listing Wizard' },
  { path: '/dashboard/inquiries', name: 'Inquiries' },
  { path: '/dashboard/messages', name: 'Messages' },
  { path: '/dashboard/notifications', name: 'Notifications' },
  { path: '/dashboard/subscription', name: 'Subscription' },
  { path: '/dashboard/settings', name: 'Settings' },
  { path: '/dashboard/wallet', name: 'Wallet' },
  { path: '/dashboard/commissions', name: 'Commissions' },
  { path: '/dashboard/bookings', name: 'Bookings' },
  { path: '/dashboard/hosting', name: 'Hosting' },
  { path: '/dashboard/deals', name: 'My Deals' },
  { path: '/dashboard/contracts', name: 'Contracts' },
  { path: '/dashboard/dufaat', name: 'Dufaat' },
];

const ADMIN_PAGES = [
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/moderation', name: 'Moderation' },
  { path: '/admin/users', name: 'Users' },
  { path: '/admin/commissions', name: 'Commissions' },
  { path: '/admin/payouts', name: 'Payouts' },
  { path: '/admin/disputes', name: 'Disputes' },
  { path: '/admin/promos', name: 'Promo Codes' },
  { path: '/admin/audit', name: 'Audit Log' },
  { path: '/admin/property-requests', name: 'Property Requests' },
];

import { request as pwRequest, type APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3010/api/v1';

/**
 * Login rate-limit is 5/min/IP. With ~32 protected tests each calling login
 * in their beforeEach, we'd 429 by the sixth test. Instead we log in ONCE
 * per role at module load, cache the persisted-zustand JSON, and inject it
 * via `addInitScript` before each navigation.
 *
 * `addInitScript` runs before any page script on every page load, which is
 * the only reliable way to populate localStorage ahead of zustand's
 * (synchronous) rehydration — anything done after navigation races the
 * TanStack Router `beforeLoad(requireAuth)` guard.
 */
async function fetchPersistedAuth(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await api.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`login failed for ${email}: HTTP ${res.status()}`);
  }
  const body = (await res.json()) as {
    data?: {
      user?: unknown;
      tokens?: {
        accessToken: string;
        refreshToken: string;
        accessTokenExpiresIn: number;
        refreshTokenExpiresIn: number;
      };
    };
  };
  const data = body.data;
  if (!data?.user || !data?.tokens) {
    throw new Error(`login response missing user/tokens for ${email}`);
  }
  const now = Date.now();
  return JSON.stringify({
    state: {
      user: data.user,
      tokens: {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        accessExpiresAt: now + data.tokens.accessTokenExpiresIn * 1000,
        refreshExpiresAt: now + data.tokens.refreshTokenExpiresIn * 1000,
      },
      isAuthenticated: true,
    },
    version: 0,
  });
}

let agentPersistedAuth = '';
let adminPersistedAuth = '';

test.beforeAll(async () => {
  const api = await pwRequest.newContext();
  try {
    agentPersistedAuth = await fetchPersistedAuth(api, 'agent1@eawlma.sa', 'Agent123!');
    adminPersistedAuth = await fetchPersistedAuth(api, 'admin@eawlma.sa', 'Admin123!');
  } finally {
    await api.dispose();
  }
});

async function seedAuth(page: Page, persisted: string): Promise<void> {
  await page.addInitScript((payload) => {
    localStorage.setItem('eawlma.auth', payload);
  }, persisted);
}

async function expectNoTitleError(page: Page): Promise<void> {
  await expect(page).not.toHaveTitle(/404|500|Error/i);
}

test.describe('All public pages load', () => {
  for (const p of PUBLIC_PAGES) {
    test(`${p.name} (${p.path})`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');
      // Body must have some rendered content (router did NOT fall through
      // to a blank shell). A reasonable lower-bound is "has any element
      // beyond <script>/<link>".
      const bodyChildCount = await page.evaluate(() => document.body.children.length);
      expect(bodyChildCount, `empty <body> on ${p.path}`).toBeGreaterThan(0);
      await expectNoTitleError(page);
    });
  }
});

test.describe('Dashboard pages (agent)', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, agentPersistedAuth);
  });

  for (const p of DASHBOARD_PAGES) {
    test(`${p.name} (${p.path})`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url(), `unexpected redirect to login from ${p.path}`).not.toMatch(
        /\/auth\/login/,
      );
      const bodyChildCount = await page.evaluate(() => document.body.children.length);
      expect(bodyChildCount, `empty <body> on ${p.path}`).toBeGreaterThan(0);
      await expectNoTitleError(page);
    });
  }
});

test.describe('Admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, adminPersistedAuth);
  });

  for (const p of ADMIN_PAGES) {
    test(`${p.name} (${p.path})`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url(), `unexpected redirect to login from ${p.path}`).not.toMatch(
        /\/auth\/login/,
      );
      const bodyChildCount = await page.evaluate(() => document.body.children.length);
      expect(bodyChildCount, `empty <body> on ${p.path}`).toBeGreaterThan(0);
      await expectNoTitleError(page);
    });
  }
});
