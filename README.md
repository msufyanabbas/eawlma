# eawlma — Saudi Real Estate Platform

Enterprise-grade real estate marketplace for Saudi Arabia, built with the GCC and global expansion in mind.

* **Frontend** — React 18 + TypeScript (Vite), MUI v5, Tailwind, TanStack Query / Router, Zustand, i18next (AR / EN with RTL), Framer Motion, Recharts, `<model-viewer>` for AR/3D, Google Maps, Socket.IO client.
* **Backend** — NestJS, TypeORM + PostgreSQL, Redis (ioredis + Socket.IO Redis adapter), Kafka (KafkaJS), JWT + refresh-rotation auth, AWS SES + S3, OpenAI (gpt-4o), Moyasar, Authentica.sa, BullMQ, Helmet + Throttler, Swagger.

---

## Architecture

```
                                    ┌────────────────────────┐
                                    │   End users (web +     │
                                    │   mobile-responsive)   │
                                    └───────────┬────────────┘
                                                │ HTTPS
                                                ▼
                                    ┌────────────────────────┐
                                    │   Nginx (port 80/443)  │
                                    │   reverse proxy + SPA  │
                                    └─────┬────────┬─────────┘
                                  /api    │        │   /  (static)
                                          ▼        ▼
                       ┌───────────────────────────┐  ┌──────────────────────┐
                       │  Backend (NestJS, :3000)  │  │  Frontend (Vite SPA  │
                       │                           │  │   built into nginx)  │
                       │  Auth · Users · Listings  │  └──────────────────────┘
                       │  Search · Inquiries       │
                       │  Messaging (Socket.IO)    │
                       │  Notifications · Payments │
                       │  Subscriptions · Admin    │
                       │  AI · Storage · Audit     │
                       │  Saved-listings · Agents  │
                       │  Authentica · Moderation  │
                       │  Analytics                │
                       └───┬────────┬────────┬─────┘
                           │        │        │
                           ▼        ▼        ▼
                     ┌─────────┐ ┌─────┐ ┌────────┐
                     │Postgres │ │Redis│ │ Kafka  │
                     │(TypeORM)│ │     │ │(KRaft) │
                     └─────────┘ └─────┘ └────────┘

                     External integrations (graceful stub fallbacks in dev):
                     ─────────────────────────────────────────────────────
                     · AWS SES         — transactional email
                     · AWS S3 + CDN    — media, AR models, avatars
                     · OpenAI gpt-4o   — translation, enhance, recommendations
                     · Moyasar         — payments + featured listings
                     · Authentica.sa   — identity verification (Saudi)
                     · Google Maps     — search map view + listing pins
```

---

## Project layout

```
eawlma/
├── apps/
│   ├── backend/                          NestJS API
│   │   ├── src/
│   │   │   ├── common/                   filters · interceptors · guards · context · email · kafka · redis
│   │   │   ├── config/                   ConfigModule schemas
│   │   │   ├── database/                 TypeORM datasource + migrations
│   │   │   └── modules/                  one folder per domain (auth, users, listings, search, …)
│   │   ├── test/                         smoke-test scripts (ws-smoke.mjs etc.)
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/                         React + Vite SPA
│       ├── src/
│       │   ├── api/                      Axios + per-module API hooks
│       │   ├── components/               Layout · auth · global atoms
│       │   ├── i18n/                     ar.json + en.json
│       │   ├── pages/                    one folder per section (auth/, dashboard/, admin/)
│       │   ├── store/                    Zustand slices
│       │   └── theme/                    MUI theme + RTL emotion cache
│       ├── nginx.conf
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared-types/                     DTOs + enums shared FE ↔ BE
├── docker-compose.yml                    Postgres · Redis · Kafka · (optional EMQX) · backend · frontend
├── .env.example                          Every env var documented + grouped
└── README.md
```

---

## Quick start (dev — one command)

```bash
cp .env.example .env                                 # fill JWT_*_SECRET (≥ 32 chars each)
docker compose up -d postgres redis kafka kafka-ui   # infra
npm install
npm run build:types
cd apps/backend && npm run migration:run             # apply migrations
cd ../..
npm run dev:backend                                  # http://localhost:3000
npm run dev:frontend                                 # http://localhost:5173
```

* Swagger UI — <http://localhost:3000/api/docs>
* Kafka UI — <http://localhost:8095>
* Postgres — `localhost:5532` (user / pwd / db = `eawlma`)
* Redis — `localhost:6479`
* Kafka external listener — `localhost:9094`

> Host ports are intentionally non-standard so this stack coexists with other local Postgres / Redis / Kafka.

### Production-shaped (full stack inside Docker)

