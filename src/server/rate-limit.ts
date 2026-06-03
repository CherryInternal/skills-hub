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
