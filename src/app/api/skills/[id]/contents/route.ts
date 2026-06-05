import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { clientIp, publicApiRateLimiter } from "~/server/rate-limit";
import { listSkillFiles } from "~/server/skill-package";
import { getObject } from "~/server/storage";

// Public, read-only: lists the files inside a published skill's package so the
// detail page can show its structure. Reads only the zip's central directory
// (no content is decompressed).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!publicApiRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { id } = await params;
  const skill = await db.skill.findFirst({
    where: { id, published: true },
    select: { packageKey: true },
  });
  if (!skill?.packageKey) {
    return NextResponse.json({ error: "No package" }, { status: 404 });
  }
  try {
    const buf = await getObject(skill.packageKey);
    return NextResponse.json({ files: listSkillFiles(buf) });
  } catch {
    return NextResponse.json(
      { error: "Failed to read package." },
      { status: 500 },
    );
  }
}