```bash
cp .env.example .env
# Fill in real secrets — at minimum JWT_*_SECRET, AWS_*, OPENAI_API_KEY,
# MOYASAR_*, GOOGLE_MAPS_API_KEY, AUTHENTICA_*
docker compose --profile app up -d --build
```

* Frontend served at **<http://localhost:8088>** (nginx proxies `/api` → backend, `/socket.io` → backend)
* Backend exposed at `localhost:3000` for direct testing

---

## Environment variables

Full reference in [`.env.example`](./.env.example). Headlines:

| Group | Key vars |
|---|---|
| **App** | `NODE_ENV` · `APP_URL` · `API_URL` · `CORS_ORIGINS` · `DEFAULT_LOCALE` · `SUPPORTED_LOCALES` |
| **Backend** | `BACKEND_PORT` · `API_PREFIX` · `THROTTLE_TTL` · `THROTTLE_LIMIT` |
| **JWT** *(required)* | `JWT_ACCESS_SECRET` · `JWT_REFRESH_SECRET` · `JWT_ACCESS_EXPIRES_IN` · `JWT_REFRESH_EXPIRES_IN` · `JWT_ISSUER` · `JWT_AUDIENCE` |
| **Postgres** | `POSTGRES_HOST` · `POSTGRES_PORT` · `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` · `POSTGRES_SSL` · `PG_POOL_MAX` · `TYPEORM_LOGGING` |
| **Redis** | `REDIS_HOST` · `REDIS_PORT` · `REDIS_PASSWORD` · `REDIS_DB` · `REDIS_KEY_PREFIX` |
| **Kafka** | `KAFKA_BROKERS` · `KAFKA_CLIENT_ID` · `KAFKA_GROUP_ID` · `KAFKA_TOPIC_*` |
| **AWS** | `AWS_REGION` · `AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` |
| **AWS / SES** | `SES_FROM_EMAIL` · `SES_REPLY_TO` |
| **AWS / S3 + CDN** | `S3_BUCKET` · `S3_REGION` · `S3_PRESIGN_EXPIRES_SECONDS` · `CLOUDFRONT_URL` |
| **OpenAI** | `OPENAI_API_KEY` · `OPENAI_MODEL` · `OPENAI_MAX_TOKENS` |
| **Authentica.sa** | `AUTHENTICA_API_KEY` · `AUTHENTICA_BASE_URL` · `AUTHENTICA_WEBHOOK_SECRET` |
| **Moyasar** | `MOYASAR_SECRET_KEY` · `MOYASAR_PUBLISHABLE_KEY` · `MOYASAR_WEBHOOK_SECRET` · `MOYASAR_API_URL` |
| **Google Maps** | `GOOGLE_MAPS_API_KEY` · `GOOGLE_GEOCODING_API_KEY` |
| **Frontend (Vite — `VITE_*`)** | `VITE_API_URL` · `VITE_SOCKET_URL` · `VITE_GOOGLE_MAPS_API_KEY` · `VITE_MOYASAR_PUBLISHABLE_KEY` · `VITE_DEFAULT_LOCALE` · `VITE_SUPPORTED_LOCALES` |

### Graceful dev-stub fallbacks

Every external integration silently degrades to a deterministic stub when its credentials are missing — the rest of the app keeps working in dev without any code changes.

| Integration | Behaviour with missing creds |
|---|---|
| **AWS SES** | `EmailService` logs the email body to stdout instead of sending |
| **AWS S3** | `StorageService` returns `https://dev-stub.local/<key>` URLs; uploads short-circuit |
| **OpenAI** | `OpenAiService` returns deterministic `[stub:purpose]` strings; translation pipeline still writes rows |
| **Moyasar** | `MoyasarClient.createPayment` returns `{ id: "dev_<rand>", status: "initiated" }` |
| **Authentica.sa** | `/auth/authentica/init` returns `{ verificationId: "dev_<uuid>", live: false }`; user's `identityVerificationStatus` is set to `pending` |
| **Google Maps** (no API key) | Search-page Map view + listing-detail map render an "API key not configured" placeholder |

To switch to live mode in any of these, just set the relevant env var(s) and restart — no code change.

---

## API overview

Auto-generated Swagger UI at `/api/docs` once the backend is running.

