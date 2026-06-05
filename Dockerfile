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
# --ignore-scripts: skip the `postinstall: prisma generate` here (no schema
# copied yet); the build stage runs prisma generate with the schema present.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env is validated/injected at runtime, not build time.
ENV SKIP_ENV_VALIDATION=1
RUN pnpm exec prisma generate && pnpm build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000
# First boot syncs the schema (we use `db push`, no migration history), then
# starts Next. db push is idempotent, so this is safe to run on every boot.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate && pnpm start"]
