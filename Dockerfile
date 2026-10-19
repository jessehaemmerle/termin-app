# syntax=docker/dockerfile:1.7
# Mehrstufiges Image für Web-App (Next.js) und Worker. Läuft als Nicht-root-Benutzer.

# Debian-slim statt Alpine: vorkompilierte Binärpakete (argon2, sharp) brauchen glibc.
FROM node:22-bookworm-slim AS base
# OpenSSL für die Prisma-Engines (sonst Warnung "failed to detect the libssl/openssl version")
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Optional: zusätzliche CA für Firmen-Proxys beim Build, z. B.
#   docker build --secret id=extra_ca,src=/pfad/ca.crt .
# Das Zertifikat landet in keinem Image-Layer.

# Alle Abhängigkeiten (inkl. Entwicklung) für den Build
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci

# Nur Laufzeit-Abhängigkeiten
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --omit=dev \
 # SWC-Compiler wird nur beim Build benötigt (spart ~190 MB)
 && rm -rf node_modules/@next/swc-*

FROM deps AS build
COPY . .
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npx prisma generate && npx next build && npm run build:worker

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --no-create-home --shell /usr/sbin/nologin app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated
# Next.js schreibt zur Laufzeit in .next/cache
RUN mkdir -p .next/cache && chown -R app:app .next/cache
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/internal/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
