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
  // 解压前的 zip 炸弹防护:fflate 的 filter 在每个条目解压**之前**回调,且带有
  // zip 头里声明的解压后大小 originalSize(无需解压即可读)。一旦累计超限就标记
  // 并跳过其余条目,避免 unzipSync 把整个炸弹先解压进内存(原先「先全解压再检查」
  // 为时已晚,压缩后 <50MB 的炸弹仍会 OOM)。
  let uncompressed = 0;
  let tooBig = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf), {
      filter: (file) => {
        uncompressed += file.originalSize;
        if (uncompressed > maxUncompressedBytes) {
          tooBig = true;
          return false; // 不解压该条目及其后续,内存维持在上限内
        }
        return true;
      },
    });
  } catch {
    return { ok: false, error: "这不是有效的 zip 压缩包。" };
  }
  if (tooBig) {
    return {
      ok: false,
      error: `解压后体积超出上限(最大 ${Math.round(maxUncompressedBytes / 1024 / 1024)} MB)。`,
    };
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

const SKILL_MD_MAX_BYTES = 256 * 1024; // SKILL.md 存进 DB 的上限

/**
 * 从 zip 里取 SKILL.md 内容(根目录,或单层顶级目录下)。借 fflate 的 filter 只解压
 * SKILL.md(超过上限或缺失则返回 null),供详情页渲染主体。
 */
export function extractSkillMd(buf: Buffer): string | null {
  const isSkillMd = (name: string) =>
    name === "SKILL.md" || /^[^/]+\/SKILL\.md$/.test(name);
  const files = unzipSync(new Uint8Array(buf), {
    filter: (file) =>
      isSkillMd(file.name) && file.originalSize <= SKILL_MD_MAX_BYTES,
  });
  const key = Object.keys(files).find(isSkillMd);
  if (!key) return null;
  const bytes = files[key];
  return bytes ? new TextDecoder().decode(bytes) : null;
}
