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
    return {
      ok: false,
      error: `压缩包体积超出上限(最大 ${Math.round(maxBytes / 1024 / 1024)} MB)。`,
    };
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf));
  } catch {
    return { ok: false, error: "这不是有效的 zip 压缩包。" };
  }
  let uncompressed = 0;
  for (const entry of Object.values(files)) {
    uncompressed += entry.byteLength;
    if (uncompressed > maxUncompressedBytes) {
      return {
        ok: false,
        error: `解压后体积超出上限(最大 ${Math.round(maxUncompressedBytes / 1024 / 1024)} MB)。`,
      };
    }
  }
  const hasSkillMd = Object.keys(files).some(
    (name) => name === "SKILL.md" || /^[^/]+\/SKILL\.md$/.test(name),
  );
  if (!hasSkillMd) {
    return {
      ok: false,
      error: "压缩包里找不到 SKILL.md(需放在根目录,或单个顶层文件夹内)。",
    };
  }
  return { ok: true };
}
