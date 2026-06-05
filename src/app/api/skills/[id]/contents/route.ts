import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { clientIp, publicApiRateLimiter } from "~/server/rate-limit";
import { materializeSkillFiles } from "~/server/skill-package";
import { getObject } from "~/server/storage";

// Public, read-only: lists a published skill's package contents (file tree +
// short text). Served from the materialized `packageFiles` column (no S3 hit);
// only falls back to fetching + decompressing the zip when it's missing
// (legacy/not-yet-materialized rows), then backfills it.
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
    select: { packageKey: true, packageFiles: true },
  });
  if (!skill?.packageKey) {
    return NextResponse.json({ error: "No package" }, { status: 404 });
  }

  // Materialized hit — no S3 access.
  if (skill.packageFiles) {
    return NextResponse.json({ files: skill.packageFiles });
  }

  // Lazy fallback: fetch + materialize once, then backfill the column.
  try {
    const buf = await getObject(skill.packageKey);
    const files = materializeSkillFiles(buf);
    await db.skill
      .update({ where: { id }, data: { packageFiles: files } })
      .catch(() => {});
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json(
      { error: "Failed to read package." },
      { status: 500 },
    );
  }
}
