import { NextResponse } from "next/server";

import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { validateSkillZip } from "~/server/skill-package";
import { ensureBucket, putObject } from "~/server/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await db.skill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("package");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing package file." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const valid = validateSkillZip(buf);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const key = `skills/${id}.zip`;
  await ensureBucket();
  await putObject(key, buf); // 固定 key,put 即覆盖
  await db.skill.update({
    where: { id },
    data: {
      packageKey: key,
      packageName: file.name,
      packageSize: buf.byteLength,
      packageUploadedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
