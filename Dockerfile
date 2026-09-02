# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps – install locked dependencies without running the postinstall script
# (prisma generate needs prisma/schema.prisma, which is copied in the next stage)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# build – generate the Prisma client (driver adapter, no query engine binary)
# and produce the Next.js standalone output
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time DATABASE_URL is passed via ARG (host-reachable endpoint, see
# compose/README). It is scoped to THIS stage only — the runner stage below is
# built with no ENV at all, so the runtime image never contains credentials.
# Only the local Postgres password (already published in docker-compose.yml)
# reaches build metadata; real secrets (Brevo, NEXTAUTH_SECRET) are runtime-only
# via the gitignored .env.production. generateStaticParams pre-renders blog
# posts / user pages from the DB during `next build`, mirroring local builds.
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# runner – minimal image containing the standalone server + static assets
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p uploads \
    && chown -R nextjs:nodejs /app

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Generated Prisma client (traced deps point at it; copied explicitly so the
# runtime never needs the build stage).
COPY --from=build --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]