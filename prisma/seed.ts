import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

import { PrismaClient } from "../generated/prisma";
import { ensureBucket, putObject } from "../src/server/storage";
import { SKILLS } from "./demo-seed";

const db = new PrismaClient();

// ESM 下没有 __dirname,从 import.meta.url 推导。
const seedDir = dirname(fileURLToPath(import.meta.url));

function packDemo(id: string): Buffer {
  const dir = join(seedDir, "demo-packages", id);
  const entries: Record<string, Uint8Array> = {};
  for (const name of readdirSync(dir)) {
    entries[name] = new Uint8Array(readFileSync(join(dir, name)));
  }
  return Buffer.from(zipSync(entries));
}

function loc(v: string | { en: string; zh?: string }): { en: string; zh: string | null } {
  if (typeof v === "string") return { en: v, zh: null };
  return { en: v.en, zh: v.zh ?? null };
}

async function main() {
  await ensureBucket();
  let n = 0;
  for (const s of SKILLS) {
    const name = loc(s.name);
    const desc = loc(s.description);
    const long = loc(s.longDescription);
    const zip = packDemo(s.id);
    const key = `skills/${s.id}.zip`;
    await putObject(key, zip);

    await db.skill.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
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
        docsUrl: s.docsUrl ?? null,
        homepage: s.homepage ?? null,
        githubRepoUrl: s.githubRepoUrl ?? null,
        sourceUrl: s.sourceUrl ?? null,
        packageKey: key,
        packageName: `${s.id}.zip`,
        packageSize: zip.byteLength,
        packageUploadedAt: new Date(),
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
