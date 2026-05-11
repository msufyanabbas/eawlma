import { test, expect } from '@playwright/test';

/**
 * Localization smoke tests. The exact locale-switcher selector depends on the
 * Navbar implementation — we try multiple fallbacks to stay resilient to
 * minor UI tweaks.
 */
async function openLocaleMenu(page: import('@playwright/test').Page) {
  const trigger = page
    .locator('button:has-text("EN"), button[aria-label*="language" i], [aria-label*="Language" i]')
    .first();
  await trigger.click();
}

test.describe('RTL & localization', () => {
  test('Arabic mode applies RTL', async ({ page }) => {
    await page.goto('/');
    await openLocaleMenu(page);
    await page.getByText(/العربية|Arabic/i).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('Urdu mode applies RTL and uses a Nastaliq-family font', async ({ page }) => {
    await page.goto('/');
    await openLocaleMenu(page);
    await page.getByText(/اردو|Urdu/i).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const fontFamily = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).fontFamily.toLowerCase());
    expect(fontFamily).toContain('nastaliq');
  });

  test('English mode is LTR', async ({ page }) => {
    await page.goto('/');
    const dir = await page.locator('html').getAttribute('dir');
    expect(['ltr', null]).toContain(dir);
  });
});
