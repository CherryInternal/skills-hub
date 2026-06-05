import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

import { PrismaClient } from "../generated/prisma";
import { extractSkillMd } from "../src/server/skill-package";
import { ensureBucket, putObject } from "../src/server/storage";
import { SKILLS } from "./demo-seed";

const db = new PrismaClient();

// ESM 下没有 __dirname,从 import.meta.url 推导。
const seedDir = dirname(fileURLToPath(import.meta.url));

function packDemo(slug: string): Buffer {
  const root = join(seedDir, "demo-packages", slug);
  const entries: Record<string, Uint8Array> = {};
  // 递归遍历:支持子目录,zip 内保留相对路径(如 scripts/run.sh)。
  const walk = (dir: string, prefix: string) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(full, rel);
      else entries[rel] = new Uint8Array(readFileSync(full));
    }
  };
  walk(root, "");
  return Buffer.from(zipSync(entries));
}

function loc(v: string | { en: string; zh?: string }): { en: string; zh: string | null } {
  if (typeof v === "string") return { en: v, zh: null };
  return { en: v.en, zh: v.zh ?? null };
}

async function main() {
  await ensureBucket();
  // Demo 重建:清空后重新灌入(seed 仅用于开发样板数据,生产不跑)。
  await db.skill.deleteMany({});
  let n = 0;
  for (const s of SKILLS) {
    const name = loc(s.name);
    const desc = loc(s.description);
    const long = loc(s.longDescription);
    const zip = packDemo(s.slug);
    // Surrogate uuid primary key; the package object is keyed by it too.
    const id = randomUUID();
    const key = `skills/${id}.zip`;
    await putObject(key, zip);

    await db.skill.create({
      data: {
        id,
        nameEn: name.en,
        nameZh: name.zh,
        descriptionEn: desc.en,
        descriptionZh: desc.zh,
        longDescEn: long.en,
        longDescZh: long.zh,
        domain: s.domain,
        author: s.author,
        version: s.version,
        tags: s.tags,
        githubRepoUrl: null,
        sourceUrl: null,
        packageKey: key,
        packageName: `${s.slug}.zip`,
        packageSize: zip.byteLength,
        packageUploadedAt: new Date(),
        skillMd: extractSkillMd(zip),
        downloads: 0,
        releaseDate: new Date(s.releaseDate),
        published: true,
      },
    });
    n++;
  }
  console.log(`Seeded ${n} curated skills (with packages)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
