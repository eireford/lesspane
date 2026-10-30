# ---- Build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
# Commit package-lock.json after your first `npm install` so builds are reproducible.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Run ----
FROM node:22-slim
WORKDIR /app
# Cloud Run terminates TLS; PROTOCOL_HEADER lets SvelteKit see the real https origin
# (needed for its form-action CSRF check).
ENV NODE_ENV=production \
    PORT=8080 \
    PROTOCOL_HEADER=x-forwarded-proto
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
USER node
EXPOSE 8080
CMD ["node", "build"]
