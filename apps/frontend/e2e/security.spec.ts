import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test('XSS payload in the search query does not execute', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => {
      alertFired = true;
    });
    await page.goto('/search?q=<script>alert(1)</script>');
    await page.waitForLoadState('domcontentloaded');
    expect(alertFired).toBe(false);
  });

  test('protected dashboard routes redirect to login when signed out', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/dashboard/listings', '/admin', '/admin/users'];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/auth\/login/);
    }
  });

  test('agent token is rejected when accessing /admin via UI', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'agent1@eawlma.sa');
    await page.fill('input[type="password"]', 'Agent123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(?!auth)/);
    await page.goto('/admin');
    // requireRole redirects non-admins to '/'.
    await expect(page).not.toHaveURL(/\/admin\/?$/);
  });
});
