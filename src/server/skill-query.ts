import { env } from "~/env";
import type { Prisma, Skill as SkillRow } from "../../generated/prisma";

// Shared list query + public serialization, used by both the tRPC `skill.list`
// (internal/front-end) and the public REST `GET /api/skills` (external clients),
// so search/sort/filter logic lives in one place.

// Public, client-reachable origin for absolute links. MUST come from APP_URL,
// not the request URL — behind the documented nginx proxy the request resolves
// to the internal listener (e.g. http://localhost:3000), which would hand REST
// clients unusable download URLs.
function publicOrigin(): string {
  return env.APP_URL.replace(/\/+$/, "");
}

export type SkillSort = "popular" | "newest" | "name_asc";

export const SKILL_ORDER: Record<SkillSort, Prisma.SkillOrderByWithRelationInput> = {
  popular: { downloads: "desc" },
  newest: { releaseDate: "desc" },
  name_asc: { nameEn: "asc" },
};

// Builds the `where` for published skills + optional domain filter + keyword
// search. Search spans EN/ZH name, EN/ZH description, author, and exact tags.
export function buildSkillWhere(params: {
  domain?: string;
  q?: string;
}): Prisma.SkillWhereInput {
  const where: Prisma.SkillWhereInput = { published: true };
  if (params.domain) where.domain = params.domain;
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameZh: { contains: q, mode: "insensitive" } },
      { descriptionEn: { contains: q, mode: "insensitive" } },
      { descriptionZh: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }
  return where;
}

// Public API list item — a stable JSON contract. Omits the full longDescription
// body (that's only on the detail endpoint) to keep list payloads light.
export function toPublicSkill(row: SkillRow) {
  return {
    id: row.id,
    name: { en: row.nameEn, zh: row.nameZh },
    description: { en: row.descriptionEn, zh: row.descriptionZh },
    domain: row.domain,
    author: row.author,
    version: row.version,
    tags: row.tags,
    downloads: row.downloads,
    githubRepoUrl: row.githubRepoUrl,
    sourceUrl: row.sourceUrl,
    hasPackage: row.packageKey != null,
    packageName: row.packageName,
    packageSize: row.packageSize,
    releaseDate: row.releaseDate.toISOString().slice(0, 10),
    // Absolute, stable download endpoint (302s to a presigned URL); null if no package.
    downloadUrl: row.packageKey
      ? `${publicOrigin()}/api/skills/${row.id}/download`
      : null,
  };
}

// Detail = list item + the full longDescription body.
export function toPublicSkillDetail(row: SkillRow) {
  return {
    ...toPublicSkill(row),
    longDescription: { en: row.longDescEn, zh: row.longDescZh },
  };
}
