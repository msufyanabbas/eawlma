import { test } from '@playwright/test';

const SLOW = 1200; // pause between scenes
const TYPE_DELAY = 60; // ms per keystroke

test('Eawlma Platform Demo', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  // Suppress the first-visit welcome dialog on every page (it intercepts clicks).
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eawlma.welcome.seen', '1');
    } catch {
      /* storage may be blocked on some origins */
    }
  });

  // ── SCENE 1: Homepage ──
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW);

  // Scroll to show featured listings
  await page.evaluate(() =>
    window.scrollBy({ top: 600, behavior: 'smooth' }),
  );
  await page.waitForTimeout(SLOW * 2);

  // Show popular cities
  await page.evaluate(() =>
    window.scrollBy({ top: 600, behavior: 'smooth' }),
  );
  await page.waitForTimeout(SLOW);

  // Show partners
  await page.evaluate(() =>
    window.scrollBy({ top: 600, behavior: 'smooth' }),
  );
  await page.waitForTimeout(SLOW);

  // Switch to Arabic
  await page.evaluate(() =>
    localStorage.setItem('eawlma.locale', 'ar'),
  );
  await page.reload();
  await page.waitForTimeout(SLOW * 2);

  // Switch back to English
  await page.evaluate(() =>
    localStorage.setItem('eawlma.locale', 'en'),
  );
  await page.reload();
  await page.waitForTimeout(SLOW);

  // ── SCENE 2: Search ──
  await page.goto('/search');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW);

  // Type in search
  const searchInput = page.locator('input').first();
  await searchInput.click();
  await page.waitForTimeout(500);

  // Show map view
  const mapBtn = page
    .locator('button')
    .filter({ has: page.locator('[data-testid="MapIcon"], svg') })
    .first();
  if (await mapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mapBtn.click();
    await page.waitForTimeout(SLOW * 2);
    // Switch back to grid
    await mapBtn.click();
    await page.waitForTimeout(SLOW);
  }

  // ── SCENE 3: Listing Detail ──
  const cards = page.locator('[data-card-root]');
  if ((await cards.count()) > 0) {
    await cards.first().locator('img').first().click();
    await page.waitForURL(/listings\//, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(SLOW);

    // Scroll through detail
    await page.evaluate(() =>
      window.scrollBy({ top: 400, behavior: 'smooth' }),
    );
    await page.waitForTimeout(SLOW);
    await page.evaluate(() =>
      window.scrollBy({ top: 400, behavior: 'smooth' }),
    );
    await page.waitForTimeout(SLOW * 2);
  }

  // ── SCENE 4: Login as Agent ──
  await page.goto('/auth/login');
  await page.waitForTimeout(SLOW);

  await page
    .locator('input[type="email"]')
    .pressSequentially('agent1@eawlma.sa', { delay: TYPE_DELAY });
  await page.waitForTimeout(500);
  await page
    .locator('input[type="password"]')
    .pressSequentially('Agent123!', { delay: TYPE_DELAY });
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(SLOW);

  // ── SCENE 5: Agent Dashboard ──
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  // New listing with AI suggestion
  await page.goto('/dashboard/listings/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW);

  // Fill city
  const cityInput = page
    .locator('input, [role="combobox"]')
    .filter({ hasText: /city|مدينة/i })
    .first();
  if (await cityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cityInput.fill('Riyadh');
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(SLOW * 2);

  // Go to inquiries
  await page.goto('/dashboard/inquiries');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  // Go to wallet
  await page.goto('/dashboard/wallet');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  // ── SCENE 6: Short-term Stays ──
  await page.goto('/stays');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  await page.goto('/hotels');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  // ── SCENE 7: Market Insights ──
  await page.goto('/market');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);
  await page.evaluate(() =>
    window.scrollBy({ top: 500, behavior: 'smooth' }),
  );
  await page.waitForTimeout(SLOW * 2);

  // ── SCENE 8: Admin Panel ──
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill('admin@eawlma.sa');
  await page.locator('input[type="password"]').fill('Admin123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10000 }).catch(() => undefined);

  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 2);

  await page.goto('/admin/moderation');
  await page.waitForTimeout(SLOW);

  await page.goto('/admin/promos');
  await page.waitForTimeout(SLOW);

  await page.goto('/admin/commissions');
  await page.waitForTimeout(SLOW * 2);

  // ── SCENE 9: Multilingual ──
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('eawlma.locale', 'ar'),
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 3);

  await page.evaluate(() =>
    localStorage.setItem('eawlma.locale', 'ur'),
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(SLOW * 3);

  // Reset to English
  await page.evaluate(() =>
    localStorage.setItem('eawlma.locale', 'en'),
  );
  await page.reload();
  await page.waitForTimeout(SLOW);

  // Demo complete!
  // eslint-disable-next-line no-console
  console.log('🎬 Demo recording complete!');
});
