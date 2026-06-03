# 内容托管(Content Hosting)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 CherryIN 从「指针式托管」升级为「内容托管」—— admin 上传 skill zip 到 RustFS 对象存储,前台/agent 通过稳定接口(302 重定向到预签名直链)下载。

**Architecture:** 元数据继续走 Postgres(现有),内容(zip)走 RustFS(S3 兼容);存储与限流做可替换抽象层。上传走 multipart Route Handler(后端中转、校验 SKILL.md);下载走稳定接口 `/api/skills/<id>/download`,后端只签发预签名 URL + 计数,302 重定向让客户端直连 RustFS(后端不经手文件)。

**Tech Stack:** Next.js 15 (App Router) · tRPC v11 · Prisma/Postgres · RustFS (S3) · `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` · `fflate`(zip 解析) · `vitest`(测试,本计划新引入)

**Spec:** `docs/superpowers/specs/2026-06-03-content-hosting-design.md`

---

## 文件结构(创建 / 修改)

**基础设施 / 后端**
- `docker-compose.yml`(修改)— 加 `rustfs` 服务(:9000 S3 API)
- `vitest.config.ts`(创建)— 测试运行器
- `src/env.js`(修改)— 加 `S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET/APP_URL`
- `.env` / `.env.example`(修改)— 同上的值
- `src/server/storage.ts`(创建)— S3 SDK 抽象:`putObject / getPresignedUrl / deleteObject`
- `src/server/rate-limit.ts`(创建)— `RateLimiter` 接口 + `InMemoryRateLimiter`
- `src/server/skill-package.ts`(创建)— `validateSkillZip(buf)`:解 zip 看根目录 `SKILL.md` + 大小
- `prisma/schema.prisma`(修改)— Skill 表:移除 `install`,加 `package*`,`docsUrl` 可选,`installs`→`downloads`

**API 路由(Route Handlers,非 tRPC)**
- `src/app/api/admin/skills/route.ts`(创建)— `POST` 新建 skill(multipart:元数据 + zip)
- `src/app/api/admin/skills/[id]/package/route.ts`(创建)— `POST` 换包
- `src/app/api/skills/[id]/download/route.ts`(创建)— `GET` 下载(限流 + 计数 + 302 预签名)

**tRPC / 前端**
- `src/server/api/routers/skill.ts`(修改)— `toSkill` 加 package 字段/`downloads`;`skillInput` 去 `install`;`create` 删除(改走上传接口)
- `src/components/skills/skills-data.ts`(修改)— `Skill` 类型:`install`→`package*`,`installs`→`downloads`
- `src/components/skills/skills-marketplace.tsx`(修改)— `installs`→`downloads` 显示
- `src/components/skills/skill-detail-sheet.tsx`(修改)— 安装面板换成「下载按钮 + agent 提示词(下载链接)」
- `src/components/admin/skills/admin-skill-edit-sheet.tsx`(修改)— 加 zip 上传控件
- `messages/en.json` / `messages/zh.json`(修改)— agent 提示词模板 + 下载文案

**demo / 文档**
- `prisma/demo-packages/*.zip`(创建)— 5 个真实样板 skill 包
- `prisma/demo-seed.ts`(重写)— 5 条契合内容托管的元数据
- `prisma/seed.ts`(修改)— seed 时把 zip 上传到 RustFS
- `README.md`(修改)— seed 依赖 RustFS 的说明

**测试策略**:纯逻辑(`storage` 往返、`validateSkillZip`、`InMemoryRateLimiter`)用 vitest 单元/集成测试 TDD(集成测试连本地 RustFS);三个 Route Handler 用脚本化 curl 验证(沿用项目现有的手动验证风格,见各 Task 的验证步骤)。

---

## Task 0: 引入 vitest 测试框架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Create: `src/server/__tests__/smoke.test.ts`

- [ ] **Step 1: 安装 vitest + dotenv**

```bash
cd /Users/sora/conductor/workspaces/skills-hub/trenton
pnpm add -D vitest@^2.1.0 dotenv@^16.4.5
```

- [ ] **Step 2: 创建 `vitest.setup.ts`(测试 worker 里加载 `.env`)**

集成测试要连本地 Postgres / RustFS,需把 `.env` 注入 `process.env`,否则 `~/env` 的校验会因缺变量报错。

```ts
import { config } from "dotenv";

config();
```

- [ ] **Step 3: 创建 `vitest.config.ts`(`~` alias + setup)**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    fileParallelism: false, // 集成测试串行更稳
    testTimeout: 15_000,
  },
});
```

- [ ] **Step 4: 加 test script 到 `package.json`**

在 `scripts` 块加一行(紧挨 `typecheck`):

```json
    "test": "vitest run",
```

- [ ] **Step 5: 写冒烟测试** `src/server/__tests__/smoke.test.ts`

```ts
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: 跑测试,确认框架可用**

Run: `pnpm test`
Expected: PASS,1 passed。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts vitest.setup.ts src/server/__tests__/smoke.test.ts
git commit -m "test: add vitest"
```

---

## Task 1: RustFS 容器 + 环境变量

**Files:**
- Modify: `docker-compose.yml`
- Modify: `src/env.js`
- Modify: `.env`, `.env.example`

- [ ] **Step 1: 给 `docker-compose.yml` 加 rustfs 服务**

在现有 `services:` 下、`volumes:` 之前加入(与 `skills-hub-db` 同级):

```yaml
  rustfs:
    image: rustfs/rustfs:latest
    container_name: skills-hub-rustfs
    environment:
      RUSTFS_ACCESS_KEY: skillshub
      RUSTFS_SECRET_KEY: skillshub_dev
      RUSTFS_CONSOLE_ENABLE: "true"
    command: ["--address", ":9000", "--console-enable", "--access-key", "skillshub", "--secret-key", "skillshub_dev", "/data"]
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - rustfs_data:/data
```

在文件末尾的 `volumes:` 块里加一行(与 `skillshub_pgdata` 同级):

```yaml
  rustfs_data:
```

- [ ] **Step 2: 启动 rustfs 容器**

```bash
docker compose up -d rustfs
sleep 5
docker ps --filter name=skills-hub-rustfs --format '{{.Names}} {{.Status}}'
```

Expected: `skills-hub-rustfs Up ...`

- [ ] **Step 3: 加环境变量到 `src/env.js`**

在 `server:` schema 里 `AUTH_SECRET` 之后加:

```js
    S3_ENDPOINT: z.string().url(),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    APP_URL: z.string().url(),