| Domain | Base path | Notable endpoints |
|---|---|---|
| **Auth** | `/api/v1/auth` | `register` · `login` · `refresh` · `logout` · `logout-all` · `change-password` · `authentica/init` · `authentica/callback` |
| **Users** | `/api/v1/users` | `me` (GET / PATCH) · admin list / role / status |
| **Agents** *(public)* | `/api/v1/agents` | `:id` (profile, no email/phone) · `:id/listings` · `:id/reviews` |
| **Listings** | `/api/v1/listings` | CRUD · `mine` · `submit` · `archive` · media + reorder · translations · amenities + tags · `save` / `unsave` |
| **Saved** | `/api/v1/users/me/saved-listings` | `mine` · `mine/ids` |
| **Search** | `/api/v1/search/listings` | full-text + 18 filters + bbox / radius + 5 sort modes |
| **Inquiries** | `/api/v1/inquiries` | public create · `mine` (agent) · `sent` · `:id` · status FSM |
| **Messages** | `/api/v1/conversations` | list · `unread-total` · create · messages · send · `read` · WebSocket on `/messaging` |
| **Notifications** | `/api/v1/notifications` | list · `unread-count` · `read` · `read-all` |
| **Analytics** | `/api/v1/analytics` | listing views / funnel / sources / devices · `agent-dashboard` |
| **Subscriptions** | `/api/v1/subscriptions` | `plans` (public) · `me` · `cancel` |
| **Payments** | `/api/v1/payments` | `featured-listing` · `subscriptions` · `mine` · `:id/invoice` · `webhook` |
| **AI** | `/api/v1/ai` | `enhance-description` · `recommendations` · `translate-listing/:id` |
| **Storage** | `/api/v1/storage` | `presigned-url` · `object` (DELETE) |
| **Admin** | `/api/v1/admin` | `listings/pending` · approve / reject · `users` (filterable) · role / suspend / reactivate · `audit` · `audit/export.csv` |
| **Health** | `/api/v1/health` | DB readiness probe |

Auto-emitted Kafka events:

| Topic | Events |
|---|---|
| `eawlma.listing.events` | `listing.viewed` · `listing.published` · `listing.updated` · `inquiry.created` |
| `eawlma.analytics.events` | `search.performed` |

Consumers: AI translation pipeline (`listing.published`, `listing.updated`), analytics aggregator (`listing.viewed`, `inquiry.created`, `search.performed`).

---

## Production deployment guide (VPS + Docker + Nginx)

1. **Provision** a VPS (Ubuntu 22.04 LTS, ≥ 4 GB RAM). Managed Postgres + Redis are recommended for production traffic; the bundled containers are fine for staging.
2. **Install Docker + Docker Compose**, clone this repo.
3. **Place secrets** in `/etc/eawlma/.env` (chmod 600) and reference it from your systemd unit / docker-compose override.
4. **DNS + TLS**: point your domain at the VPS, run `certbot --nginx` against the host nginx (or use a sidecar like `caddy` / `traefik`) and terminate TLS in front of the `frontend` container.
5. **Migrations**: run inside the backend container — `docker compose exec backend npm run migration:run`.
6. **Boot**: `docker compose --profile app up -d --build`. Health checks gate startup; the backend waits on Postgres + Redis to be `healthy`.
7. **Backups**: nightly `pg_dump` + Redis RDB snapshots → S3.
8. **Observability**: drop in Prometheus exporters + Grafana, or attach a managed APM (Sentry, Datadog).
9. **CI**: each PR should run `npm run build:types`, `tsc --noEmit` for both apps, `npx vite build`, and apply migrations against an ephemeral Postgres before tagging an image.

---

## Build status — implemented modules

### Backend

- ✅ Foundation — monorepo + docker-compose + Joi-validated config + base common layer (filters, interceptors, decorators, guards, base entity, request-context via AsyncLocalStorage)
- ✅ Auth — JWT + refresh-rotation w/ family revocation on reuse, Argon2id passwords, email/phone uniqueness via partial unique indexes, login-throttling lockout, Authentica.sa verification flow
- ✅ Users — profile CRUD, soft-delete, public agent profile (`/agents/:id` + listings + reviews stub)
- ✅ Listings — entities, media, translations, amenity/tag taxonomies, status FSM, `EAW-YYYY-NNNNNN` reference codes, RBAC + ownership
- ✅ Search — Postgres FTS (`tsvector` + `plainto_tsquery`), 18 filters, bounding-box + haversine radius, 5 sort modes, featured-pinning
- ✅ Saved listings — server-backed favorites with idempotent save/unsave + saveCount denormalisation
- ✅ Inquiries — anonymous + authenticated, status FSM, fan-out to SES email + in-app notification + Kafka event
- ✅ Messaging — REST + Socket.IO `/messaging` namespace with JWT-handshake middleware, Redis adapter, per-conversation unread counters, presence/typing/read receipts
- ✅ Notifications — in-app entity + channel/type enum + `mark-read` / `read-all`
- ✅ Audit — entity + diff-capturing TypeORM subscriber on listings + admin filtering + CSV streaming export
- ✅ Subscriptions — Plan reference table (Free / Starter / Pro / Enterprise) + Subscription FSM + per-plan listing-quota guard
- ✅ Payments — Moyasar HTTP client + HMAC webhook + side-effects (featured activation, subscription upgrade, notifications) + on-the-fly PDF invoice (pdfkit)
- ✅ Analytics — daily metrics with UPSERT + jsonb merge for sources/devices, KafkaJS consumer subscribed to listing + analytics topics, Redis-cached read endpoints (5-min TTL)
- ✅ AI — `OpenAiService` (gpt-4o, exp-backoff retry, stub fallback), batched 30-locale translation, SEO description enhance, recommendation scoring, auto-translation Kafka pipeline
- ✅ Storage — presigned PUT URLs (S3) + size + MIME whitelist + traversal-safe DELETE + CDN URL construction
- ✅ Moderation/Admin — pending queue + approve/reject (with reason + email + notification) + user role/suspend/reactivate + self-protection guards

