# Eawlma Platform Review Guide

A guided walkthrough of every screen so reviewers can verify the rebrand,
redesign, and core flows end-to-end. Pages are listed in the order you'd
naturally exercise them.

---

## Test Accounts

| Role  | Email                   | Password    |
| ----- | ----------------------- | ----------- |
| Admin | `admin@eawlma.sa`       | `Admin123!` |
| Agent | `agent1@eawlma.sa`–`agent6@eawlma.sa` | `Agent123!` |
| Buyer | _register a new account on `/register`_ |             |

> All seeded agents share the password `Agent123!`. Agent names follow real
> Saudi naming (Mohammed Al-Otaibi, Faisal Al-Shammari, Abdullah Al-Qahtani,
> Sara Al-Maliki, Khalid Al-Dosari, Noura Al-Subaie). Sign in as any to view
> their listings in `/dashboard`.

---

## Pages to Review (in order)

### Public Pages

#### 1. `/` — Homepage
- Full-screen hero with luxury villa image loads
- Search bar is **clickable** (no glass overlay swallowing pointer events)
- Three input fields: keyword, min price, max price + lavender CTA
- Buy / Rent / Commercial tabs switch the search type
- City quick-chips below hero navigate to `/search?city=X`
- Stats strip (4 columns, large h3 numbers) reveals on scroll
- Featured listings render in a 4-column grid with property-type-correct
  Unsplash images
- "Popular cities" section uses real photos (Riyadh skyline, Jeddah Al-Balad,
  Dammam waterfront, Mecca, Medina) and shows live listing counts per city
- Featured agents render as **clickable cards** that navigate to `/agents/:id`
- Footer shows brand tagline, link columns, WhatsApp `+966` placeholder

#### 2. `/search` — Search & Discovery
- **No duplicate search bar** at the top (navbar handles search)
- Left sidebar (280px) with collapsible sections
- Property-type filter uses **checkboxes** (not chips)
- Price section has both a slider **and** Min / Max number inputs
- Sidebar has a sticky "Apply filters" lavender CTA at the bottom
- "Clear filters" link top-right of the sidebar header
- View toggle works: grid / list / map
  - **Grid view**: 3 columns, lavender-tinted shadow on hover
  - **List view**: full-width row cards, 200px image left + content right
  - **Map view**: custom lavender pill markers showing the price; gold marker
    when selected; clicking opens a mini popup card with image + "View details"
- Results refetch on filter change

#### 3. `/listings/:id` — Listing Detail
- **Airbnb-style gallery**: 60% main image + 4 smaller thumbs on the right
  (or full-width single image with subtle gradient if no media)
- "Show all photos" overlay button bottom-end opens the lightbox
- Inquiry sidebar is **sticky** at `top: 24px` with a lavender accent border
- "Send inquiry" button uses the lavender gradient
- VR/AR section: white-bold **"Enter VR Tour"** button on a translucent panel
  - Click without a tour URL → Snackbar: *"No virtual tour available…"*
  - "View in AR" without WebXR support → Snackbar: *"AR is not supported…"*
