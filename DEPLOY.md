# 生产部署(docker-compose)

一条 `docker compose` 起整套:**app + Postgres + RustFS**。app 容器化(`Dockerfile`),
db/rustfs 只在 compose 内网,**外部用你自己的 nginx 反代 + TLS**。

## 步骤

```bash
# 1. 准备 secrets
cp .env.production.example .env
#   编辑 .env:把所有 __CHANGE_ME__ 换成强密码;AUTH_SECRET 用 openssl rand -base64 32

# 2. 构建并启动(app + db + rustfs)
docker compose -f docker-compose.prod.yml up -d --build

# 3. (可选)灌入 demo 样板数据
docker compose -f docker-compose.prod.yml run --rm app pnpm exec tsx prisma/seed.ts
```

- 首次启动 app 容器会自动 `prisma db push` 建表(我们不维护迁移历史,db push 幂等,每次启动跑都安全)。
- 数据持久在两个 volume:`pgdata`(Postgres)、`rustfs_data`(对象存储)。

## 网络拓扑

```
浏览器 ──TLS──> nginx ──┬─ skills.example.com  → 127.0.0.1:3000 (app)
                        └─ storage.example.com → 127.0.0.1:9000 (rustfs)
内部(compose 网络):app → db:5432 / rustfs:9000
```

- `db` 不开放任何端口;`rustfs`/`app` 只绑 `127.0.0.1`,由 nginx 反代,不直接暴露公网。

### 为什么 RustFS 也要反代到公网

下载走**预签名 URL**,浏览器**直连** RustFS(后端不经手文件)。所以 `.env` 里的
`S3_ENDPOINT` 必须填**客户端能访问的公网地址**(如 `https://storage.example.com`),
nginx 把它反代到 `127.0.0.1:9000`。**不能**填内网的 `http://rustfs:9000`,否则浏览器
拿到的下载链接打不开。

> 注:当前上传 / 列文件也用同一个 `S3_ENDPOINT`(即走公网绕一圈)。量小可接受;
> 以后要优化可在 `storage.ts` 拆「内网上传 endpoint + 公网预签名 endpoint」。

### nginx 反代示例

```nginx
# 应用
server {
  server_name skills.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # 用 $remote_addr(真实源),覆盖式
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # listen 443 ssl; ... 证书略
}

# 对象存储(供下载预签名直连)
server {
  server_name storage.example.com;
  client_max_body_size 50m;   # 与 MAX_PACKAGE_BYTES 对齐
  location / {
    proxy_pass http://127.0.0.1:9000;
    proxy_set_header Host $host;
  }
  # listen 443 ssl; ...
}
```

`X-Forwarded-For` 用 `$remote_addr`(nginx 直接看到的客户端 IP)覆盖式写入,配合
`.env` 的 `TRUSTED_PROXY_HOPS=1`,限流就能拿到真实客户端 IP。

## 常用运维

```bash
docker compose -f docker-compose.prod.yml logs -f app     # 看日志
docker compose -f docker-compose.prod.yml up -d --build    # 更新代码后重建
docker compose -f docker-compose.prod.yml down             # 停(保留数据)
```

## 注意

- **RustFS 官方标「暂勿用于生产」**。小规模/内部可接受;对可靠性要求高时,
  把 `S3_ENDPOINT/KEY` 换成 MinIO 或托管 S3(Cloudflare R2 / AWS S3)即可,
  **不用改代码**(`storage.ts` 已抽象为 S3 SDK)。
- `ADMIN_PASSWORD` 默认开发值是 `changeme-dev`,**生产务必改**。
- `.env` 含明文密码,**不要提交到 git**(已在 .gitignore)。
