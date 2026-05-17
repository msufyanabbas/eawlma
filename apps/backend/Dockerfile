# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/backend/package.json apps/backend/
RUN npm install --workspaces --include-workspace-root --legacy-peer-deps

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
RUN npm run build -w @eawlma/shared-types
RUN npm run build -w @eawlma/backend

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S eawlma && adduser -S eawlma -G eawlma
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/packages ./packages
RUN apk add --no-cache dumb-init
USER eawlma
EXPOSE 3010
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]
