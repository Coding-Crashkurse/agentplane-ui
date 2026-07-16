# Build stage: the image contains zero environment-specific values (SPEC §3, §8).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# The dev mock config must not ship in the image: config.json is injected at runtime.
RUN rm -f dist/config.json

# Serve stage: static build behind Caddy with SPA fallback.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# /srv/config.json is provided at runtime: bind mount (compose) or ConfigMap (k8s).
EXPOSE 80
