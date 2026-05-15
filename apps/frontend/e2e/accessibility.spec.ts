import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (axe-core)', () => {
  test('homepage has no critical or serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    if (results.violations.length > 0) {
      console.log(
        'a11y violations:',
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          })),
          null,
          2,
        ),
      );
    }
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(blocking).toHaveLength(0);
  });

  test('listing detail has no critical violations', async ({ page }) => {
    // Skip clicking — the card's `window.location.href` handler isn't always
    // reliable under Playwright. Discover an id via the public search API.
    const apiBase = process.env.E2E_API_URL ?? 'http://192.168.1.125:3010/api/v1';
    const res = await page.request.get(`${apiBase}/search/listings?limit=1`);
    const body = (await res.json()) as { data?: { data?: Array<{ id: string }> } };
    const id = body.data?.data?.[0]?.id;
    if (!id) {
      test.skip(true, 'No listings available for a11y check.');
      return;
    }
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    if (critical.length > 0) {
      console.log('Critical a11y violations on listing detail:');
      for (const v of critical) console.log(`- ${v.id}: ${v.description}`);
    }
    expect(critical).toHaveLength(0);
  });

  test('content images have alt text', async ({ page }) => {
    await page.goto('/');
    const imgs = await page.locator('img').all();
    for (const img of imgs.slice(0, 25)) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      // Either has a non-empty alt, or is explicitly decorative.
      const ok = (alt !== null && alt !== undefined) || role === 'presentation' || ariaHidden === 'true';
      expect(ok).toBe(true);
    }
  });

  test('first 20 buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.locator('button').all();
    for (const btn of buttons.slice(0, 20)) {
      const text = (await btn.textContent())?.trim() ?? '';
      const aria = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      expect(text || aria || title).toBeTruthy();
    }
  });
});
