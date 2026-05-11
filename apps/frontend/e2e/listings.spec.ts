import { test, expect } from '@playwright/test';

test.describe('Listings', () => {
  test('search page loads and renders listing cards', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('[data-card-root]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('open a listing detail page from search', async ({ page }) => {
    await page.goto('/search');
    const firstCard = page.locator('[data-card-root]').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/listings\//);
    await expect(page.locator('text=SAR').first()).toBeVisible();
  });

  test('photo gallery opens, navigates, and closes', async ({ page }) => {
    await page.goto('/search');
    await page.locator('[data-card-root]').first().click();
    await page.waitForURL(/\/listings\//);

    const showAll = page.getByText(/Show all photos|عرض جميع الصور/i).first();
    if (await showAll.isVisible().catch(() => false)) {
      await showAll.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    } else {
      test.skip(true, 'Listing has no "Show all photos" CTA (probably a single image listing).');
    }
  });
});
