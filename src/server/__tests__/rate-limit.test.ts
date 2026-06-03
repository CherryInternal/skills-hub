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
