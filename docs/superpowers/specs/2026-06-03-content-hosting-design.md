# 内容托管(Content Hosting)设计

- 日期:2026-06-03
- 分支:`zhibisora/project-setup-architecture`
- 状态:设计已确认,待用户评审

## 1. 背景与目标

CherryIN Skills Marketplace 第一期(已完成)是**指针式托管**:平台只存元数据 + 一条 `install` 命令(指向 npm / brew / GitHub 等外部源),用户复制命令自行安装。平台不存任何实际内容。

本设计把它升级为**真正的内容托管**:平台自己存储每个 skill 的实际文件(zip 包),用户从平台下载、交给 AI agent 自动安装。

核心转变:
- 平台从「导购」变成「仓库」。
- 安装入口从「外部命令」变成「平台下载链接 + agent 提示词」。

## 2. 范围

**第一期(本设计):**
- admin 后台手动上传 skill 包(zip),基本校验。
- 平台对象存储(RustFS,S3 兼容)。
- 公开下载接口 + 详情页下载按钮。
- 给 AI agent 的安装提示词(中英双语,内含平台下载链接)。
- 真实下载量统计 + 下载接口限流。

**非目标(留待后续):**
- 多版本管理(第一期单包覆盖)。
- 从外部源自动抓取 / 镜像。
- 用户提交 / 账号(仍属 phase 2)。
- 给人看的图文安装步骤(第一期只做 agent 提示词)。

## 3. 架构总览

在现有架构(Next.js + tRPC + Prisma + Postgres)上增加一条「内容」通路:

```
浏览 / 详情 / 搜索 ──→ tRPC ──→ Postgres(元数据,现有不变)

admin 上传(元数据 + zip)
        └─→ 上传接口(Route Handler, multipart)
                ├─ 校验 zip(合法 + 含 SKILL.md + ≤ 50MB)
                ├─→ RustFS(存包:skills/<id>.zip)
                └─→ Postgres(写 packageKey / Name / Size / UploadedAt)

下载按钮 / agent 提示词
        └─→ GET /api/skills/<id>/download(公开, 限流)
                ├─ 从 RustFS 取包 → 流式返回 zip
                └─ downloads += 1(去重)
```

**核心思路**:元数据继续走 Postgres,**内容(zip)走 RustFS**;数据库里只存一个指向包的「指针」(`packageKey` + 元信息),性质同原来的 `install` 字段 —— 指针从「外部命令」换成「自有存储里的对象」。

新增 5 个组件:

| 组件 | 职责 |
|---|---|
| RustFS 容器 | docker-compose 加一个服务(S3 API :9000),与 Postgres 并列 |
| 存储抽象层 `src/server/storage.ts` | 用 S3 SDK 封装 `put / get / delete`,隔离 RustFS;以后换托管 S3 只改此处 |
| 上传接口(Route Handler) | 收 multipart(元数据 + zip)→ 校验 → 存 RustFS → 写 db |
| 下载接口 `/api/skills/[id]/download` | 从 RustFS 取包流式返回 + 限流 + 计数 |
| agent 提示词模板 | 前端 next-intl 模板(中英),填入下载链接 |

## 4. 数据模型

单包覆盖(一个 skill 最多一个包),包信息直接加在 `Skill` 表,**不单独建 Package 表**。

`Skill` 表改动:

```
移除 ❌
  install                        (指针式遗物)

新增 ➕  —— 包的指针 + 元信息(nullable)
  packageKey         String?     RustFS 对象 key(核心指针)
  packageName        String?     原始 zip 文件名(下载时回此名)
  packageSize        Int?        字节大小(详情页显示 "2.3 MB")
  packageUploadedAt  DateTime?   上传时间

改动 ✏️
  docsUrl            必填 → 可选  (SKILL.md 已在包内,docsUrl 降为可选的额外文档链接)

改名 🔁
  installs → downloads           (从 mock 假数字改为下载接口真实 +1)

保留
  version                        (展示用,admin 覆盖包时顺手改)
```

**关于新字段为何 nullable**:创建必带包(选项 A)由**上传 API 强制**(请求校验 + 后端事务),schema 留 nullable 仅作技术留口(包损坏需清空重传等边缘场景);前台用 `packageKey 是否有值` 决定是否显示下载 UI。正常数据里它一定有值。

## 5. 上传流程

文件上传走专门的 **Route Handler**(`multipart/form-data`),不走 tRPC(tRPC 传二进制不顺手);tRPC 继续只管纯元数据。

**新建 skill(必带包,一步提交、原子):**
```
admin 填元数据 + 选 zip ──→ POST /api/admin/skills  (multipart)
   后端(先验 admin 身份):
     1. 校验 zip:能解压 + 根目录有 SKILL.md + 大小 ≤ 50MB
     2. 存 RustFS:put → key = skills/<id>.zip
     3. 写 db:建 Skill 记录(元数据 + packageKey/Name/Size/UploadedAt)
   逻辑事务:任一步失败 → 回滚 db + 删已传对象,整体失败、重来
```

**编辑已有 skill:**
- 只改元数据(名称 / 描述 / 标签…)→ 走现有 tRPC `update`,不碰包。
- 换包 → `POST /api/admin/skills/<id>/package`(传新 zip)→ 覆盖同一个 `skills/<id>.zip`(单包覆盖,固定 key,put 即覆盖)。

