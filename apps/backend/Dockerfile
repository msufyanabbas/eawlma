# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Eawlma Backend — multi-stage build
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
RUN npm run build -w @eawlma/shared-types
RUN npm run build -w @eawlma/backend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S eawlma && adduser -S eawlma -G eawlma
COPY --from=build --chown=eawlma:eawlma /repo/apps/backend/dist ./dist
COPY --from=build --chown=eawlma:eawlma /repo/apps/backend/package.json ./package.json
COPY --from=build --chown=eawlma:eawlma /repo/apps/backend/node_modules ./node_modules
COPY --from=build --chown=eawlma:eawlma /repo/packages/shared-types ./node_modules/@eawlma/shared-types
USER eawlma
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://192.168.1.125:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