```

在 `runtimeEnv:` 里 `AUTH_SECRET` 之后加:

```js
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    APP_URL: process.env.APP_URL,
```

- [ ] **Step 4: 加值到 `.env` 和 `.env.example`**

`.env`(真实值):

```bash
cat >> .env <<'EOF'

# Object storage (RustFS, S3-compatible)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="skillshub"
S3_SECRET_KEY="skillshub_dev"
S3_BUCKET="skills"
APP_URL="http://localhost:3000"
EOF
```

`.env.example`(占位):

```bash
cat >> .env.example <<'EOF'

# Object storage (RustFS / S3)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="set-access-key"
S3_SECRET_KEY="set-secret-key"
S3_BUCKET="skills"
APP_URL="http://localhost:3000"
EOF
```

- [ ] **Step 5: 验证 env 能被加载(不报错)**

Run: `pnpm exec tsx -e "import('./src/env.js').then(m => console.log('env ok', m.env.S3_BUCKET))"`
Expected: 打印 `env ok skills`(若报缺变量,检查 `.env`)

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml src/env.js .env.example
git commit -m "infra: add RustFS service + S3/APP_URL env"
```

> 注:`.env` 已 gitignore,不提交。`APP_URL` 供 server 端(将来 SSR / 通知等)生成绝对链接备用;前台 agent 提示词在 client 组件里用 `window.location.origin`(跟随真实域名,见 Task 12),不依赖它。

---

## Task 2: 存储抽象层 + 验证 RustFS 预签名

> 这个 Task 的集成测试同时**验证 spec §10 的风险点**:RustFS 是否支持预签名 GET。测试通过 = 支持。

**Files:**
- Modify: `package.json`(加 aws-sdk 依赖)
- Create: `src/server/storage.ts`
- Create: `src/server/__tests__/storage.test.ts`

- [ ] **Step 1: 安装 S3 SDK**

```bash
pnpm add @aws-sdk/client-s3@^3.700.0 @aws-sdk/s3-request-presigner@^3.700.0
```

- [ ] **Step 2: 写失败的集成测试** `src/server/__tests__/storage.test.ts`

```ts
import { afterAll, describe, expect, it } from "vitest";
import {
  deleteObject,
  ensureBucket,
  getPresignedUrl,
  putObject,
} from "../storage";

const KEY = "test/roundtrip.txt";

describe("storage (integration — needs RustFS running)", () => {
  afterAll(async () => {
    await deleteObject(KEY).catch(() => {});
  });

  it("put → presigned GET → fetch returns same bytes", async () => {
    await ensureBucket();
    await putObject(KEY, Buffer.from("hello-content-hosting"), "text/plain");

    const url = await getPresignedUrl(KEY, "roundtrip.txt");
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello-content-hosting");
  });
});
```

- [ ] **Step 3: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/storage.test.ts`
Expected: FAIL，`Cannot find module '../storage'`(尚未实现)

- [ ] **Step 4: 实现 `src/server/storage.ts`**

```ts
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "~/env";

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "us-east-1", // RustFS 不校验 region,占位即可
  forcePathStyle: true, // RustFS / MinIO 走 path-style
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

/** 确保 bucket 存在(幂等)。 */
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  }
}

/** 上传对象。 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType = "application/zip",
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** 删除对象。 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

/** 签发短期(默认 60s)预签名下载 URL,带 attachment 文件名。 */
export async function getPresignedUrl(
  key: string,
  downloadName: string,
  expiresIn = 60,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadName}"`,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}
```

- [ ] **Step 5: 跑测试,确认通过(= RustFS 预签名可用)**

Run: `pnpm test src/server/__tests__/storage.test.ts`
Expected: PASS。**若此处 fetch 不是 200**,说明 RustFS 预签名有问题 → 按 spec §10 回退:下载接口改用 `getObject` 流式代理(本计划 Task 8 给出回退备注)。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/server/storage.ts src/server/__tests__/storage.test.ts
git commit -m "feat: S3 storage abstraction (RustFS) + presigned URL"
```

---

## Task 3: Schema 迁移(Skill 表)

**Files:**
- Modify: `prisma/schema.prisma:15-41`(Skill model)

- [ ] **Step 1: 改 `prisma/schema.prisma` 的 Skill model**

把 `install String` 那行删掉;把 `installs Int @default(0)` 改名为 `downloads`;把 `docsUrl String` 改成可选 `docsUrl String?`;在 `sourceUrl String?` 之后加 4 个 package 字段。改完 Skill model 应是:

```prisma
model Skill {
  id            String   @id // kebab-case slug, also the public URL id
  nameEn        String
  nameZh        String?
  descriptionEn String
  descriptionZh String?
  longDescEn    String
  longDescZh    String?
  domain        String
  author        String
  version       String
  tags          String[]
  docsUrl       String?
  homepage      String?
  githubRepoUrl String?
  sourceUrl     String?
  packageKey        String?
  packageName       String?
  packageSize       Int?
  packageUploadedAt DateTime?
  downloads     Int      @default(0)
  rating        Float    @default(0)
  releaseDate   DateTime
  published     Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([published])
  @@index([domain])
}
```

- [ ] **Step 2: 生成并应用迁移**

```bash
docker compose up -d db
pnpm exec prisma migrate dev --name content_hosting
```

Expected: 迁移生成于 `prisma/migrations/<ts>_content_hosting/`,Prisma Client 自动重新生成。

> 注:本迁移会**丢弃** `install` 列、把 `installs` 重命名为 `downloads`(Prisma 默认是 drop+add,旧 demo 数据反正要清空,无所谓)。

- [ ] **Step 3: 验证表结构**

```bash
docker exec skills-hub-db psql -U skillshub -d skillshub -c '\d "Skill"' | grep -E 'install|downloads|packageKey|docsUrl'
```

Expected: 看到 `downloads`、`packageKey`、`docsUrl`(且 `docsUrl` 那行无 `not null`);**看不到** `install`/`installs`。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: Skill schema for content hosting (package fields, downloads, drop install)"
```

---

## Task 4: zip 校验工具

**Files:**
- Modify: `package.json`(加 fflate)
- Create: `src/server/skill-package.ts`
- Create: `src/server/__tests__/skill-package.test.ts`

- [ ] **Step 1: 安装 fflate(纯 JS zip,无原生依赖)**

```bash
pnpm add fflate@^0.8.2
```

- [ ] **Step 2: 写失败测试** `src/server/__tests__/skill-package.test.ts`

```ts
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { validateSkillZip } from "../skill-package";

function makeZip(files: Record<string, string>): Buffer {
  const entries: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v);
  return Buffer.from(zipSync(entries));
}

