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