- Agent card "Messages" CTA is auth-gated (see #4)
- "Similar listings" — 3 cards in a row with stagger reveal animation

#### 4. `/agents/:id` — Agent Profile
- Lavender→gold cover gradient
- Avatar shows real **2-letter initials** (e.g. "MA" for Mohammed Al-Otaibi)
  pulled from the actual `/agents/:id` payload
- Display name is the agent's real name (Arabic + English)
- Stats row: total listings • member-since year • response rate • rating
- Listings grid filtered to that agent's properties
- "Reviews" empty-state placeholder (reviews module not yet shipped)
- **Messages button** → `/messages` if logged in, else `/login?returnTo=…`

#### 5. `/saved` — Saved Properties
- Empty state when no listings saved
- Heart icon on listing cards (anywhere) toggles saved state via Zustand
- Saved listings appear in the list

### Auth Flow

#### 6. `/auth/register`
- Two-pane layout — heritage palace photo on the inline-start side with
  glass stats bar at the bottom
- Form validation: required fields, email format, phone, password strength
- Role selector: Property seeker / Real estate agent

#### 7. `/auth/login`
- Same two-pane layout
- Login with `agent1@eawlma.sa` / `Agent123!` → redirects to `/dashboard`

### Agent Dashboard (signed in as agent)

#### 8. `/dashboard` — Overview
- KPI cards (total listings, views, inquiries, etc.)
- Recharts visualisations render

#### 9. `/dashboard/listings`
- Sortable, filterable listings table
- Status chip per row

#### 10. `/dashboard/listings/new`
- 6-step wizard: Type & price → Location → Details → Amenities → Media → Publish
- Image upload works in dev mode (S3 stub serves files via Express static)
- Submit creates a listing visible in `/search`

#### 11. `/dashboard/inquiries`
- Lists inquiries received (after sending one from a listing detail page)

#### 12. `/dashboard/messages`
- Conversation list with another user
- Real-time updates via Socket.IO

#### 13. `/dashboard/subscription`
- Plan comparison table

#### 14. `/dashboard/settings`
- Profile form, identity-verification status, dangerous-zone account deletion

### Admin Panel (signed in as `admin@eawlma.sa`)

#### 15. `/admin` — Platform KPIs
- Total users, listings, MRR, etc.

#### 16. `/admin/moderation`
- Pending listings queue (approve / reject with reason)

#### 17. `/admin/users`
- User management table with role/status filters

#### 18. `/admin/audit`
- Audit log table with date + action filters

---

## Cross-Cutting Things to Verify

### Branding
- All visible "Eawlma" text is **capitalized** (header, footer, page titles,
  email subjects, OG meta, error boundary).
- Package names, env variables, Kafka topics, and the `theme.eawlma` API key
  remain lowercase by convention.

### Logo
- Navbar logo at 36px height — house silhouette with globe arc behind,
  lavender body, gold roof + 5-point star, white door/window cutouts.
- White logo variant on the auth-page hero side.

### Glass + Shadows
- Listing cards: `0 2px 8px rgba(108,99,166,0.08)` resting,
  `0 12px 32px rgba(108,99,166,0.18)` + 4px lift on hover.
- Navbar (when scrolled past hero): `rgba(255,255,255,0.92)` background with
  `blur(16px) saturate(180%)`, lavender hairline + soft shadow.
- Stats tiles: lavender-tinted glass background on home page.

### Scroll Animations
- Reveal fades trigger at 10% viewport intersection (Framer Motion `useInView`).
- Featured listings, city tiles and agent cards stagger.
- Listing detail body slides in from the inline-end; sidebar slides in from
  the inline-start; similar listings stagger.

### Internationalisation
- Switch language from the navbar globe icon → MUI direction flips, IBM Plex
  Sans Arabic activates, and all strings localised via i18next.
- `getListingTitle` / `getListingDescription` skip `[xx] ` machine-translation
  stubs and `??` mojibake fragments — never display garbled text.
- `getListingLocation` drops a corrupted `district` and falls back to `city`
  alone if needed.

---

## Known Limitations

- **Google Maps API key** is not pre-configured. The map view shows
  "Map preview unavailable" until you set `VITE_GOOGLE_MAPS_API_KEY` in
  `apps/frontend/.env.local` and reload. Custom lavender/gold pill markers
  require this.
- **VR / AR experiences** require the agent to upload a 360°/3D tour URL on
  their listing. With seeded data only, both buttons trigger the friendly
  Snackbar messages instead.
- **Email sending** (registration / password reset) requires AWS SES
  credentials in the backend `.env`. Without them the auth flows succeed at
  the API level but no message is delivered.
- **AI translation + AI search recommendations** require an OpenAI API key
  in the backend `.env`. The `[xx] …` placeholder strings appear in
  translations until that is set; the new `getListingTitle` helper hides
  those stubs from the UI automatically.
- **Featured-agents endpoint** isn't shipped yet, so the home-page agent
  strip is derived from owners of the most recently published listings.

---

Happy reviewing — please file findings under the **Eawlma rebrand** label.
