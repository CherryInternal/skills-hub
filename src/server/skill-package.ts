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

export const MATERIALIZE_MAX_FILE_BYTES = 256 * 1024; // 单文件存文本上限
export const MATERIALIZE_MAX_TOTAL_BYTES = 2 * 1024 * 1024; // 一个包存文本总上限

export type MaterializedFile = {
  path: string;
  size: number; // 解压后字节
  text: string | null; // 文本内容(限长内);二进制或超限为 null,只留路径
};

// 简单启发:开头若干字节含 NUL 即视为二进制。
function isBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8000);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

/**
 * 解压 zip 并「物化」成展示数据:每个文件的 path + 解压后 size,以及**小文本文件**的
 * 内容(带单文件 / 总量上限;二进制或超限的 text 为 null,只留路径)。供详情页文件
 * 浏览器展示,物化进 DB 后即可零回源。借 fflate 的 filter 只解压要存文本的小文件,
 * 大文件只读元数据,避免把大 / 二进制内容读进内存。
 */
export function materializeSkillFiles(
  buf: Buffer,
  opts: { maxFileBytes?: number; maxTotalBytes?: number } = {},
): MaterializedFile[] {
  const maxFileBytes = opts.maxFileBytes ?? MATERIALIZE_MAX_FILE_BYTES;
  const maxTotalBytes = opts.maxTotalBytes ?? MATERIALIZE_MAX_TOTAL_BYTES;
  const meta: { path: string; size: number; wantText: boolean }[] = [];
  let textBudget = maxTotalBytes;
  const decompressed = unzipSync(new Uint8Array(buf), {
    filter: (file) => {
      if (file.name.endsWith("/")) return false; // 跳过纯目录条目
      const wantText =
        file.originalSize <= maxFileBytes &&
        textBudget - file.originalSize >= 0;
      meta.push({ path: file.name, size: file.originalSize, wantText });
      if (wantText) textBudget -= file.originalSize;
      return wantText; // 只解压要存文本的小文件;大 / 超限只读元数据
    },
  });
  return meta.map((m) => {
    let text: string | null = null;
    if (m.wantText) {
      const bytes = decompressed[m.path];
      if (bytes && !isBinary(bytes)) text = new TextDecoder().decode(bytes);
    }
    return { path: m.path, size: m.size, text };
  });
}
