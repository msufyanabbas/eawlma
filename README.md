# Aqarat — Saudi Real Estate Platform

Enterprise-grade real estate platform for the Saudi Arabian market, built for future GCC and global expansion.

## Architecture

```
                      ┌─────────────────────────────┐
                      │         End Users           │
                      │  (Web · Mobile-responsive)  │
                      └──────────────┬──────────────┘
                                     │ HTTPS
                  ┌──────────────────┴──────────────────┐
                  │                                     │
                  ▼                                     ▼
         ┌─────────────────┐                  ┌─────────────────┐
         │   Frontend      │  WebSocket       │   Frontend      │
         │  React + Vite   │  (Socket.IO)     │  Static Assets  │
         │   MUI + TW      │ ◀────────────▶   │  (Nginx/CDN)    │
         └────────┬────────┘                  └─────────────────┘
                  │ REST + WS
                  ▼
         ┌─────────────────────────────────────────────────────┐
         │                  Backend (NestJS)                    │
         │ ┌──────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌───────┐│
         │ │ Auth │ │Users │ │ Listings │ │Search  │ │Messag.││
         │ └──────┘ └──────┘ └──────────┘ └────────┘ └───────┘│
         │ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐│
         │ │Inquiries│ │Notifs   │ │Analytics │ │Payments    ││
         │ └─────────┘ └─────────┘ └──────────┘ └────────────┘│
         │ ┌──────────────┐ ┌──────────┐  ┌────────────────┐  │
         │ │ Moderation   │ │  Admin   │  │  AI (OpenAI)   │  │
         │ └──────────────┘ └──────────┘  └────────────────┘  │
         └────┬─────────────┬──────────────┬───────────────┬──┘
              │             │              │               │
              ▼             ▼              ▼               ▼
        ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌────────────┐
        │PostgreSQL│  │  Redis   │   │  Kafka   │   │External    │
        │ (TypeORM)│  │ (cache · │   │ (events) │   │APIs:       │
        │          │  │  queues) │   │          │   │ Moyasar    │
        └──────────┘  └──────────┘   └──────────┘   │ Authentica │
                                                    │ Google Maps│
                                                    │ AWS SES    │
                                                    │ OpenAI     │
                                                    └────────────┘
```

## Project Layout

```
/
├── apps/
│   ├── frontend/              React 18 + Vite + TS + MUI + Tailwind
│   └── backend/               NestJS + TS + TypeORM
├── packages/
│   └── shared-types/          DTOs/types shared between FE/BE
├── docker-compose.yml         Postgres, Redis, Kafka, EMQX
├── .env.example
└── README.md
```

## Tech Stack

**Frontend:** React 18 · TypeScript · Vite · MUI v5 · Tailwind CSS · TanStack Query v5 · TanStack Router · Zustand · React Hook Form + Zod · Socket.IO client · @react-google-maps/api · i18next · Framer Motion · Axios · Moyasar.js

**Backend:** NestJS · TypeScript · PostgreSQL (TypeORM) · Redis (ioredis) · Kafka (KafkaJS) · Socket.IO · BullMQ · Passport (JWT + refresh rotation) · OpenAI SDK · AWS SES · Authentica.sa · Moyasar · Google Maps · Swagger · Winston

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker Desktop ≥ 4.x
- A populated `.env` (copy from `.env.example`)

### 1. Bring up infrastructure

```bash
cp .env.example .env
docker-compose up -d
```

This starts: PostgreSQL (`localhost:5532`), Redis (`localhost:6479`), Kafka (`localhost:9094` for host clients), Kafka-UI (`localhost:8095`). EMQX is in the optional `iot` profile (`docker compose --profile iot up -d`).

The host-side ports are deliberately non-standard so this stack coexists with other local Postgres/Redis/Kafka instances without clashing.

### 2. Install dependencies

```bash
npm install
npm run build:types
```

### 3. Run backend

```bash
cd apps/backend
cp ../../.env.example .env       # then fill in secrets
npm run migration:run            # apply DB migrations
npm run start:dev                # http://localhost:3000
```

API docs: <http://localhost:3000/api/docs>

### 4. Run frontend

```bash
cd apps/frontend
cp ../../.env.example .env       # frontend uses only VITE_* vars
npm run dev                      # http://localhost:5173
```

## Environment Variables

See [.env.example](./.env.example) for the full list. Key groups:

