import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { downloadRateLimiter } from "~/server/rate-limit";
import { getPresignedUrl } from "~/server/storage";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!downloadRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const skill = await db.skill.findUnique({
    where: { id },
    select: { packageKey: true, packageName: true },
  });
  if (!skill?.packageKey) {
    return NextResponse.json({ error: "No package" }, { status: 404 });
  }

  await db.skill.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  });

  const url = await getPresignedUrl(
    skill.packageKey,
    skill.packageName ?? `${id}.zip`,
  );
  return NextResponse.redirect(url, 302);
}
