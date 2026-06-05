import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MAX_PACKAGE_BYTES, materializeSkillFiles, validateSkillZip } from "../skill-package";

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

  it("rejects when uncompressed size exceeds limit (zip-bomb guard)", () => {
    // Highly compressible payload: tiny compressed size, large uncompressed.
    const zip = makeZip({ "SKILL.md": "# hi", "big.txt": "a".repeat(1000) });
    // compressed bytes are well under default 50MB, but uncompressed > 50 bytes.
    const res = validateSkillZip(zip, MAX_PACKAGE_BYTES, 50);
    expect(res.ok).toBe(false);
  });
});

describe("materializeSkillFiles", () => {
  it("returns path + size + text for small text files (incl. nested dirs)", () => {
    const zip = makeZip({ "SKILL.md": "# hi", "scripts/run.sh": "echo hi" });
    const files = materializeSkillFiles(zip);
    expect(files.map((f) => f.path).sort()).toEqual([
      "SKILL.md",
      "scripts/run.sh",
    ]);
    const skillMd = files.find((f) => f.path === "SKILL.md");
    expect(skillMd?.size).toBe(4); // "# hi"
    expect(skillMd?.text).toBe("# hi");
  });

  it("keeps size but drops text for files over the per-file limit", () => {
    const zip = makeZip({ "SKILL.md": "# hi", "big.txt": "a".repeat(2000) });
    const files = materializeSkillFiles(zip, { maxFileBytes: 100 });
    const big = files.find((f) => f.path === "big.txt");
    expect(big?.size).toBe(2000);
    expect(big?.text).toBeNull();
    expect(files.find((f) => f.path === "SKILL.md")?.text).toBe("# hi");
  });
});