### Frontend

- ✅ Theme + RTL/LTR emotion cache + dark mode + locale-aware font stack
- ✅ i18n (AR/EN) with persistent toggle and body-direction flip
- ✅ Public marketing — Home (hero crossfade + glass search + framer-motion sections + city spotlight + agent carousel + animated stats), Search (sticky filters + Grid/List/Map + infinite scroll + Google Maps clusterer + URL-deep-linkable filters), Listing detail (image lightbox + VR/AR section with `<model-viewer>` + 30-language switcher + sticky inquiry sidebar w/ confetti success state + agent card), Agent profile, Saved properties (server-backed)
- ✅ Auth — `/auth/login`, `/auth/register`, `/auth/verify` (OTP), `/auth/forgot-password` with shared brand-gradient `AuthLayout`
- ✅ Agent dashboard — Home (KPIs + Recharts charts + recent inquiries + attention list), My Listings (table/grid + bulk actions), 6-step Listing Wizard (basic / location with Google Maps pin picker + reverse geocode / media drag-upload + reorder / amenities / compliance / review w/ AI enhance), Listing Analytics (4 chart types), Inquiries (table + right-drawer with status FSM + auto-save notes), Subscription, Settings (profile + Authentica verification + password + danger zone)
- ✅ Messaging UI (`/dashboard/messages`) — WhatsApp-style two-pane with Socket.IO live updates, typing indicator, single/double check read receipts, image attachments, mobile back-button
- ✅ Notifications — full list + `NotificationToaster` Snackbar polling for new arrivals
- ✅ Admin — Dashboard (platform KPIs + activity feed), Moderation (FIFO queue + slide-in preview drawer with embedded `<model-viewer>` + Google Maps + bulk approve / reject-with-reason), Users (filterable + row-actions), Audit (filterable + expandable diff rows + CSV export)
- ✅ Global — `<ErrorBoundary>` wrapping the route tree, `<NotificationToaster>` Snackbar, `<SavedListingsHydrator>` (server-syncs favorites on auth), `<ConfirmDialog>`, `<ListingCard>` w/ optimistic favorite toggle, `<SkeletonCard>`, `<EmptyState>`, `<PageHeader>`

### Known TODOs / limitations

| Area | Note |
|---|---|
| **Authentica.sa** | The exact request/response shape isn't documented in this repo — the client makes reasonable assumptions and falls back to a deterministic stub when `AUTHENTICA_API_KEY` isn't set. Update `apps/backend/src/modules/auth/authentica.client.ts` once you have the merchant onboarding kit. |
| **Agent reviews** | `/agents/:id/reviews` returns an empty payload. A full Reviews module (entity + rating distribution + verified-purchase badge) is on the roadmap. |
| **Forgot password** | Frontend page sends to a stub; backend `/auth/forgot-password` endpoint pending. |
| **OAuth providers** | Login page has a placeholder Google button; no OAuth client wired yet. |
| **Account deletion** | Frontend "Delete account" button clears the local session as a stand-in — backend `DELETE /users/me` is a follow-up. |
| **Notification realtime** | `NotificationToaster` polls every 20s. The Socket.IO `/messaging` namespace doesn't currently emit `notification:created`; once the backend adds that, swap to a socket listener (the polling becomes a long-window safety net). |
| **Analytics admin endpoint** | `/admin` derives platform KPIs from `users` + `pendingListings` + `audit` queries. A dedicated `/admin/metrics` endpoint would simplify this. |
| **Inquiry → Message conversion** | "Reply via Message" CTA in the inquiry drawer routes to `/messages` but doesn't auto-create a conversation seeded from the inquiry — that flow is a small follow-up. |
| **CSV export auth** | `/admin/audit/export.csv` accepts an `access_token` query param as a dev-mode convenience. Production should use a short-lived signed download URL instead. |

---

## License

Proprietary © eawlma.
