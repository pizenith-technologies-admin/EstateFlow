# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# One-shot schema sync (same layers as base; run before backend)
FROM base AS migrator
CMD ["npx", "drizzle-kit", "push"]

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=base /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
