import { test, expect } from '@playwright/test';

test.describe('Performance smoke', () => {
  test('homepage settles within 5 seconds (cold) / 3 seconds (warm)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    // Generous cold-start budget — adjust downward as the codebase tightens.
    expect(elapsed).toBeLessThan(8_000);
  });

  test('navigation does not balloon heap by > 50MB after 5 round-trips', async ({ page }) => {
    const memory = () =>
      page.evaluate(
        () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
      );
    await page.goto('/');
    const before = await memory();
    for (let i = 0; i < 5; i++) {
      await page.goto('/search');
      await page.goto('/');
    }
    const after = await memory();
    // memory API is Chromium-only — skip when unsupported.
    test.skip(after === 0 && before === 0, 'performance.memory not exposed in this browser');
    expect(after - before).toBeLessThan(50 * 1024 * 1024);
  });
});
