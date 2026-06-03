import { unzipSync } from "fflate";

export const MAX_PACKAGE_BYTES = 50 * 1024 * 1024; // 50MB (压缩后)
export const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200MB (解压后,防 zip 炸弹)

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * 基本校验:压缩大小 ≤ maxBytes、能解压、解压总大小 ≤ maxUncompressedBytes、含 SKILL.md
 * (接受根目录 SKILL.md,或单层顶级目录下的 SKILL.md —— 打包常带顶层目录)。
 */
export function validateSkillZip(
  buf: Buffer,
  maxBytes = MAX_PACKAGE_BYTES,
  maxUncompressedBytes = MAX_UNCOMPRESSED_BYTES,
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
  let uncompressed = 0;
  for (const entry of Object.values(files)) {
    uncompressed += entry.byteLength;
    if (uncompressed > maxUncompressedBytes) {
      return { ok: false, error: "Uncompressed package exceeds size limit." };
    }
  }
  const hasSkillMd = Object.keys(files).some(
    (name) => name === "SKILL.md" || /^[^/]+\/SKILL\.md$/.test(name),
  );
  if (!hasSkillMd) {
    return { ok: false, error: "Missing SKILL.md in package root." };
  }
  return { ok: true };
}
