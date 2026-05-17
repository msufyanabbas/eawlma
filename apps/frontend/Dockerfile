# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Eawlma Frontend — multi-stage build
# Builds the Vite bundle, then serves it from a tiny nginx:alpine image.
# -----------------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/frontend/package.json apps/frontend/
RUN npm install --workspaces --include-workspace-root

FROM node:20-alpine AS build
WORKDIR /repo
ARG VITE_API_URL=/
ARG VITE_SOCKET_URL=/
ARG VITE_GOOGLE_MAPS_API_KEY=
ARG VITE_MOYASAR_PUBLISHABLE_KEY=
ARG VITE_DEFAULT_LOCALE=ar
ARG VITE_SUPPORTED_LOCALES=ar,en
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_MOYASAR_PUBLISHABLE_KEY=$VITE_MOYASAR_PUBLISHABLE_KEY \
    VITE_DEFAULT_LOCALE=$VITE_DEFAULT_LOCALE \
    VITE_SUPPORTED_LOCALES=$VITE_SUPPORTED_LOCALES
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /repo/apps/frontend/node_modules ./apps/frontend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/frontend ./apps/frontend
RUN npm run build -w @eawlma/shared-types
RUN npx --workspace @eawlma/frontend vite build

FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://192.168.1.125/ > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
