import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { clientIp, publicApiRateLimiter } from "~/server/rate-limit";
import { toPublicSkillDetail } from "~/server/skill-query";

// Public, read-only detail endpoint: a single published skill (full info).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!publicApiRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { id } = await params;
  const row = await db.skill.findFirst({ where: { id, published: true } });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(toPublicSkillDetail(row, new URL(req.url).origin));
}
