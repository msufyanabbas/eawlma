import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'buyer1@eawlma.sa');
    await page.fill('input[type="password"]', 'Buyer123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(?!auth)/);
  });

  test('user can browse stays and reach a detail page', async ({ page }) => {
    await page.goto('/stays');
    const first = page.locator('[data-card-root]').first();
    await first.waitFor({ state: 'visible', timeout: 10_000 });
    await first.click();
    await expect(page).toHaveURL(/\/listings\//);
  });

  test('booking calendar renders price breakdown on date selection', async ({ page }) => {
    await page.goto('/stays');
    await page.locator('[data-card-root]').first().click();
    await page.waitForURL(/\/listings\//);

    const checkIn = page.locator('input[type="date"]').first();
    if (!(await checkIn.isVisible().catch(() => false))) {
      test.skip(true, 'Listing has no daily booking widget.');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const after = new Date();
    after.setDate(after.getDate() + 4);
    await checkIn.fill(tomorrow.toISOString().slice(0, 10));
    await page.locator('input[type="date"]').last().fill(after.toISOString().slice(0, 10));

    await expect(
      page.getByText(/Price breakdown|تفاصيل السعر/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