describe("validateSkillZip", () => {
  it("accepts SKILL.md at root", () => {
    const zip = makeZip({ "SKILL.md": "# hi", "script.sh": "echo" });
    expect(validateSkillZip(zip)).toEqual({ ok: true });
  });

  it("accepts SKILL.md under a single top-level folder", () => {
    const zip = makeZip({ "my-skill/SKILL.md": "# hi" });
    expect(validateSkillZip(zip)).toEqual({ ok: true });
  });

  it("rejects when no SKILL.md", () => {
    const zip = makeZip({ "README.md": "# hi" });
    expect(validateSkillZip(zip).ok).toBe(false);
  });

  it("rejects non-zip bytes", () => {
    expect(validateSkillZip(Buffer.from("not a zip")).ok).toBe(false);
  });

  it("rejects oversize (custom small limit)", () => {
    const zip = makeZip({ "SKILL.md": "x".repeat(100) });
    expect(validateSkillZip(zip, 10).ok).toBe(false);
  });
});
```

- [ ] **Step 3: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/skill-package.test.ts`
Expected: FAIL，`Cannot find module '../skill-package'`

- [ ] **Step 4: 实现 `src/server/skill-package.ts`**

```ts
import { unzipSync } from "fflate";

export const MAX_PACKAGE_BYTES = 50 * 1024 * 1024; // 50MB

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * 基本校验:大小 ≤ maxBytes、能解压、含 SKILL.md
 * (接受根目录 SKILL.md,或单层顶级目录下的 SKILL.md —— 打包常带顶层目录)。
 */
export function validateSkillZip(
  buf: Buffer,
  maxBytes = MAX_PACKAGE_BYTES,
): ValidationResult {
  if (buf.byteLength > maxBytes) {
    return { ok: false, error: "Package exceeds size limit." };
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf));
  } catch {
    return { ok: false, error: "Not a valid zip archive." };
  }
  const hasSkillMd = Object.keys(files).some(
    (name) => name === "SKILL.md" || /^[^/]+\/SKILL\.md$/.test(name),
  );
  if (!hasSkillMd) {
    return { ok: false, error: "Missing SKILL.md in package root." };
  }
  return { ok: true };
}
```

- [ ] **Step 5: 跑测试,确认通过**

