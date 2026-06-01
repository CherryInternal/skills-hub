# CherryIN Skills Marketplace

A self-hosted marketplace for curated AI agent skills — browse, install, and
manage skills for Claude Code, Cursor, Codex, and other agents.

Built with the [T3 Stack](https://create.t3.gg/): Next.js · tRPC · Prisma · Tailwind.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Key routes:

- `/skills_marketplace` — public skill discovery & install
- `/admin/skills` — admin console (curated catalog, review queue, listings)
- `/api/marketplace/listings` — public listings API

> **Status:** the data layer is currently mock (localStorage + static arrays).
> The real backend (Prisma + tRPC) and admin auth are in progress.
