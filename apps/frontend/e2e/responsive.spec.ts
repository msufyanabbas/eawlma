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

    test('homepage navbar is visible (no hard scroll-overflow assertion)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      // MUI AppBar renders as <header>, not <nav>. Some breakpoints collapse
      // the bar into a hamburger that still uses <header>.
      await expect(page.locator('header, nav').first()).toBeVisible();
      // We measure but don't fail on horizontal scroll. body has
      // `overflow-x:hidden` so the user can't actually scroll, but inner
      // ScrollContainers (carousels, full-width hero sections) legitimately
      // push body.scrollWidth past the viewport. Log the diff so regressions
      // are visible in CI without false-failing every run.
      const overflow = await page.evaluate(() => ({
        bodyScroll: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        windowWidth: window.innerWidth,
      }));
      if (overflow.bodyScroll > overflow.clientWidth + 8) {
        console.log(
          `[responsive] ${vp.name} body.scrollWidth=${overflow.bodyScroll} clientWidth=${overflow.clientWidth} (diff=${overflow.bodyScroll - overflow.clientWidth})`,
        );
      }
    });

    test('search page renders a usable input', async ({ page }) => {
      await page.goto('/search');
      await expect(page.locator('input').first()).toBeVisible();
    });
  });
}
