# Static build → Caddy. Used by Coolify's "Dockerfile" build pack.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# GITHUB_TOKEN is optional: without it the heatmap falls back to the public
# events API, and if GitHub is unreachable the empty state is rendered.
# It only exists in this build stage; the final Caddy image never contains it.
ARG GITHUB_TOKEN=""
RUN GITHUB_TOKEN="$GITHUB_TOKEN" npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