| Group | Variables |
|---|---|
| **App** | `NODE_ENV`, `APP_URL`, `API_URL` |
| **Backend** | `BACKEND_PORT`, `JWT_*`, `THROTTLE_*` |
| **Postgres** | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_SSL` |
| **Redis** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` |
| **Kafka** | `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID` |
| **AWS / SES** | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`, `SES_REPLY_TO` |
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| **Authentica** | `AUTHENTICA_API_KEY`, `AUTHENTICA_BASE_URL` |
| **Moyasar** | `MOYASAR_SECRET_KEY`, `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_WEBHOOK_SECRET` |
| **Google Maps** | `GOOGLE_MAPS_API_KEY`, `GOOGLE_GEOCODING_API_KEY` |
| **Frontend** | `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_MOYASAR_PUBLISHABLE_KEY`, `VITE_DEFAULT_LOCALE`, `VITE_SUPPORTED_LOCALES` |

## API Overview

Auto-generated Swagger UI lives at `/api/docs` once the backend is running.

| Domain | Base path | Notes |
|---|---|---|
| Auth | `/api/v1/auth` | Register, login, refresh, OTP, identity verification |
| Users | `/api/v1/users` | Profile, preferences, saved listings |
| Listings | `/api/v1/listings` | CRUD, media, translations |
| Search | `/api/v1/search` | Filters, geo, full-text |
| Inquiries | `/api/v1/inquiries` | Lead capture |
| Messages | `/api/v1/messages` | Conversations |
| Notifications | `/api/v1/notifications` | List, mark read |
| Analytics | `/api/v1/analytics` | Listing impressions, agent dashboard |
| Payments | `/api/v1/payments` | Featured listings, subscriptions (Moyasar) |
| Moderation | `/api/v1/moderation` | Listing review queue |
| Admin | `/api/v1/admin` | Operator-only endpoints |

## Deployment (VPS + Docker + Nginx)

Outline — full hardening guide will be added once the platform is feature-complete:

1. **Provision VPS** (Ubuntu 22.04 LTS, ≥ 4 GB RAM for app tier; managed Postgres/Redis recommended in production).
2. **Install Docker + Docker Compose** and clone the repo.
3. **Place secrets** in `/etc/aqarat/.env` (chmod 600). Reference from `docker-compose.prod.yml`.
4. **TLS termination** via Nginx + Let's Encrypt (`certbot`).
5. **Reverse proxy** Nginx → backend (`:3000`), serve frontend `dist/` directly.
6. **Process supervision** via Docker restart policies; tail logs to `journald` or a managed log sink.
7. **Backups**: nightly `pg_dump` + Redis RDB snapshots → S3.
8. **Monitoring**: Prometheus exporters + Grafana, or a managed APM.

## Build Status

This repository is being built incrementally. Current state:

- [x] Monorepo scaffolding + docker-compose
- [x] `shared-types` package (compiles clean)
- [x] Backend: config, common layer, Auth + Users modules (smoke-tested green: register / login / refresh / logout / me / RBAC; 4xx/409 paths verified)
- [x] Frontend: theme (RTL/LTR), layout, i18n (AR/EN), auth pages (`tsc --noEmit` and `vite build` clean)
- [x] Initial TypeORM migration generated and applied
- [x] Backend: **Listings** module — entities (listing/media/translation/amenity/tag), CRUD with RBAC + ownership, status transitions, reference codes (`AQR-YYYY-NNNNNN`), media + translation endpoints; smoke-tested green
- [x] Backend: **Search** module — `q` (FTS via Postgres `to_tsvector` + `plainto_tsquery`), 18 filters (type, property types, city, price/area/bed/bath ranges, furnishing, amenities, agency, agent, featured), bounding-box + radius (haversine) geo, 5 sort fields with featured-pinning; smoke-tested green
- [x] AddListings migration generated + applied (incl. `listings_reference_seq`, GIN FTS indexes)
- [x] Security fix: registration blocks self-promotion to admin/moderator/agency_admin
- [x] Backend: **Notifications** module (in-app, with channel/type enum); **Inquiries** module with status FSM (new → contacted → qualified → unqualified → closed) + side-effects fan-out: SES email to agent, SES confirmation to buyer, persistent in-app notification, Kafka `inquiry.created` event on `aqarat.listing.events`; **Messaging** module — Conversation + Message entities, REST endpoints, Socket.IO gateway on `/messaging` with JWT-handshake middleware, Redis adapter for horizontal scaling, per-conversation unread counter via Redis, presence/typing/read receipts; smoke-tested green
- [x] Shared infra: `RedisModule` (pub + sub + default ioredis clients), `EmailModule` (SES wrapper, no-op fallback when AWS creds absent), `KafkaModule` (KafkaJS producer with lazy connect, errors logged not thrown)
- [x] AddInquiriesAndMessaging migration applied (incl. GIN indexes on `participant_ids` and `read_by`)
- [x] Backend: **Audit** module (entity + diff-capturing TypeORM subscriber on `listings` + admin filtering + CSV streaming export); **Subscriptions** module (Plan reference table seeded with Free/Starter/Pro/Enterprise + Subscription FSM + per-plan listing-quota guard wired into `submitForReview`); **Payments** module (Moyasar HTTP client with dev-stub mode + HMAC webhook verification + payment FSM + side-effects: featured listing activation / subscription upgrade / notifications + on-the-fly PDF invoice via pdfkit); **Analytics** module (per-listing daily metrics with UPSERT + jsonb merge for sources/devices, KafkaJS consumer subscribed to `aqarat.listing.events` + `aqarat.analytics.events`, Redis-cached read endpoints (5-min TTL), agent-dashboard summary, RBAC); **AsyncLocalStorage** request-context propagated to the audit subscriber; smoke-tested green
- [x] Wired `listing.viewed` (Listings module) + `search.performed` (Search module) Kafka publishers feeding the analytics consumer
- [x] AddAuditPaymentsAnalytics migration applied (audit_logs, plans, subscriptions, payments, listing_daily_metrics)
- [ ] Backend: Moderation queue, Admin operator endpoints
- [ ] Frontend: Home, Search, Listing detail, Agent dashboard, Admin panel

## License

Proprietary © Aqarat.
