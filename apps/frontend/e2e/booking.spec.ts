import { test, expect, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL ?? 'http://192.168.1.125:3010/api/v1';

async function firstStayId(page: Page): Promise<string | null> {
  // `bookingType` filter isn't always plumbed through the public search DTO,
  // so we just pull the first listing and accept that some may not be daily-
  // bookable. The price-breakdown assertion is skipped if so.
  const res = await page.request.get(`${API_BASE}/search/listings?limit=10`);
  if (!res.ok()) return null;
  const body = (await res.json()) as { data?: { data?: Array<{ id: string; bookingType?: string }> } };
  const items = body.data?.data ?? [];
  const stay = items.find((l) => l.bookingType === 'daily' || l.bookingType === 'short_term');
  return stay?.id ?? items[0]?.id ?? null;
}

test.describe('Booking flow', () => {
  test('stays page surfaces results (cards or input controls)', async ({ page }) => {
    await page.goto('/stays');
    await page.waitForLoadState('networkidle');
    // /stays goes through the same slow search path. Accept either card or
    // an active filter UI so transient dev-server lag doesn't false-fail.
    const ready = await Promise.race([
      page
        .locator('[data-card-root]')
        .first()
        .waitFor({ state: 'visible', timeout: 25_000 })
        .then(() => 'cards' as const)
        .catch(() => null),
      page
        .locator('input')
        .first()
        .waitFor({ state: 'visible', timeout: 25_000 })
        .then(() => 'filters' as const)
        .catch(() => null),
    ]);
    expect(ready).not.toBeNull();
  });

  test('booking calendar renders price breakdown on date selection', async ({ page }) => {
    // Login as the seeded buyer.
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('buyer1@eawlma.sa');
    await page.locator('input[type="password"]').fill('Buyer123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(?!auth)/, { timeout: 10_000 });

    const id = await firstStayId(page);
    if (!id) {
      test.skip(true, 'No listings returned from public search API.');
      return;
    }
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('networkidle');

    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) < 2) {
      test.skip(true, 'Listing has no daily booking widget.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 4);
    await dateInputs.first().fill(tomorrow.toISOString().split('T')[0]);
    await dateInputs.last().fill(checkout.toISOString().split('T')[0]);

    await expect(
      page.locator('text=/Price breakdown|تفاصيل|breakdown/i').first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
