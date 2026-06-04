import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter, clientIp } from "../rate-limit";

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

  it("reclaims expired keys that never return (no unbounded growth)", () => {
    let t = 1000;
    const rl = new InMemoryRateLimiter(5, 1000, () => t);
    // Many one-shot visitors that never come back (e.g. distinct IPs).
    for (let i = 0; i < 100; i++) rl.check(`ip-${i}`);
    expect(rl.size()).toBe(100);

    // Window passes; a single later visitor must trigger reclamation of the
    // stale entries even though those original IPs never call check() again.
    t += 1001;
    rl.check("late-visitor");
    expect(rl.size()).toBe(1);
  });

  it("sweep() drops entries whose window has expired", () => {
    let t = 1000;
    const rl = new InMemoryRateLimiter(5, 1000, () => t);
    rl.check("a");
    rl.check("b");
    expect(rl.size()).toBe(2);

    rl.sweep();
    expect(rl.size()).toBe(2); // still within window → kept

    t += 1001;
    rl.sweep();
    expect(rl.size()).toBe(0); // window passed → reclaimed
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://x/", { headers });

  it("uses the rightmost (proxy-added) XFF value, not the spoofable first", () => {
    // Default 1 hop → take the last entry; the client-forged 1.1.1.1 sits on
    // the far left and must not be used as the rate-limit key.
    expect(
      clientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })),
    ).toBe("3.3.3.3");
  });

  it("prefers an unspoofable platform header over XFF", () => {
    expect(
      clientIp(req({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' with no trusted source", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
