# ChainDepo GraphQL API, production image
# Build context is the repository root (shared package.json / package-lock.json):
#   docker build -f apps/chaindepo-api/Dockerfile -t chaindepo-api .
# Secrets are NOT baked in: pass them at runtime (docker compose env_file: .env).

# 1. all dependencies (needed for nest build)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. production dependencies only (webpack build keeps node_modules external)
FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 3. build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nest build chaindepo-api

# 4. runtime
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/dist/apps/chaindepo-api ./dist/apps/chaindepo-api
# upload targets used by the frontend; a fresh named volume mounted here copies these folders and their owner
RUN mkdir -p uploads/member uploads/shipment uploads/article && chown -R node:node uploads
USER node
EXPOSE 3007
CMD ["node", "dist/apps/chaindepo-api/main.js"]