**认证**:上传接口复用 admin 认证(校验 `admin_session` cookie),与 tRPC `protectedProcedure` 同一套验证逻辑。

**校验**:用解压库读 zip,确认根目录存在 `SKILL.md`;超限或非法直接打回。

## 6. 下载 + 安装流程

**下载接口** `GET /api/skills/<id>/download`(公开,无需登录 —— agent 需直接访问,且 curated 市场本就公开):
```
查 db 拿 packageKey ─→ 从 RustFS 取 ─→ 流式返回 zip
   Content-Disposition: attachment; filename="<packageName>"
   downloads += 1(去重)
无包(packageKey 为空)─→ 404
```

**两个入口,共用此接口:**
1. **下载按钮**(详情页,给人):点击直接下 zip;无包时灰掉。
2. **agent 提示词**(详情页「复制提示词」,给 agent):next-intl 中英双语模板,填入该 skill 的**绝对**下载链接。英文示例:
   ```
   Install the "Frontend Design" skill from CherryIN.
   Download: https://<域名>/api/skills/frontend-design/download
   Unzip it into your Claude / Cherry Studio skills directory,
   then read SKILL.md and follow its instructions.
   ```
   用户复制 → 丢给 Claude / agent → 它自己下载、解压、按 SKILL.md 执行。

**限流与计数**(下载接口是公开 + 匿名 + 可拉 50MB 的端点,需防滥用):
- **IP 限流**:每 IP 每分钟最多 30 次下载,超限返回 429。
- **计数去重**:同一 IP 对同一 skill 在 1 小时内只 `+1`,使 `downloads` 更真实。
- 实现走 `RateLimiter` 抽象接口(见 §8),第一期 in-memory。

**绝对 URL 配置**:agent 提示词需带域名的绝对链接,新增站点根地址环境变量(如 `APP_URL`);本地 `http://localhost:3000`,生产填真域名。

## 7. demo 重写 + 数据迁移

**① Schema migration(一次 `prisma migrate`):**
```
移除   install
新增   packageKey / packageName / packageSize / packageUploadedAt
改动   docsUrl → 可选
改名   installs → downloads
```

**② 清空旧 demo + 重写:**
- 删除现有 54 条假数据(假 `install`、无包)。
- 新造约 **5 条**真实的最小样板 skill,每条:
  - 一个真 zip 包:`SKILL.md` 写像样的真内容 + 可选一个示例文件。
  - 元数据契合新模型(无 `install`、有包)。
  - 覆盖不同 domain(Design / Developer Tools / Productivity 等)。
- demo 包文件放 `prisma/demo-packages/<id>.zip`,纳入 git 作为样板素材。

**③ seed 流程改造(内容托管版):**
```
先起 RustFS 容器
for each demo skill:
   读 prisma/demo-packages/<id>.zip
   上传到 RustFS(skills/<id>.zip)
   db 建 Skill 记录(元数据 + packageKey/Size/Name)
```
seed 从此依赖 RustFS(需先起容器),将写入 README。

## 8. 部署与抽象层

**第一期部署**:单机 / Docker 自托管(Postgres + RustFS + Next 同机)。

**为未来(多实例 / 托管化)预留的抽象层:**
- **存储**:`src/server/storage.ts` 用 S3 SDK 抽象,RustFS ↔ 托管 S3 / 阿里云 OSS 可换实现。
- **限流**:`RateLimiter` 接口(如 `check(key, limit, windowMs): Promise<boolean>`),第一期 in-memory 实现;上多实例 / serverless 时换 Redis / Upstash 实现,调用方(下载接口)不变。

## 9. 决策记录

| # | 决策 |
|---|---|
| 1 | 内容来源:admin 后台手动上传(第一期唯一) |
| 2 | 包形态:Claude Skills 结构(SKILL.md + 资源)zip,上传时基本校验 |
| 3 | 存储:RustFS(S3 兼容,Apache 2.0,Docker),代码用 S3 SDK |
| 4 | 包↔skill:单包覆盖,不留历史版本;`version` 保留当展示 |
| 5 | 移除 `install` 字段 |
| 6 | 安装:不做给人的图文;全局统一 agent 提示词模板(中英),填入下载链接 |
| 7 | 下载:下载按钮 + 后端稳定接口 `/api/skills/<id>/download`,流式 + 计数 |
| 8 | `docsUrl` 改可选;`installs` 改名 `downloads`(真实计数) |
| 9 | admin 录入:一步提交(元数据 + zip 一起),包必填、原子 |
| 10 | demo:清空 54 条,重写约 5 条带真包样板 |
| 11 | 下载接口加 IP 限流 + 计数去重 |
| 12 | 第一期单机自托管;存储与限流均做可替换抽象层 |

## 10. 风险与开放问题

- **RustFS 成熟度**:官方 Docker 镜像页标注「暂勿用于生产」。第一期开发 / 内测可用;上线前需评估,或切换到托管 S3(SDK 一致,改动小)。
- **in-memory 限流仅单实例有效**:多实例需换 Redis(已抽象,改动可控)。
- **逻辑事务非真事务**:RustFS 与 Postgres 跨系统,失败补偿(删已传对象 / 回滚记录)需实现稳妥,避免孤儿对象或孤儿记录。
- **demo zip 需真实编写**:5 条样板 skill 的 SKILL.md 要有实际内容,使「下载→解压→agent 执行」链路可真实演示。