Run: `pnpm test src/server/__tests__/skill-package.test.ts`
Expected: PASS，5 passed。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/server/skill-package.ts src/server/__tests__/skill-package.test.ts
git commit -m "feat: skill zip validation (SKILL.md + size)"
```

---

## Task 5: 限流抽象层

**Files:**
- Create: `src/server/rate-limit.ts`
- Create: `src/server/__tests__/rate-limit.test.ts`

- [ ] **Step 1: 写失败测试** `src/server/__tests__/rate-limit.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "../rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows up to the limit then blocks", () => {
    const t = 1000;
    const rl = new InMemoryRateLimiter(3, 1000, () => t);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(false);
  });

  it("resets after the window passes", () => {
    let t = 1000;
    const rl = new InMemoryRateLimiter(1, 1000, () => t);
    expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(false);
    t += 1001;
    expect(rl.check("ip")).toBe(true);
  });

  it("tracks keys independently", () => {
    const t = 1000;
    const rl = new InMemoryRateLimiter(1, 1000, () => t);
    expect(rl.check("a")).toBe(true);
    expect(rl.check("b")).toBe(true);
    expect(rl.check("a")).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/rate-limit.test.ts`
Expected: FAIL，`Cannot find module '../rate-limit'`

- [ ] **Step 3: 实现 `src/server/rate-limit.ts`**

```ts
/** 限流抽象 —— 以后换 Redis 实现同一接口即可。 */
export interface RateLimiter {
  /** true = 允许,false = 超限。 */
  check(key: string): boolean;
}

/** 固定窗口计数限流(单进程内存)。 */
export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  check(key: string): boolean {
    const t = this.now();
    const entry = this.hits.get(key);
    if (!entry || t >= entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }
}

/** 下载接口用:每 IP 每分钟 30 次。 */
export const downloadRateLimiter = new InMemoryRateLimiter(30, 60_000);
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `pnpm test src/server/__tests__/rate-limit.test.ts`
Expected: PASS，3 passed。

- [ ] **Step 5: Commit**

```bash
git add src/server/rate-limit.ts src/server/__tests__/rate-limit.test.ts
git commit -m "feat: in-memory rate limiter (RateLimiter interface)"
```

---

## Task 6: 上传接口 — 新建 skill(multipart,带包)

**Files:**
- Modify: `src/server/auth.ts`(加 `isAdminRequest` helper)
- Create: `src/app/api/admin/skills/route.ts`
- Create: `src/server/__tests__/upload-route.test.ts`

- [ ] **Step 1: 给 `src/server/auth.ts` 加 `isAdminRequest`**

在文件末尾追加:

```ts
/** Route Handler 用:从请求 cookie 判断是否为合法 admin。 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return verifyAdminSession(readSessionCookie(req.headers.get("cookie")));
}
```

- [ ] **Step 2: 写失败的集成测试** `src/server/__tests__/upload-route.test.ts`

```ts
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "~/app/api/admin/skills/route";
import { createAdminSession } from "~/server/auth";
import { db } from "~/server/db";
import { deleteObject } from "~/server/storage";

const ID = "test-upload-skill";

function zip(): Buffer {
  return Buffer.from(zipSync({ "SKILL.md": strToU8("# test skill") }));
}

function form(pkg: Buffer): FormData {
  const f = new FormData();
  f.set("package", new File([pkg], "skill.zip", { type: "application/zip" }));
  const meta: Record<string, string> = {
    id: ID,
    nameEn: "Test",
    descriptionEn: "d",
    longDescEn: "ld",
    domain: "Other",
    author: "tester",
    version: "0.1.0",
    tags: "a,b",
    releaseDate: "2026-01-01",
  };
  for (const [k, v] of Object.entries(meta)) f.set(k, v);
  return f;
}

function post(f: FormData, cookie?: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/admin/skills", {
      method: "POST",
      body: f,
      headers: cookie ? { cookie } : {},
    }),
  );
}

describe("POST /api/admin/skills (integration)", () => {
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("401 without admin cookie", async () => {
    expect((await post(form(zip()))).status).toBe(401);
  });

  it("creates skill + stores package with valid cookie", async () => {
    const token = await createAdminSession();
    const res = await post(form(zip()), `admin_session=${token}`);
    expect(res.status).toBe(200);
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.packageKey).toBe(`skills/${ID}.zip`);
    expect(row?.downloads).toBe(0);
  });

  it("400 on invalid zip", async () => {
    const token = await createAdminSession();
    const res = await post(form(Buffer.from("not a zip")), `admin_session=${token}`);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/upload-route.test.ts`
Expected: FAIL，`Cannot find module '~/app/api/admin/skills/route'`

- [ ] **Step 4: 实现 `src/app/api/admin/skills/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { validateSkillZip } from "~/server/skill-package";
import { deleteObject, ensureBucket, putObject } from "~/server/storage";

const metaSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameZh: z.string().optional(),
  descriptionEn: z.string(),
  descriptionZh: z.string().optional(),
  longDescEn: z.string(),
  longDescZh: z.string().optional(),
  domain: z.string(),
  author: z.string(),
  version: z.string(),
  tags: z.string(), // 表单里逗号分隔
  docsUrl: z.string().optional(),
  homepage: z.string().optional(),
  githubRepoUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  releaseDate: z.string(),
});

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("package");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing package file." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const valid = validateSkillZip(buf);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const fields = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  );
  const parsed = metaSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid metadata." }, { status: 400 });
  }
  const m = parsed.data;
  const key = `skills/${m.id}.zip`;

  await ensureBucket();
  await putObject(key, buf);
  try {
    const skill = await db.skill.create({
      data: {
        id: m.id,
        nameEn: m.nameEn,
        nameZh: m.nameZh || null,
        descriptionEn: m.descriptionEn,
        descriptionZh: m.descriptionZh || null,
        longDescEn: m.longDescEn,
        longDescZh: m.longDescZh || null,
        domain: m.domain,
        author: m.author,
        version: m.version,
        tags: m.tags.split(",").map((t) => t.trim()).filter(Boolean),
        docsUrl: m.docsUrl || null,
        homepage: m.homepage || null,
        githubRepoUrl: m.githubRepoUrl || null,
        sourceUrl: m.sourceUrl || null,
        packageKey: key,
        packageName: file.name,
        packageSize: buf.byteLength,
        packageUploadedAt: new Date(),
        releaseDate: new Date(m.releaseDate),
        published: true,
      },
    });
    return NextResponse.json({ ok: true, id: skill.id });
  } catch {
    // 补偿:db 写失败 → 删已传对象,避免孤儿
    await deleteObject(key).catch(() => {});
    return NextResponse.json(
      { error: "Failed to create skill (id may already exist)." },
      { status: 409 },
    );
  }
}
```

- [ ] **Step 5: 跑测试,确认通过(需 Postgres + RustFS 都在跑)**

```bash
docker compose up -d db rustfs
pnpm test src/server/__tests__/upload-route.test.ts
```
Expected: PASS，3 passed。

- [ ] **Step 6: Commit**

```bash
git add src/server/auth.ts src/app/api/admin/skills/route.ts src/server/__tests__/upload-route.test.ts
git commit -m "feat: admin skill upload route (multipart + zip → RustFS)"
```

---

## Task 7: 换包接口(覆盖已有 skill 的包)

**Files:**
- Create: `src/app/api/admin/skills/[id]/package/route.ts`
- Create: `src/server/__tests__/repackage-route.test.ts`

- [ ] **Step 1: 写失败测试** `src/server/__tests__/repackage-route.test.ts`

```ts
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "~/app/api/admin/skills/[id]/package/route";
import { createAdminSession } from "~/server/auth";
import { db } from "~/server/db";
import { deleteObject } from "~/server/storage";

const ID = "test-repackage-skill";

function bigZip(): Buffer {
  return Buffer.from(zipSync({ "SKILL.md": strToU8("# bigger content " + "x".repeat(500)) }));
}

function post(id: string, pkg: Buffer, cookie?: string): Promise<Response> {
  const f = new FormData();
  f.set("package", new File([pkg], "new.zip", { type: "application/zip" }));
  return POST(
    new Request(`http://localhost/api/admin/skills/${id}/package`, {
      method: "POST",
      body: f,
      headers: cookie ? { cookie } : {},
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/admin/skills/[id]/package (integration)", () => {
  beforeEach(async () => {
    await db.skill.create({
      data: {
        id: ID, nameEn: "T", descriptionEn: "d", longDescEn: "l",
        domain: "Other", author: "t", version: "0.1.0", tags: [],
        releaseDate: new Date(), packageKey: `skills/${ID}.zip`,
        packageName: "old.zip", packageSize: 10,
      },
    });
  });
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("401 without admin cookie", async () => {
    expect((await post(ID, bigZip())).status).toBe(401);
  });

  it("404 for unknown skill", async () => {
    const token = await createAdminSession();
    expect((await post("nope", bigZip(), `admin_session=${token}`)).status).toBe(404);
  });

  it("overwrites package + updates size", async () => {
    const token = await createAdminSession();
    const res = await post(ID, bigZip(), `admin_session=${token}`);
    expect(res.status).toBe(200);
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.packageName).toBe("new.zip");
    expect(row?.packageSize).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/repackage-route.test.ts`
Expected: FAIL，`Cannot find module '~/app/api/admin/skills/[id]/package/route'`

- [ ] **Step 3: 实现 `src/app/api/admin/skills/[id]/package/route.ts`**

```ts
import { NextResponse } from "next/server";

import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { validateSkillZip } from "~/server/skill-package";
import { ensureBucket, putObject } from "~/server/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await db.skill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("package");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing package file." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const valid = validateSkillZip(buf);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const key = `skills/${id}.zip`;
  await ensureBucket();
  await putObject(key, buf); // 固定 key,put 即覆盖
  await db.skill.update({
    where: { id },
    data: {
      packageKey: key,
      packageName: file.name,
      packageSize: buf.byteLength,
      packageUploadedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `pnpm test src/server/__tests__/repackage-route.test.ts`
Expected: PASS，3 passed。

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/skills/[id]/package/route.ts src/server/__tests__/repackage-route.test.ts
git commit -m "feat: repackage route (overwrite skill package)"
```

---

## Task 8: 下载接口(限流 + 计数 + 302 预签名)

**Files:**
- Create: `src/app/api/skills/[id]/download/route.ts`
- Create: `src/server/__tests__/download-route.test.ts`

> **回退备注**:若 Task 2 的预签名验证失败(RustFS 不支持),把本接口末尾的「签发预签名 + 302」改为「`getObject` 流式返回 + `Content-Disposition` header」。对外接口与 agent 提示词不变。

- [ ] **Step 1: 写失败测试** `src/server/__tests__/download-route.test.ts`

```ts
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "~/app/api/skills/[id]/download/route";
import { db } from "~/server/db";
import { deleteObject, ensureBucket, putObject } from "~/server/storage";

const ID = "test-download-skill";

function get(id: string, ip = "9.9.9.9"): Promise<Response> {
  return GET(
    new Request(`http://localhost/api/skills/${id}/download`, {
      headers: { "x-forwarded-for": ip },
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/skills/[id]/download (integration)", () => {
  beforeEach(async () => {
    await ensureBucket();
    await putObject(`skills/${ID}.zip`, Buffer.from(zipSync({ "SKILL.md": strToU8("# t") })));
    await db.skill.create({
      data: {
        id: ID, nameEn: "T", descriptionEn: "d", longDescEn: "l",
        domain: "Other", author: "t", version: "0.1.0", tags: [],
        releaseDate: new Date(), packageKey: `skills/${ID}.zip`, packageName: "t.zip",
      },
    });
  });
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("302 to presigned url + increments downloads", async () => {
    const res = await get(ID);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("X-Amz-Signature");
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.downloads).toBe(1);
  });

  it("404 when no package", async () => {
    await db.skill.update({ where: { id: ID }, data: { packageKey: null } });
    expect((await get(ID)).status).toBe(404);
  });
});
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `pnpm test src/server/__tests__/download-route.test.ts`
Expected: FAIL，`Cannot find module '~/app/api/skills/[id]/download/route'`

- [ ] **Step 3: 实现 `src/app/api/skills/[id]/download/route.ts`**

```ts
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { downloadRateLimiter } from "~/server/rate-limit";
import { getPresignedUrl } from "~/server/storage";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!downloadRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const skill = await db.skill.findUnique({
    where: { id },
    select: { packageKey: true, packageName: true },
  });
  if (!skill?.packageKey) {
    return NextResponse.json({ error: "No package" }, { status: 404 });
  }

  await db.skill.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  });

  const url = await getPresignedUrl(
    skill.packageKey,
    skill.packageName ?? `${id}.zip`,
  );
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `pnpm test src/server/__tests__/download-route.test.ts`
Expected: PASS，2 passed。

- [ ] **Step 5: Commit**

```bash
git add src/app/api/skills/[id]/download/route.ts src/server/__tests__/download-route.test.ts
git commit -m "feat: download route (rate-limit + count + 302 presigned)"
```

> **字段重命名链(Task 9–12)**:`install`→移除、`installs`→`downloads`、加 `package*`。这几处横跨前后端,**全局 `tsc` 会在 Task 12 完成后才整体通过**;Task 9–11 用各自的局部验证,别被中途的 tsc 报错吓到。

---

## Task 9: tRPC skillRouter 调整

**Files:**
- Modify: `src/server/api/routers/skill.ts`

- [ ] **Step 1: 替换 `toSkill` 函数**(移除 `install`,加 package 字段 + `downloads`,`docsUrl` 可选)

把现有 `toSkill`(约 12–32 行)整个替换为:

```ts
function toSkill(row: SkillRow) {
  return {
    id: row.id,
    name: { en: row.nameEn, zh: row.nameZh ?? undefined },
    description: { en: row.descriptionEn, zh: row.descriptionZh ?? undefined },
    longDescription: { en: row.longDescEn, zh: row.longDescZh ?? undefined },
    domain: row.domain,
    author: row.author,
    version: row.version,
    tags: row.tags,
    docsUrl: row.docsUrl ?? undefined,
    homepage: row.homepage ?? undefined,
    githubRepoUrl: row.githubRepoUrl ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    packageName: row.packageName ?? undefined,
    packageSize: row.packageSize ?? undefined,
    hasPackage: row.packageKey != null, // 前台据此显示下载 UI;不暴露内部 key
    downloads: row.downloads,
    rating: row.rating,
    releaseDate: row.releaseDate.toISOString().slice(0, 10),
    published: row.published,
  };
}
```

- [ ] **Step 2: 改 `ORDER` 的 popular 排序**

```ts
const ORDER: Record<string, Prisma.SkillOrderByWithRelationInput> = {
  popular: { downloads: "desc" },
  newest: { releaseDate: "desc" },
  rating: { rating: "desc" },
  name_asc: { nameEn: "asc" },
};
```

- [ ] **Step 3: 改 `skillInput`**(移除 `install` 和 `installs`,`docsUrl` 改 nullish)

把 `skillInput` 里的 `install: z.string(),` 删掉;`docsUrl: z.string(),` 改为 `docsUrl: z.string().nullish(),`;把 `installs: z.number().default(0),` 删掉。改完字段列表(顺序参考)应为:`id, nameEn, nameZh, descriptionEn, descriptionZh, longDescEn, longDescZh, domain, author, version, tags, docsUrl, homepage, githubRepoUrl, sourceUrl, rating, releaseDate, published`。

- [ ] **Step 4: 删除 `create` procedure**

新建 skill 改走上传接口(Task 6),tRPC 不再需要 `create`。把整个 `create: protectedProcedure...` 块删掉(从 `create:` 到它的 `}),`)。`update / delete / setPublished / adminList / list / getById / domainCounts` 保留。

- [ ] **Step 5: 局部验证 —— 只看本文件无语法/类型自洽问题**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "routers/skill.ts" || echo "skill.ts clean"`
Expected: `skill.ts clean`(本文件无错;前端文件的报错此时属预期,Task 10–12 修)

- [ ] **Step 6: Commit**

```bash
git add src/server/api/routers/skill.ts
git commit -m "feat: tRPC skill router for content hosting (package/downloads, drop install/create)"
```

---

## Task 10: 前端 Skill 类型 + marketplace 显示

**Files:**
- Modify: `src/components/skills/skills-data.ts:29-54`(Skill interface)
- Modify: `src/components/skills/skills-marketplace.tsx`

- [ ] **Step 1: 改 `Skill` interface(`skills-data.ts`)**

在 `interface Skill` 里:删除 `install: string;`;把 `installs: number;` 改为 `downloads: number;`;把 `docsUrl: string;` 改为 `docsUrl?: string;`;在 `sourceUrl?: string;` 后加三行 package 字段。结果:

```ts
export interface Skill {
  id: string;
  name: LocalizedString;
  domain: SkillDomain;
  author: string;
  version: string;
  description: LocalizedString;
  longDescription: LocalizedString;
  tags: string[];
  downloads: number;
  rating: number;
  docsUrl?: string;
  homepage?: string;
  githubRepoUrl?: string;
  sourceUrl?: string;
  packageName?: string;
  packageSize?: number;
  hasPackage?: boolean;
  uploadedFile?: string;
  releaseDate: string;
  source?: SkillSource;
  sourceFeed?: string;
  feeds?: string[];
  lastSyncedAt?: string;
}
```

- [ ] **Step 2: 改 marketplace 的下载量引用**

在 `src/components/skills/skills-marketplace.tsx`:
- 把函数 `formatInstalls` 重命名为 `formatDownloads`(定义 + 调用处,共 2 处)。
- `SkillCard` 里 `formatInstalls(skill.installs)` 改为 `formatDownloads(skill.downloads)`。
- 排序 `case "popular": list.sort((a, b) => b.installs - a.installs);` 改为 `b.downloads - a.downloads`。

- [ ] **Step 3: 局部验证 —— marketplace 自身已无旧字段**

Run: `grep -n "installs\|\.install\b" src/components/skills/skills-marketplace.tsx || echo "marketplace clean"`
Expected: `marketplace clean`

- [ ] **Step 4: Commit**

```bash
git add src/components/skills/skills-data.ts src/components/skills/skills-marketplace.tsx
git commit -m "feat: front-end Skill type + marketplace use downloads/package"
```

> 注:此时 `skill-detail-sheet.tsx` 仍引用 `install`/`installs`,全局 `tsc` 会报错 —— Task 12 修复后转绿。

---

## Task 11: admin 上传 UI(新建带包 + 换包)

**Files:**
- Modify: `src/components/admin/skills/admin-skill-edit-sheet.tsx`
- Modify: `src/components/admin/skills/admin-skills-listings.tsx`

设计:edit-sheet 支持两种模式 —— `skill === null` 为**新建**(元数据 + zip 必填 → `POST /api/admin/skills`);`skill` 有值为**编辑**(元数据走 tRPC `update`,若另选了新 zip 再 `POST /api/admin/skills/<id>/package`)。

- [ ] **Step 1: 在 edit-sheet 顶部加文件状态 + 上传辅助**

在 `AdminSkillEditSheet` 组件里(`const [form, setForm] = ...` 之后)加:

```tsx
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const isCreate = skill === null;
```

- [ ] **Step 2: 加一个 zip 文件 input**(放在表单第一个 section 顶部)

```tsx
          <div className="space-y-1.5">
            <Label htmlFor="edit-pkg">
              {isCreate ? "Skill 包(zip,必填)" : "替换包(zip,可选)"}
            </Label>
            <Input
              id="edit-pkg"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
```

- [ ] **Step 3: 替换 `handleSave`,支持新建/编辑/换包**

把现有 `handleSave` 整个替换为:

```tsx
  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (file) fd.set("package", file);
    fd.set("id", skill?.id ?? form.id);
    fd.set("nameEn", form.name.trim());
    fd.set("descriptionEn", form.description.trim());
    fd.set("longDescEn", form.longDescription.trim());
    fd.set("domain", form.domain);
    fd.set("author", form.author.trim());
    fd.set("version", form.version.trim());
    fd.set("tags", form.tagsCsv);
    fd.set("docsUrl", form.docsUrl.trim());
    fd.set("homepage", form.homepage.trim());
    fd.set("githubRepoUrl", form.githubRepoUrl.trim());
    fd.set("sourceUrl", form.sourceUrl.trim());
    fd.set("releaseDate", new Date().toISOString().slice(0, 10));
    return fd;
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      if (isCreate) {
        if (!file) {
          alert("新建 skill 必须上传 zip 包");
          return;
        }
        const res = await fetch("/api/admin/skills", {
          method: "POST",
          body: buildFormData(),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "上传失败");
      } else {
        // 元数据走 tRPC update
        await update.mutateAsync({
          id: skill.id,
          nameEn: form.name.trim(),
          domain: form.domain,
          author: form.author.trim(),
          version: form.version.trim(),
          descriptionEn: form.description.trim(),
          longDescEn: form.longDescription.trim(),
          tags: form.tagsCsv.split(",").map((t) => t.trim()).filter(Boolean),
          docsUrl: form.docsUrl.trim() || null,
          homepage: form.homepage.trim() || null,
          githubRepoUrl: form.githubRepoUrl.trim() || null,
          sourceUrl: form.sourceUrl.trim() || null,
        });
        // 若另选了新 zip,换包
        if (file) {
          const fd = new FormData();
          fd.set("package", file);
          const res = await fetch(`/api/admin/skills/${skill.id}/package`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "换包失败");
        }
      }
      setFile(null);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };
```

> 注:`update` mutation 已存在;`form.id` 需要新建模式下可编辑 —— 若现有 `FormState` 无 `id` 字段,在 `toForm` 默认值与表单里补一个 `id` 文本输入(新建模式 `isCreate` 时显示)。`docsUrl`/`homepage` 等沿用现有。**同时移除** `FormState` 的 `install` 字段、`toForm` 里的 `install: s.install`、以及表单里的 install 输入框(`AdminSkill` 经 Task 9 后已无 `install`,不删会 tsc 报错)。

- [ ] **Step 4: 保存按钮接 busy 态**

把保存 `<Button onClick={handleSave} ...>` 的 `disabled` 接上 `busy`,文案 busy 时显示「保存中…」。

- [ ] **Step 5: listings 加「新建 skill」按钮**

在 `admin-skills-listings.tsx` 顶部操作区(logout 按钮旁)加一个按钮,点击时以新建模式打开 sheet:把传给 `<AdminSkillEditSheet>` 的 `skill={editing}` 在「新建」时设为 `null`,并 `setEditOpen(true)`。即新增 state 用法:`onClick={() => { setEditing(null); setEditOpen(true); }}`。

- [ ] **Step 6: 局部验证**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "admin-skill" || echo "admin sheets clean"`
Expected: `admin sheets clean`(detail-sheet 仍可能报错,Task 12 修)

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/skills/admin-skill-edit-sheet.tsx src/components/admin/skills/admin-skills-listings.tsx
git commit -m "feat: admin upload UI (create with package + repackage)"
```

---

## Task 12: 详情页下载按钮 + agent 提示词

**Files:**
- Modify: `src/components/skills/skill-detail-sheet.tsx`
- Modify: `messages/en.json`, `messages/zh.json`

- [ ] **Step 1: 加 i18n 文案**

`messages/en.json` 的 `detail` 命名空间里加:

```json
    "download": "Download package",
    "noPackage": "No package available yet",
    "copyAgentPrompt": "Copy agent install prompt",
    "agentPromptCopied": "Prompt copied",
    "agentPromptTemplate": "Install the \"{name}\" skill from CherryIN.\nDownload: {url}\nUnzip it into your Claude / Cherry Studio skills directory, then read SKILL.md and follow its instructions."
```

`messages/zh.json` 的 `detail` 里加:

```json
    "download": "下载 skill 包",
    "noPackage": "暂无可下载的包",
    "copyAgentPrompt": "复制 agent 安装提示词",
    "agentPromptCopied": "已复制提示词",
    "agentPromptTemplate": "从 CherryIN 安装「{name}」skill。\n下载:{url}\n解压到你的 Claude / Cherry Studio skills 目录,然后阅读 SKILL.md 并按其说明执行。"
```

- [ ] **Step 2: 用 DownloadPanel 替换 InstallPanel**

在 `skill-detail-sheet.tsx`:删掉 `InstallPanel` 组件整段(以及 `buildExamplePrompts` 等仅其使用的死代码若有),换成:

```tsx
function DownloadPanel({ skill }: { skill: Skill }) {
  const t = useTranslations("detail");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  if (!skill.hasPackage) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border p-4 text-sm dark:border-white/[0.12]">
        {t("noPackage")}
      </div>
    );
  }

  const downloadUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/skills/${skill.id}/download`
      : `/api/skills/${skill.id}/download`;

  const prompt = t("agentPromptTemplate", {
    name: pickLocale(skill.name, locale),
    url: downloadUrl,
  });

  const copyPrompt = () => {
    void navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 dark:border-white/[0.12]">
      <a
        href={downloadUrl}
        className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium"
      >
        <Download className="size-4" />
        {t("download")}
      </a>
      <div className="bg-muted/40 border-border relative rounded-md border p-3 dark:border-white/[0.10]">
        <pre className="text-foreground/90 max-h-36 overflow-y-auto pr-7 font-[Menlo,monospace] text-[11px] leading-relaxed whitespace-pre-wrap">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={copyPrompt}
          className="hover:bg-accent text-muted-foreground hover:text-foreground absolute top-2 right-2 cursor-pointer rounded p-1"
          title={copied ? t("agentPromptCopied") : t("copyAgentPrompt")}
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 在主 sheet 里把 `<InstallPanel .../>` 改成 `<DownloadPanel skill={current} />`,并把任何 `installs` 显示改为 `downloads`**

查 `skill-detail-sheet.tsx` 内 `installs` / `\.install\b` 的引用,逐个改:下载量显示用 `current.downloads`;`formatInstalls` 若仍用,重命名 `formatDownloads`。删掉不再使用的 import(如 `Star`/`Zap` 等仅死代码用到的,以 tsc 报「未使用」为准清理)。

- [ ] **Step 4: 验证 `src/` 下转绿**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "^src/" || echo "src clean"
```
Expected: `src clean`(src 下字段重命名链闭合;`prisma/demo-seed.ts` 旧数据仍含 `install`,留到 Task 13 重写后整体绿 —— Task 14 Step 2 做最终全局校验)。

```bash
grep -rn "\.installs\b\|\.install\b" src/components || echo "no stale install refs"
```
Expected: `no stale install refs`

- [ ] **Step 5: Commit**

```bash
git add src/components/skills/skill-detail-sheet.tsx messages/en.json messages/zh.json
git commit -m "feat: detail download button + bilingual agent install prompt"
```

---

## Task 13: 重写 demo(真包样板)+ seed 改造 + README

**Files:**
- Create: `prisma/demo-packages/<id>/SKILL.md`(5 个)
- Rewrite: `prisma/demo-seed.ts`
- Modify: `prisma/seed.ts`
- Modify: `README.md`

> demo 包以**源文件**形式纳入 git(`prisma/demo-packages/<id>/SKILL.md`),seed 时即时打 zip 上传 —— 比把二进制 zip 塞进 git 干净。

- [ ] **Step 1: 写 5 个 demo 的 SKILL.md**

```bash
mkdir -p prisma/demo-packages/{pr-summary,commit-helper,meeting-notes,palette-gen,csv-insights}
```

`prisma/demo-packages/pr-summary/SKILL.md`:
```md
# PR Summary
Summarize a GitHub pull request into a concise changelog entry.

## Usage
Give the agent a PR URL or diff. It produces: what changed, why, and risk notes.
```

`prisma/demo-packages/commit-helper/SKILL.md`:
```md
# Commit Helper
Write clear, conventional commit messages from a staged diff.

## Usage
Run with staged changes; the agent reads the diff and proposes a `type(scope): subject` message.
```

`prisma/demo-packages/meeting-notes/SKILL.md`:
```md
# Meeting Notes
Turn a raw transcript into structured notes: decisions, action items, owners.

## Usage
Paste a transcript. Output is grouped by decisions / TODOs / open questions.
```

`prisma/demo-packages/palette-gen/SKILL.md`:
```md
# Palette Generator
Generate an accessible color palette from a single brand color.

## Usage
Provide a hex color. Returns tints/shades with WCAG contrast annotations.
```

`prisma/demo-packages/csv-insights/SKILL.md`:
```md
# CSV Insights
Profile a CSV and surface the three most interesting findings.

## Usage
Point the agent at a CSV path. It reports schema, anomalies, and top insights.
```

- [ ] **Step 2: 重写 `prisma/demo-seed.ts`**

```ts
import type { Skill } from "../src/components/skills/skills-data";

// 5 条内容托管样板。id 对应 prisma/demo-packages/<id>/ 目录。
// 仅供 `pnpm exec tsx prisma/seed.ts` 灌入,生产可不跑。
export const SKILLS: Skill[] = [
  {
    id: "pr-summary",
    name: "PR Summary",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "1.0.0",
    description: "Summarize a pull request into a concise changelog entry.",
    longDescription:
      "Reads a PR diff and produces a tight summary: what changed, why, and any risk notes — ready to paste into release notes.",
    tags: ["git", "review", "changelog"],
    downloads: 0,
    rating: 4.8,
    docsUrl: "https://example.com/skills/pr-summary",
    releaseDate: "2026-05-01",
  },
  {
    id: "commit-helper",
    name: "Commit Helper",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "0.9.0",
    description: "Write conventional commit messages from a staged diff.",
    longDescription:
      "Inspects staged changes and proposes a clear `type(scope): subject` commit message with an optional body.",
    tags: ["git", "commits"],
    downloads: 0,
    rating: 4.6,
    docsUrl: "https://example.com/skills/commit-helper",
    releaseDate: "2026-05-10",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    domain: "Communication",
    author: "CherryIN",
    version: "1.2.0",
    description: "Turn a transcript into decisions, action items, and owners.",
    longDescription:
      "Converts a raw meeting transcript into structured notes grouped by decisions, TODOs (with owners), and open questions.",
    tags: ["meetings", "notes"],
    downloads: 0,
    rating: 4.7,
    docsUrl: "https://example.com/skills/meeting-notes",
    releaseDate: "2026-04-20",
  },
  {
    id: "palette-gen",
    name: "Palette Generator",
    domain: "Design",
    author: "CherryIN",
    version: "0.5.0",
    description: "Generate an accessible palette from one brand color.",
    longDescription:
      "From a single hex color, generates tints and shades annotated with WCAG contrast ratios for accessible UI.",
    tags: ["design", "color", "a11y"],
    downloads: 0,
    rating: 4.4,
    docsUrl: "https://example.com/skills/palette-gen",
    releaseDate: "2026-05-18",
  },
  {
    id: "csv-insights",
    name: "CSV Insights",
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "0.3.0",
    description: "Profile a CSV and surface the top findings.",
    longDescription:
      "Points at a CSV, reports its schema, flags anomalies, and surfaces the three most interesting insights.",
    tags: ["data", "csv", "analysis"],
    downloads: 0,
    rating: 4.2,
    docsUrl: "https://example.com/skills/csv-insights",
    releaseDate: "2026-05-22",
  },
];
```

- [ ] **Step 3: 改造 `prisma/seed.ts`(打 zip + 上传 RustFS)**

整体替换为:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { zipSync } from "fflate";

import { PrismaClient } from "../generated/prisma";
import { ensureBucket, putObject } from "../src/server/storage";
import { SKILLS } from "./demo-seed";

const db = new PrismaClient();

function packDemo(id: string): Buffer {
  const dir = join(__dirname, "demo-packages", id);
  const entries: Record<string, Uint8Array> = {};
  for (const name of readdirSync(dir)) {
    entries[name] = new Uint8Array(readFileSync(join(dir, name)));
  }
  return Buffer.from(zipSync(entries));
}

function loc(v: string | { en: string; zh?: string }): { en: string; zh: string | null } {
  if (typeof v === "string") return { en: v, zh: null };
  return { en: v.en, zh: v.zh ?? null };
}

async function main() {
  await ensureBucket();
  let n = 0;
  for (const s of SKILLS) {
    const name = loc(s.name);
    const desc = loc(s.description);
    const long = loc(s.longDescription);
    const zip = packDemo(s.id);
    const key = `skills/${s.id}.zip`;
    await putObject(key, zip);

    await db.skill.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        nameEn: name.en,
        nameZh: name.zh,
        descriptionEn: desc.en,
        descriptionZh: desc.zh,
        longDescEn: long.en,
        longDescZh: long.zh,
        domain: s.domain,
        author: s.author,
        version: s.version,
        tags: s.tags,
        docsUrl: s.docsUrl ?? null,
        homepage: s.homepage ?? null,
        githubRepoUrl: s.githubRepoUrl ?? null,
        sourceUrl: s.sourceUrl ?? null,
        packageKey: key,
        packageName: `${s.id}.zip`,
        packageSize: zip.byteLength,
        packageUploadedAt: new Date(),
        downloads: 0,
        rating: s.rating,
        releaseDate: new Date(s.releaseDate),
        published: true,
      },
    });
    n++;
  }
  console.log(`Seeded ${n} curated skills (with packages)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
```

> `seed.ts` 现在 import `../src/server/storage`(内部用 `~/env`)。`tsx` 默认读 tsconfig 的 `paths`,`~` 应能 resolve。若报 `Cannot find package '~'`,改用 `pnpm exec tsx --tsconfig tsconfig.json prisma/seed.ts`。

- [ ] **Step 4: 清空旧数据 + 重新 seed**

```bash
docker compose up -d db rustfs
docker exec skills-hub-db psql -U skillshub -d skillshub -c 'TRUNCATE "Skill";'
pnpm exec tsx prisma/seed.ts
```
Expected: `Seeded 5 curated skills (with packages)`

- [ ] **Step 5: 验证 db + 对象都在**

```bash
docker exec skills-hub-db psql -U skillshub -d skillshub -t -c 'SELECT id, "packageSize", downloads FROM "Skill" ORDER BY id;'
```
Expected: 5 行,`packageSize` 非空、`downloads` = 0。

- [ ] **Step 6: 更新 README**

在 `README.md` 加一节(放在已有的本地启动说明附近):

```md
## 本地数据初始化

1. 起依赖:`docker compose up -d db rustfs`
2. 迁移:`pnpm exec prisma migrate dev`
3. 灌演示数据(会把 demo 包上传到 RustFS):`pnpm exec tsx prisma/seed.ts`

> seed 依赖 RustFS 在跑(它会上传 `prisma/demo-packages/*` 的 zip)。
```

- [ ] **Step 7: Commit**

```bash
git add prisma/demo-packages prisma/demo-seed.ts prisma/seed.ts README.md
git commit -m "feat: content-hosting demo data (5 real packages) + seed uploads to RustFS"
```

---

## Task 14: 端到端验证

**Files:** 无(仅验证)

- [ ] **Step 1: 全部单元/集成测试通过**

```bash
docker compose up -d db rustfs
pnpm test
```
Expected: 所有测试 PASS。

- [ ] **Step 2: 类型 + 构建通过**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: 无类型错误;build 成功。

- [ ] **Step 3: 起 dev,验证下载链路(人 + agent 同一接口)**

```bash
pkill -f "next-server" 2>/dev/null; rm -rf .next
pnpm dev > /tmp/ch-dev.log 2>&1 &
sleep 8
# 下载接口应 302 到预签名直链
curl -s -o /dev/null -w "download → %{http_code} -> %{redirect_url}\n" "http://localhost:3000/api/skills/pr-summary/download"
# 跟随重定向,确认真的拿到 zip
curl -sL "http://localhost:3000/api/skills/pr-summary/download" -o /tmp/dl.zip -w "followed → %{http_code} %{content_type}\n"
unzip -l /tmp/dl.zip | grep SKILL.md && echo "zip OK"
```
Expected: 第一跳 302 → 一个含 `X-Amz-Signature` 的 URL;跟随后 200 拿到 zip;`unzip -l` 看到 `SKILL.md`。

- [ ] **Step 4: 验证下载量已 +1**

```bash
docker exec skills-hub-db psql -U skillshub -d skillshub -t -c "SELECT downloads FROM \"Skill\" WHERE id='pr-summary';"
```
Expected: ≥ 2(上面下载了两次)。

- [ ] **Step 5: 收尾**

```bash
pkill -f "next-server" 2>/dev/null
```

至此内容托管全链路打通:admin 上传 → RustFS 存储 → 稳定接口 302 预签名下载 → 计数 + 限流 → agent 提示词。
