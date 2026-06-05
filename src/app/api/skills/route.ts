import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";
import { clientIp, publicApiRateLimiter } from "~/server/rate-limit";
import { buildSkillWhere, SKILL_ORDER, toPublicSkill } from "~/server/skill-query";

const querySchema = z.object({
  q: z.string().optional(),
  domain: z.string().optional(),
  sort: z.enum(["popular", "newest", "name_asc"]).default("popular"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Public, read-only catalog endpoint: lists published skills with pagination,
// domain filter and keyword search. No auth (only published data is exposed).
export async function GET(req: Request) {
  if (!publicApiRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters." },
      { status: 400 },
    );
  }
  const { q, domain, sort, limit, offset } = parsed.data;

  const where = buildSkillWhere({ q, domain });
  const [rows, total] = await Promise.all([
    db.skill.findMany({
      where,
      orderBy: SKILL_ORDER[sort],
      take: limit,
      skip: offset,
    }),
    db.skill.count({ where }),
  ]);

  return NextResponse.json({
    items: rows.map((r) => toPublicSkill(r)),
    pagination: { total, limit, offset, hasMore: offset + rows.length < total },
  });
}
