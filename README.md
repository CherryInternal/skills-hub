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

- `/` — public skill marketplace (browse, search, download)
- `/admin` — admin console (upload, edit, publish curated skills)

Public REST API (read-only, no auth, only published skills; IP rate-limited 120/min):

- `GET /api/skills` — list skills. Query params: `q` (keyword over EN/ZH name &
  description, author, tags), `domain`, `sort` (`popular`|`newest`|`name_asc`),
  `limit` (1–100, default 20), `offset` (default 0). Returns
  `{ items, pagination: { total, limit, offset, hasMore } }`. List items omit
  `longDescription` to stay light.
- `GET /api/skills/:id` — a single skill, full info incl. `longDescription`.
- `GET /api/skills/:id/download` — 302 → presigned package URL (counts a download).

## 本地数据初始化

1. 起依赖:`docker compose up -d db rustfs`
2. 同步 schema 到数据库:`pnpm db:push`(开发阶段不维护迁移历史)
3. 灌演示数据(会把 demo 包上传到 RustFS):`pnpm exec tsx prisma/seed.ts`

> seed 依赖 RustFS 在跑(它会上传 `prisma/demo-packages/*` 的 zip)。

> **Status:** the data layer is currently mock (localStorage + static arrays).
> The real backend (Prisma + tRPC) and admin auth are in progress.
