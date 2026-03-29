# Expo static web export + nginx (browser talks to API on host:5000 by default)
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG EXPO_PUBLIC_API_URL=http://localhost:5000
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_NO_TELEMETRY=1
ENV CI=1

COPY package.json package-lock.json ./
# Align with local install (react 19 / react-native-web peer range)
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx expo export --platform web

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
