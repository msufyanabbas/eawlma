import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Mobile S', width: 320, height: 568 },
  { name: 'Mobile M', width: 375, height: 667 },
  { name: 'Mobile L', width: 425, height: 812 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive @ ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('homepage renders without horizontal scroll', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('nav').first()).toBeVisible();
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(vp.width + 5);
    });

    test('search page renders a usable input', async ({ page }) => {
      await page.goto('/search');
      await expect(page.locator('input').first()).toBeVisible();
    });
  });
}
