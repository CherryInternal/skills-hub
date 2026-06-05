# syntax=docker/dockerfile:1

# node:20-slim (debian) keeps Prisma's engine happy (alpine/musl needs extra
# fiddling). openssl is required by the Prisma query engine.
FROM node:20-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: skip postinstall (prisma generate) here; no schema yet.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
# This stage also serves as the one-shot `migrate` service in compose: it has
# the Prisma CLI + schema, so `prisma db push` never needs to live in the slim
# runtime image.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN pnpm exec prisma generate && pnpm build

# ---- runner: Next standalone (slim) ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# standalone bundles only the traced runtime deps + a server.js entrypoint.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Belt-and-suspenders: explicitly bring the things nft can miss —
# next-intl messages (runtime-read) and the Prisma client + query engine
# (native binary at the custom generated/ path).
COPY --from=build /app/messages ./messages
COPY --from=build /app/generated ./generated
EXPOSE 3000
CMD ["node", "server.js"]
