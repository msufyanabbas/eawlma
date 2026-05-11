import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3010/api/v1';
const FE_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

test.describe('SEO', () => {
  test('homepage exposes title + description + og:title meta', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    const description = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute('content');
    expect((description ?? '').length).toBeGreaterThan(20);
    const og = await page.locator('meta[property="og:title"]').first().getAttribute('content');
    expect(og).toBeTruthy();
  });

  test('listing detail emits RealEstateListing JSON-LD', async ({ page }) => {
    // Discover an id from the public search API rather than click-routing —
    // the card uses `window.location.href` and intermittent overlays trip
    // Playwright's click-stability checks.
    const res = await page.request.get(`${API_BASE}/search/listings?limit=1`);
    const body = (await res.json()) as { data?: { data?: Array<{ id: string }> } };
    const id = body.data?.data?.[0]?.id;
    if (!id) {
      test.skip(true, 'No listings available.');
      return;
    }
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('networkidle');

    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld!);
    expect(parsed['@type']).toBe('RealEstateListing');
    expect(parsed.address).toBeDefined();
  });

  test('sitemap.xml is reachable and well-formed', async ({ request }) => {
    const res = await request.get(`${API_BASE}/sitemap.xml`);
    expect(res.ok()).toBe(true);
    const text = await res.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<urlset');
  });

  test('robots.txt has the expected rules + sitemap pointer', async ({ request }) => {
    const res = await request.get(`${FE_BASE}/robots.txt`);
    expect(res.ok()).toBe(true);
    const text = await res.text();
    expect(text).toContain('User-agent');
    expect(text).toContain('Disallow: /admin');
    expect(text.toLowerCase()).toContain('sitemap:');
  });
});
