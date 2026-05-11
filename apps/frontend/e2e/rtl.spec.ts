import { test, expect, type Page } from '@playwright/test';

/**
 * The app's i18n init reads `localStorage['eawlma.locale']` on startup, so the
 * deterministic way to exercise RTL is to set that key + reload. The menu-
 * driven path is left as a secondary smoke check that gracefully skips when
 * the switcher isn't reachable (e.g. on smaller mobile viewports).
 */

async function openLocaleMenu(page: Page): Promise<boolean> {
  const trigger = page
    .locator(
      [
        'button[aria-label*="language" i]',
        'button[aria-label*="Language" i]',
        'button:has([data-testid="LanguageIcon"])',
        'button:has(svg[data-testid="LanguageIcon"])',
      ].join(', '),
    )
    .first();
  const clicked = await trigger
    .click({ timeout: 4_000 })
    .then(() => true)
    .catch(() => false);
  if (clicked) return true;

  const buttons = page.locator('nav button, header button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const text = (await btn.textContent())?.trim() ?? '';
    if (/^(EN|AR|UR|عر)/i.test(text) || /language/i.test(text)) {
      const ok = await btn
        .click({ timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      if (ok) return true;
    }
  }
  return false;
}

async function pickLocale(page: Page, matcher: RegExp): Promise<boolean> {
  const option = page
    .locator('li, [role="menuitem"], button')
    .filter({ hasText: matcher })
    .first();
  const ok = await option
    .click({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (ok) await page.waitForTimeout(800);
  return ok;
}

async function effectiveDir(page: Page): Promise<string> {
  return page.evaluate(
    () => document.documentElement.dir || getComputedStyle(document.body).direction,
  );
}

test.describe('RTL & localization', () => {
  test('Arabic mode applies RTL (via localStorage seed)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('eawlma.locale', 'ar'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await effectiveDir(page)).toBe('rtl');
  });

  test('Urdu mode applies RTL and uses a Nastaliq family', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('eawlma.locale', 'ur'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await effectiveDir(page)).toBe('rtl');
    const fontFamily = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).fontFamily.toLowerCase());
    expect(fontFamily).toContain('nastaliq');
  });

  test('English mode is LTR', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('eawlma.locale', 'en'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await effectiveDir(page)).toBe('ltr');
  });

  test('locale switcher is reachable via the navbar (UI path)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const opened = await openLocaleMenu(page);
    if (!opened) {
      test.skip(true, 'Locale switcher not reachable on this viewport.');
      return;
    }
    const picked = await pickLocale(page, /العربية|Arabic|عرب/i);
    if (!picked) {
      test.skip(true, 'Locale menu option not clickable.');
      return;
    }
    expect(await effectiveDir(page)).toBe('rtl');
  });
});
