# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/frontend/package.json apps/frontend/
RUN npm install --workspaces --include-workspace-root --legacy-peer-deps

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/
ARG VITE_API_URL=/api/v1
ARG VITE_SOCKET_URL=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN printf "VITE_API_URL=%s\nVITE_SOCKET_URL=%s\n" "$VITE_API_URL" "$VITE_SOCKET_URL" > apps/frontend/.env.production
RUN npm run build -w @eawlma/shared-types
RUN npx --workspace @eawlma/frontend vite build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
