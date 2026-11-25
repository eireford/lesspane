# ---- Build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Run ----
FROM node:22-slim
WORKDIR /app
# Chromium for the screenshot test in /admin/tests (src/lib/server/screenshots), with fonts for the page text.
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
# Cloud Run terminates TLS; PROTOCOL_HEADER lets SvelteKit see the real https origin
# (needed for its form-action CSRF check).
ENV NODE_ENV=production \
    PORT=8080 \
    PROTOCOL_HEADER=x-forwarded-proto \
    CHROME_PATH=/usr/bin/chromium
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# Writable spot for STORAGE=file when running the image locally (Cloud Run uses Firestore).
RUN mkdir -p .data && chown node:node .data
USER node
EXPOSE 8080
CMD ["node", "build"]
