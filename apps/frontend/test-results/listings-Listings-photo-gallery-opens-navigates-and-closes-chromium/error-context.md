# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: listings.spec.ts >> Listings >> photo gallery opens, navigates, and closes
- Location: e2e\listings.spec.ts:61:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: /photo|صور/i }).first()
    - locator resolved to <button tabindex="0" type="button" class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButton-colorPrimary MuiButton-disableElevation MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeMedium MuiButton-containedSizeMedium MuiButton-colorPrimary MuiButton-disableElevation mui-rtl-smcacz-MuiButtonBase-root-MuiButton-root">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper mui-rtl-1sep8xo-MuiDialog-container">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root mui-rtl-zw3mfo-MuiModal-root-MuiDialog-root">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper mui-rtl-1sep8xo-MuiDialog-container">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root mui-rtl-zw3mfo-MuiModal-root-MuiDialog-root">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    49 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div tabindex="-1" role="presentation" class="MuiDialog-container MuiDialog-scrollPaper mui-rtl-1sep8xo-MuiDialog-container">…</div> from <div role="presentation" class="MuiDialog-root MuiModal-root mui-rtl-zw3mfo-MuiModal-root-MuiDialog-root">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - banner [ref=e4]:
        - generic [ref=e6]:
          - link [ref=e7] [cursor=pointer]:
            - /url: /
            - generic [ref=e8]:
              - img [ref=e9]
              - paragraph [ref=e10]: عَوْلَمَة
          - generic [ref=e13]:
            - img [ref=e15]
            - textbox [ref=e17]:
              - /placeholder: ابحث بالمدينة، الحي، أو رقم الإعلان
            - group
          - generic [ref=e18]:
            - button [ref=e19] [cursor=pointer]: إقامات
            - link [ref=e20] [cursor=pointer]:
              - /url: /market
              - button [ref=e21]: السوق
            - button [ref=e22] [cursor=pointer]:
              - img [ref=e23]
            - button [ref=e25] [cursor=pointer]:
              - img [ref=e26]
            - generic [ref=e28]:
              - link [ref=e29] [cursor=pointer]:
                - /url: /auth/login
                - button [ref=e30]: تسجيل الدخول
              - link [ref=e31] [cursor=pointer]:
                - /url: /auth/register
                - button [ref=e32]: إنشاء حساب
      - main [ref=e33]:
        - generic [ref=e35]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - img [ref=e40] [cursor=pointer]
              - img [ref=e42] [cursor=pointer]
              - img [ref=e44] [cursor=pointer]
              - img [ref=e46] [cursor=pointer]
              - img [ref=e48] [cursor=pointer]
            - button [ref=e49] [cursor=pointer]:
              - img [ref=e51]
              - text: عرض جميع الصور (10)
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e59]: للبيع
                - generic [ref=e60]:
                  - img [ref=e61]
                  - generic [ref=e63]: مميز
                - generic [ref=e64]: EAW-SEED-19
                - generic [ref=e66]: 👁 20 views
              - heading [level=4] [ref=e67]: شقة بإطلالة على البحر - جدة
              - generic [ref=e68]:
                - img [ref=e69]
                - paragraph [ref=e72]: حي الشاطئ, Jeddah, Makkah Province
              - generic [ref=e73]:
                - img [ref=e74]
                - generic [ref=e76]: 11 مايو 2026 (٢٤ ذو القعدة ١٤٤٧ هـ)
            - generic [ref=e77]:
              - button [ref=e78] [cursor=pointer]:
                - img [ref=e79]
              - button [ref=e81] [cursor=pointer]:
                - img [ref=e82]
              - heading [level=5] [ref=e84]: 1,350,000 ر.س
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e88]:
                - generic [ref=e90]:
                  - generic [ref=e91]:
                    - generic [ref=e92]:
                      - img [ref=e93]
                      - generic [ref=e95]: غرف
                    - heading [level=6] [ref=e96]: "3"
                  - generic [ref=e97]:
                    - generic [ref=e98]:
                      - img [ref=e99]
                      - generic [ref=e102]: حمامات
                    - heading [level=6] [ref=e103]: "2"
                  - generic [ref=e104]:
                    - generic [ref=e105]:
                      - img [ref=e106]
                      - generic [ref=e108]: المساحة
                    - heading [level=6] [ref=e109]: 165 م²
                  - generic [ref=e110]:
                    - generic [ref=e112]: Parking
                    - heading [level=6] [ref=e113]: "1"
                - generic [ref=e114]:
                  - generic [ref=e115]:
                    - text: اتجاه السوق المحلي
                    - generic [ref=e116]:
                      - heading [level=6] [ref=e117]: 8,182 ر.س/m²
                      - paragraph [ref=e118]: ▲ 0.0%
                    - link [ref=e119] [cursor=pointer]:
                      - /url: /market
                      - generic [ref=e120]: عرض السوق →
                  - img [ref=e124]
                - generic [ref=e128]:
                  - generic [ref=e130]:
                    - generic [ref=e131]: ✨ Premium
                    - generic [ref=e132]: AR / VR Experience
                  - heading [level=4] [ref=e133]: 🥽 Immersive VR & AR Property Experience
                  - paragraph [ref=e134]: Step inside this property from anywhere in the world. Take a 360° virtual tour or place a true-to-scale 3D model right in your living room.
                  - generic [ref=e135]:
                    - button [ref=e136] [cursor=pointer]:
                      - img [ref=e138]
                      - text: Enter VR Tour
                    - button [ref=e140] [cursor=pointer]: View in AR
                  - generic [ref=e141]: The agent hasn't uploaded a 360°/3D tour for this listing yet.
                - generic [ref=e142]:
                  - generic [ref=e143]:
                    - heading [level=5] [ref=e144]: الوصف
                    - generic [ref=e146]:
                      - combobox [ref=e147] [cursor=pointer]: العربية (source)
                      - textbox: ar
                      - img
                      - group
                  - paragraph [ref=e148]: شقة عصرية بإطلالة بانورامية على البحر الأحمر، تشطيب راقٍ وموقع متميز.
                - generic [ref=e150]:
                  - generic [ref=e151]:
                    - img [ref=e152]
                    - paragraph [ref=e154]: 🏦 Mortgage Calculator
                  - generic [ref=e156]:
                    - generic [ref=e158]:
                      - generic [ref=e159]:
                        - generic [ref=e160]: Property price (SAR)
                        - generic [ref=e162]:
                          - spinbutton [ref=e163]: "1350000"
                          - group
                      - generic [ref=e164]:
                        - generic [ref=e165]:
                          - generic [ref=e166]: Down payment
                          - generic [ref=e167]: 20% · 270,000 SAR
                        - slider [ref=e172]: "20"
                      - generic [ref=e173]:
                        - generic [ref=e174]: Loan term (years)
                        - group [ref=e175]:
                          - button [ref=e176] [cursor=pointer]: "10"
                          - button [ref=e177] [cursor=pointer]: "15"
                          - button [ref=e178] [cursor=pointer]: "20"
                          - button [pressed] [ref=e179] [cursor=pointer]: "25"
                          - button [ref=e180] [cursor=pointer]: "30"
                      - generic [ref=e181]:
                        - text: Annual interest rate (%)
                        - generic [ref=e183]:
                          - spinbutton [ref=e184]: "4.5"
                          - group
                    - generic [ref=e186]:
                      - generic [ref=e187]:
                        - text: Estimated monthly payment
                        - paragraph [ref=e188]:
                          - text: 6,003
                          - generic [ref=e189]: SAR/mo
                      - generic [ref=e190]:
                        - generic [ref=e191]:
                          - generic [ref=e192]: Loan amount
                          - paragraph [ref=e193]: 1,080,000 SAR
                        - generic [ref=e194]:
                          - generic [ref=e195]: Total payment
                          - paragraph [ref=e196]: 1,800,897 SAR
                        - generic [ref=e197]:
                          - generic [ref=e198]: Total interest
                          - paragraph [ref=e199]: 720,897 SAR
                        - generic [ref=e200]:
                          - generic [ref=e201]: Down payment
                          - paragraph [ref=e202]: 270,000 SAR
                      - generic [ref=e203]: This is an estimate. Consult your bank for an actual loan offer.
                - generic [ref=e204]:
                  - img [ref=e205]
                  - generic [ref=e207]:
                    - paragraph [ref=e208]: إعلان مرخّص من الهيئة العامة للعقار
                    - generic [ref=e209]: "الترخيص: EAW-SEED-19"
                - heading [level=5] [ref=e211]: المميزات
                - heading [level=5] [ref=e213]: الموقع
              - generic [ref=e220]:
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - generic [ref=e223]: FA
                    - generic [ref=e224]:
                      - heading [level=6] [ref=e226]: Faisal Al-Shammari
                      - generic [ref=e227]:
                        - img [ref=e228]
                        - img [ref=e230]
                        - img [ref=e232]
                        - img [ref=e234]
                        - img [ref=e236]
                        - generic [ref=e238]: "4.8"
                  - generic [ref=e239]:
                    - img [ref=e240]
                    - generic [ref=e242]: Responds within 2 hours
                  - generic [ref=e243]:
                    - link [ref=e244] [cursor=pointer]:
                      - /url: /agents/12d94017-00bc-4dbd-af77-ed704306c229
                      - text: View profile
                    - button [ref=e245] [cursor=pointer]:
                      - img [ref=e247]
                      - text: الرسائل
                - generic [ref=e249]:
                  - heading [level=6] [ref=e250]: تواصل مع الوكيل
                  - generic [ref=e251]:
                    - generic [ref=e252]:
                      - generic: اسمك
                      - generic [ref=e253]:
                        - textbox [ref=e254]
                        - group:
                          - generic: اسمك
                    - generic [ref=e255]:
                      - generic: البريد الإلكتروني
                      - generic [ref=e256]:
                        - textbox [ref=e257]
                        - group:
                          - generic: البريد الإلكتروني
                    - generic [ref=e258]:
                      - generic: رقم الجوال
                      - generic [ref=e259]:
                        - textbox [ref=e260]:
                          - /placeholder: +9665XXXXXXXX
                        - group:
                          - generic: رقم الجوال
                  - generic [ref=e262]:
                    - textbox [ref=e263]:
                      - /placeholder: أنا مهتم بـ EAW-SEED-19…
                    - group
                  - generic [ref=e264]:
                    - button [disabled]: إرسال استفسار
                    - link [ref=e265] [cursor=pointer]:
                      - /url: https://wa.me/?text=Eawlma%20%E2%80%94%20%D8%B4%D9%82%D8%A9%20%D8%A8%D8%A5%D8%B7%D9%84%D8%A7%D9%84%D8%A9%20%D8%B9%D9%84%D9%89%20%D8%A7%D9%84%D8%A8%D8%AD%D8%B1%20-%20%D8%AC%D8%AF%D8%A9%20%E2%80%94%20http%3A%2F%2Flocalhost%3A5173%2Flistings%2Fd2f25dd4-c30f-4faa-a034-4a143efe81d1
                      - img [ref=e267]
                      - text: واتساب
                    - button [ref=e269] [cursor=pointer]:
                      - img [ref=e271]
                      - text: اتصل بالوكيل
            - heading [level=5] [ref=e274]: Similar listings
      - contentinfo [ref=e275]:
        - generic [ref=e276]:
          - generic [ref=e277]:
            - generic [ref=e278]:
              - generic [ref=e279]:
                - generic [ref=e280]: A
                - heading [level=6] [ref=e281]: عَوْلَمَة
              - paragraph [ref=e282]: عَوْلَمَة هي السوق العقاري الموثوق في المملكة — اكتشف العقارات وأدرجها وأجّرها في جميع أنحاء المملكة العربية السعودية بثقة.
              - link [ref=e283] [cursor=pointer]:
                - /url: https://wa.me/966500000000
                - img [ref=e285]
                - text: +966 50 000 0000
              - generic [ref=e287]: تحتاج مساعدة؟ تواصل معنا على واتساب.
              - generic [ref=e288]:
                - generic [ref=e289]: "السجل التجاري: XXXX-XXXXXXX"
                - generic [ref=e290]: مرخص من الهيئة العامة للعقار
                - generic [ref=e291]: الرياض، المملكة العربية السعودية
            - generic [ref=e292]:
              - generic [ref=e293]:
                - generic [ref=e294]: استكشف
                - link [ref=e295] [cursor=pointer]:
                  - /url: /search?type=sale
                  - text: للبيع
                - link [ref=e296] [cursor=pointer]:
                  - /url: /search?type=rent
                  - text: للإيجار
                - link [ref=e297] [cursor=pointer]:
                  - /url: /agents
                  - text: الوكلاء
                - link [ref=e298] [cursor=pointer]:
                  - /url: /search
                  - text: البحث
              - generic [ref=e299]:
                - generic [ref=e300]: الشركة
                - link [ref=e301] [cursor=pointer]:
                  - /url: /about
                  - text: من نحن
                - link [ref=e302] [cursor=pointer]:
                  - /url: /contact
                  - text: تواصل معنا
                - link [ref=e303] [cursor=pointer]:
                  - /url: /help
                  - text: مركز المساعدة
              - generic [ref=e304]:
                - generic [ref=e305]: قانوني
                - link [ref=e306] [cursor=pointer]:
                  - /url: /privacy
                  - text: سياسة الخصوصية
                - link [ref=e307] [cursor=pointer]:
                  - /url: /terms
                  - text: الشروط والأحكام
              - generic [ref=e308]:
                - generic [ref=e309]: الدعم
                - generic [ref=e310]:
                  - img [ref=e311]
                  - paragraph [ref=e313]: +966 50 000 0000
                - generic [ref=e314]:
                  - img [ref=e315]
                  - link [ref=e317] [cursor=pointer]:
                    - /url: mailto:hello@eawlma.sa
                    - text: hello@eawlma.sa
          - separator [ref=e318]
          - generic [ref=e319]:
            - paragraph [ref=e320]: © 2026 عَوْلَمَة — جميع الحقوق محفوظة.
            - generic [ref=e321]:
              - link [ref=e322] [cursor=pointer]:
                - /url: https://wa.me/966500000000
                - img [ref=e323]
              - link [ref=e325] [cursor=pointer]:
                - /url: https://twitter.com/eawlma
                - img [ref=e326]
              - link [ref=e328] [cursor=pointer]:
                - /url: https://facebook.com/eawlma
                - img [ref=e329]
              - link [ref=e331] [cursor=pointer]:
                - /url: https://instagram.com/eawlma
                - img [ref=e332]
              - link [ref=e334] [cursor=pointer]:
                - /url: https://linkedin.com/company/eawlma
                - img [ref=e335]
    - generic [ref=e337]:
      - img [ref=e339]
      - button [ref=e387] [cursor=pointer]:
        - img [ref=e388]
  - dialog [ref=e438]:
    - generic [ref=e439]:
      - button "close" [ref=e440] [cursor=pointer]:
        - img [ref=e441]
      - generic [ref=e443]: 1/3
      - heading "هل تريد الشراء أو الإيجار؟" [level=5] [ref=e444]
      - paragraph [ref=e445]: أخبرنا بما تبحث عنه لنعرض لك الإعلانات المناسبة.
    - generic [ref=e447]:
      - button "شراء" [ref=e448] [cursor=pointer]:
        - img [ref=e450]
        - text: شراء
      - button "إيجار" [ref=e452] [cursor=pointer]:
        - img [ref=e454]
        - text: إيجار
    - generic [ref=e456]:
      - button "تخطي" [ref=e457] [cursor=pointer]: تخطي
      - generic [ref=e458]:
        - button "التالي" [disabled]
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3010/api/v1';
  4  | 
  5  | /**
  6  |  * Cards navigate imperatively via `window.location.href` from a React click
  7  |  * handler. Playwright clicks on the inner image don't always fire that
  8  |  * handler reliably (overlay layers, hit-test ambiguity). Bypass by fetching
  9  |  * a real listing id from the public search API and navigating directly.
  10 |  */
  11 | async function gotoFirstListing(page: Page): Promise<boolean> {
  12 |   const res = await page.request.get(`${API_BASE}/search/listings?limit=1`);
  13 |   if (!res.ok()) return false;
  14 |   const body = (await res.json()) as { data?: { data?: Array<{ id: string }> } };
  15 |   const id = body.data?.data?.[0]?.id;
  16 |   if (!id) return false;
  17 |   await page.goto(`/listings/${id}`);
  18 |   return true;
  19 | }
  20 | 
  21 | test.describe('Listings', () => {
  22 |   test('search page loads and surfaces results (cards or empty-state)', async ({ page }) => {
  23 |     await page.goto('/search');
  24 |     await page.waitForLoadState('networkidle');
  25 |     // The dev server can stall the search API under repeated test load. Treat
  26 |     // success as: cards rendered OR the empty-state UI shown OR a usable
  27 |     // filter input present. The point is the page didn't hard-error.
  28 |     const ready = await Promise.race([
  29 |       page
  30 |         .locator('[data-card-root]')
  31 |         .first()
  32 |         .waitFor({ state: 'visible', timeout: 25_000 })
  33 |         .then(() => 'cards' as const)
  34 |         .catch(() => null),
  35 |       page
  36 |         .locator('text=/no.*results|no.*listings|لا توجد/i')
  37 |         .first()
  38 |         .waitFor({ state: 'visible', timeout: 25_000 })
  39 |         .then(() => 'empty' as const)
  40 |         .catch(() => null),
  41 |       page
  42 |         .locator('input')
  43 |         .first()
  44 |         .waitFor({ state: 'visible', timeout: 25_000 })
  45 |         .then(() => 'filters' as const)
  46 |         .catch(() => null),
  47 |     ]);
  48 |     expect(ready).not.toBeNull();
  49 |   });
  50 | 
  51 |   test('open a listing detail page directly via API-discovered id', async ({ page }) => {
  52 |     const ok = await gotoFirstListing(page);
  53 |     if (!ok) {
  54 |       test.skip(true, 'No active listings available from the public search API.');
  55 |       return;
  56 |     }
  57 |     await page.waitForLoadState('networkidle');
  58 |     await expect(page.locator('text=SAR').first()).toBeVisible({ timeout: 5_000 });
  59 |   });
  60 | 
  61 |   test('photo gallery opens, navigates, and closes', async ({ page }) => {
  62 |     const ok = await gotoFirstListing(page);
  63 |     if (!ok) {
  64 |       test.skip(true, 'No active listings available.');
  65 |       return;
  66 |     }
  67 |     await page.waitForLoadState('networkidle');
  68 | 
  69 |     const galleryBtn = page
  70 |       .locator('button')
  71 |       .filter({ hasText: /photo|صور/i })
  72 |       .first();
  73 |     if (!(await galleryBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
  74 |       test.skip(true, 'Listing has no "Show all photos" CTA.');
  75 |       return;
  76 |     }
> 77 |     await galleryBtn.click();
     |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  78 |     await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  79 |     await page.keyboard.press('Escape');
  80 |     await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  81 |   });
  82 | });
  83 | 
```