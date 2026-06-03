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
