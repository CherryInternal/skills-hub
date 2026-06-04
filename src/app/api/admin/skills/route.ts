import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { validateSkillZip } from "~/server/skill-package";
import { ensureBucket, putObject } from "~/server/storage";

const metaSchema = z.object({
  nameEn: z.string().min(1),
  nameZh: z.string().optional(),
  descriptionEn: z.string(),
  descriptionZh: z.string().optional(),
  longDescEn: z.string(),
  longDescZh: z.string().optional(),
  domain: z.string(),
  author: z.string(),
  version: z.string(),
  tags: z.string(), // 表单里逗号分隔
  githubRepoUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  releaseDate: z.string(),
});

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const fields = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  );
  const parsed = metaSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "元数据校验失败,请检查必填项(如名称、版本)。" },
      { status: 400 },
    );
  }
  const m = parsed.data;
  // Surrogate id: generated server-side, never user-supplied. Doubles as the
  // package filename and the public URL id.
  const id = randomUUID();
  const key = `skills/${id}.zip`;

  // Create the row before touching storage, then roll back the row if the
  // object write fails — so we never leave a skill whose packageKey points at
  // a missing object.
  let created;
  try {
    created = await db.skill.create({
      data: {
        id,
        nameEn: m.nameEn,
        nameZh: m.nameZh || null,
        descriptionEn: m.descriptionEn,
        descriptionZh: m.descriptionZh || null,
        longDescEn: m.longDescEn,
        longDescZh: m.longDescZh || null,
        domain: m.domain,
        author: m.author,
        version: m.version,
        tags: m.tags.split(",").map((t) => t.trim()).filter(Boolean),
        githubRepoUrl: m.githubRepoUrl || null,
        sourceUrl: m.sourceUrl || null,
        packageKey: key,
        packageName: file.name,
        packageSize: buf.byteLength,
        packageUploadedAt: new Date(),
        releaseDate: new Date(m.releaseDate),
        published: true,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "创建 skill 失败。" },
      { status: 500 },
    );
  }

  try {
    await ensureBucket();
    await putObject(key, buf);
  } catch {
    // Storage failed after the row was reserved → roll back the row so we don't
    // leave a skill whose packageKey points at a missing object.
    await db.skill.delete({ where: { id: created.id } }).catch(() => {});
    return NextResponse.json(
      { error: "保存压缩包到存储失败。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: created.id });
}
