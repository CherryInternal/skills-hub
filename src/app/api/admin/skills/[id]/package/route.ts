import { NextResponse } from "next/server";

import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { extractSkillMd, validateSkillZip } from "~/server/skill-package";
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
    return NextResponse.json({ error: "找不到该 skill。" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("package");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 zip 包文件。" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const valid = validateSkillZip(buf);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const key = `skills/${id}.zip`;

  // Storage-first, then metadata. The key is fixed (`skills/<id>.zip`), so
  // putObject overwrites in place — there is no orphan to clean up and no
  // rollback needed: a failed put leaves the previous valid object untouched,
  // and a failed update after a successful put only leaves stale
  // packageName/packageSize while the (new) object is already valid. Both ops
  // are wrapped so a storage outage or DB failure surfaces as the project's
  // { error } JSON (500) rather than an unstyled Next.js 500.
  try {
    await ensureBucket();
    await putObject(key, buf); // 固定 key,put 即覆盖
  } catch {
    return NextResponse.json(
      { error: "保存压缩包到存储失败。" },
      { status: 500 },
    );
  }

  try {
    await db.skill.update({
      where: { id },
      data: {
        packageKey: key,
        packageName: file.name,
        packageSize: buf.byteLength,
        packageUploadedAt: new Date(),
        skillMd: extractSkillMd(buf),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "更新 skill 包元数据失败。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
