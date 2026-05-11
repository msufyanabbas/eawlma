import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('logs in with seeded agent credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'agent1@eawlma.sa');
    await page.fill('input[type="password"]', 'Agent123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|\?|$)/, { timeout: 10_000 });
  });

  test('shows an error for the wrong password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'agent1@eawlma.sa');
    await page.fill('input[type="password"]', 'WrongPassword!1');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to login when hitting a protected route while signed out', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('Nafath mock flow lands on the mock page from /auth/login', async ({ page }) => {
    await page.goto('/auth/login');
    const nafath = page.locator('text=/Nafath|نفاذ/i').first();
    if (await nafath.isVisible().catch(() => false)) {
      await nafath.click();
      await expect(page).toHaveURL(/(nafath-mock|nafath-callback|nafath\/authorize)/);
    } else {
      test.skip(true, 'Nafath button not present in this build');
    }
  });
});
