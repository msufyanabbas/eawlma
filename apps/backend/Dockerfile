# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Aqarat Backend — multi-stage build
# -----------------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/backend/package.json apps/backend/
RUN npm install --workspaces --include-workspace-root

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend
RUN npm run build -w @aqarat/shared-types
RUN npm run build -w @aqarat/backend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S aqarat && adduser -S aqarat -G aqarat
COPY --from=build --chown=aqarat:aqarat /repo/apps/backend/dist ./dist
COPY --from=build --chown=aqarat:aqarat /repo/apps/backend/package.json ./package.json
COPY --from=build --chown=aqarat:aqarat /repo/apps/backend/node_modules ./node_modules
COPY --from=build --chown=aqarat:aqarat /repo/packages/shared-types ./node_modules/@aqarat/shared-types
USER aqarat
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
