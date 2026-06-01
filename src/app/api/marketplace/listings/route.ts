import { NextResponse } from "next/server";
import {
  SKILLS,
  ALL_THIRD_PARTY_SKILLS,
  THIRD_PARTY_FEED_NAMES,
  pickLocale,
  type Skill,
} from "@/components/skills/skills-data";

// Public marketplace listings API consumed by Cherry Studio and third-party
// clients. Returns curated + third-party skills with stable shape.
//
// GET /api/marketplace/listings
//   ?source=curated|third_party|all   (default: all)
//   ?category=skill|cli               (optional)
//   ?domain=AI+%26+Agents             (optional)
//   ?q=search                          (optional)
//   ?limit=50                          (default 200, max 500)
//   ?offset=0                          (default 0)
//
// Anonymous / public — no PII, no auth required.

export const dynamic = "force-static";
export const revalidate = 300; // ISR: re-cache every 5 min

interface Query {
  source: "curated" | "third_party" | "all";
  category?: "skill" | "cli";
  domain?: string;
  q?: string;
  limit: number;
  offset: number;
}

function parseQuery(searchParams: URLSearchParams): Query {
  const source = (searchParams.get("source") ?? "all") as Query["source"];
  const limitRaw = Number(searchParams.get("limit") ?? "200");
  const offsetRaw = Number(searchParams.get("offset") ?? "0");
  return {
    source: ["curated", "third_party", "all"].includes(source)
      ? source
      : "all",
    category:
      searchParams.get("category") === "cli"
        ? "cli"
        : searchParams.get("category") === "skill"
          ? "skill"
          : undefined,
    domain: searchParams.get("domain") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: Math.min(500, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200)),
    offset: Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0),
  };
}

function filterSkills(list: Skill[], q: Query): Skill[] {
  let out = list;
  if (q.category) out = out.filter((s) => s.category === q.category);
  if (q.domain) out = out.filter((s) => s.domain === q.domain);
  if (q.q) {
    const needle = q.q.toLowerCase();
    out = out.filter(
      (s) =>
        pickLocale(s.name, "en").toLowerCase().includes(needle) ||
        pickLocale(s.description, "en").toLowerCase().includes(needle) ||
        s.author.toLowerCase().includes(needle) ||
        s.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }
  return out;
}

function publicSkill(s: Skill) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    domain: s.domain,
    author: s.author,
    version: s.version,
    description: s.description,
    longDescription: s.longDescription,
    tags: s.tags,
    installs: s.installs,
    rating: s.rating,
    install: s.install,
    docsUrl: s.docsUrl,
    homepage: s.homepage,
    githubRepoUrl: s.githubRepoUrl,
    sourceUrl: s.sourceUrl,
    releaseDate: s.releaseDate,
    source: s.source ?? "curated",
    sourceFeed: s.sourceFeed,
  };
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = parseQuery(searchParams);

  const curated =
    q.source === "third_party"
      ? []
      : filterSkills(
          SKILLS.map((s) => ({ ...s, source: s.source ?? "curated" as const })),
          q,
        );
  const thirdParty =
    q.source === "curated"
      ? []
      : filterSkills(
          ALL_THIRD_PARTY_SKILLS.map((s) => ({
            ...s,
            source: "third_party" as const,
          })),
          q,
        );

  const combined = [...curated, ...thirdParty];
  const total = combined.length;
  const slice = combined.slice(q.offset, q.offset + q.limit).map(publicSkill);

  return NextResponse.json(
    {
      ok: true,
      total,
      offset: q.offset,
      limit: q.limit,
      counts: {
        curated: curated.length,
        thirdParty: thirdParty.length,
      },
      feeds: THIRD_PARTY_FEED_NAMES,
      items: slice,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
