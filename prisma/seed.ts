import { PrismaClient } from "../generated/prisma";
import { SKILLS } from "../src/components/skills/skills-data";

const db = new PrismaClient();

type Loc = string | { en: string; zh?: string };
function loc(v: Loc | undefined): { en: string; zh: string | null } {
  if (!v) return { en: "", zh: null };
  if (typeof v === "string") return { en: v, zh: null };
  return { en: v.en, zh: v.zh ?? null };
}

async function main() {
  let n = 0;
  for (const s of SKILLS) {
    const name = loc(s.name);
    const desc = loc(s.description);
    const long = loc(s.longDescription);
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
        install: s.install,
        docsUrl: s.docsUrl,
        homepage: s.homepage ?? null,
        githubRepoUrl: s.githubRepoUrl ?? null,
        sourceUrl: s.sourceUrl ?? null,
        installs: s.installs,
        rating: s.rating,
        releaseDate: new Date(s.releaseDate),
        published: true,
      },
    });
    n++;
  }
  console.log(`Seeded ${n} curated skills`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
