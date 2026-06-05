/** 限流抽象 —— 以后换 Redis 实现同一接口即可。 */
export interface RateLimiter {
  /** true = 允许,false = 超限。 */
  check(key: string): boolean;
}

/**
 * 固定窗口计数限流(单进程内存)。
 *
 * 注:这是上 Redis 之前的临时实现。即便如此,单进程内存版也必须有上限/淘汰,
 * 否则按客户端 IP 作 key 的公开下载接口会让每个曾访问过的 IP 永久驻留一条记录
 * —— 在长驻的 Next.js 进程里随 IP 空间扩散无限增长(慢内存泄漏)。
 * 因此过期条目通过两种途径回收:
 *   1. 机会式回收:`check()` 每窗口最多触发一次全量 `sweep()`,这样即便原 IP
 *      永不再访问,后续任意一次访问也会清掉其陈旧条目;
 *   2. 后台定期 `sweep()`(可选,见 `autoSweep`)——为生产单例兜底「完全无流量」
 *      时段的回收,用 `unref()` 确保不阻止进程退出。
 */
export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private lastSweepAt = -Infinity;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
    autoSweep = false,
  ) {
    if (autoSweep) {
      // 后台兜底回收:即便完全没有流量也能清掉陈旧条目。
      // unref() 确保该定时器不阻止 Node 进程退出。
      this.timer = setInterval(() => this.sweep(), this.windowMs);
      this.timer.unref?.();
    }
  }

  check(key: string): boolean {
    const t = this.now();
    // 机会式回收:每窗口最多扫一次,把「永不回访」IP 的过期条目清掉,
    // 同时把 check() 的摊还成本控制在每窗口一次全量扫描。
    if (t - this.lastSweepAt >= this.windowMs) this.sweep(t);

    const entry = this.hits.get(key);
    if (!entry || t >= entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }

  /** 删除窗口已过期(`t >= resetAt`)的条目。可注入 `t` 便于测试。 */
  sweep(t: number = this.now()): void {
    for (const [key, entry] of this.hits) {
      if (t >= entry.resetAt) this.hits.delete(key);
    }
    this.lastSweepAt = t;
  }

  /** 当前驻留的 key 数量(用于观测 / 测试,确认不会无界增长)。 */
  size(): number {
    return this.hits.size;
  }
}

/** 下载接口用:每 IP 每分钟 30 次(开启后台兜底回收,防止 IP 条目无界堆积)。 */
export const downloadRateLimiter = new InMemoryRateLimiter(
  30,
  60_000,
  undefined,
  true,
);

/** 公开 REST 接口(列表 / 详情)用:每 IP 每分钟 120 次。 */
export const publicApiRateLimiter = new InMemoryRateLimiter(
  120,
  60_000,
  undefined,
  true,
);

/**
 * 管理员登录用:每 IP 每 10 分钟 10 次尝试。后台是单一共享 ADMIN_PASSWORD,
 * 失败入口必须挡在线暴力猜密码。每次提交都计数(成功也算 —— 真人管理员一个
 * 窗口内远到不了上限)。
 */
export const adminLoginRateLimiter = new InMemoryRateLimiter(
  10,
  600_000,
  undefined,
  true,
);

// 客户端可任意设置 X-Forwarded-For,而代理通常是「追加」而非「覆盖」,所以 XFF
// 链最左侧(第一个)的值是客户端可控的,绝不能直接当限流 key —— 否则不断更换
// header 即可绕过限流。可信 IP 是我们自己的反代追加在链「右侧」的值。
//
// 取值优先级:平台注入、客户端无法伪造的头(cf-connecting-ip / x-real-ip)>
// 从 XFF 右侧数第 TRUSTED_PROXY_HOPS 个(默认 1 = 紧邻应用那层反代记录的真实
// client IP)> "unknown"。直连(无反代)部署应把 TRUSTED_PROXY_HOPS 设为 0,
// 让 XFF 完全不被信任。
const TRUSTED_PROXY_HOPS = Math.max(
  0,
  Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 0,
);

export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

// 同样的可信-IP 取值逻辑,但接 Headers —— server action 用 next/headers 的
// headers() 只拿得到 headers(没有 Request),登录限流走这个入口。参数放宽到
// 仅需 get(),好让只读的 ReadonlyHeaders 也能传进来。
export function clientIpFromHeaders(headers: Pick<Headers, "get">): string {
  const real =
    headers.get("cf-connecting-ip") ?? headers.get("x-real-ip");
  if (real?.trim()) return real.trim();

  if (TRUSTED_PROXY_HOPS > 0) {
    const xff = headers.get("x-forwarded-for");
    if (xff) {
      const parts = xff
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // 从右往左数:右侧由可信代理追加,左侧(尤其第一个)是客户端可控的。
      const ip = parts[parts.length - TRUSTED_PROXY_HOPS];
      if (ip) return ip;
    }
  }
  return "unknown";
}
