import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "../../../../../generated/prisma";
import { isAdminRequest } from "~/server/auth";
import { db } from "~/server/db";
import { validateSkillZip } from "~/server/skill-package";
import { ensureBucket, putObject } from "~/server/storage";

const metaSchema = z.object({
  id: z.string().min(1),
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
  docsUrl: z.string().optional(),
  homepage: z.string().optional(),
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
    return NextResponse.json({ error: "Missing package file." }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid metadata." }, { status: 400 });
  }
  const m = parsed.data;
  const key = `skills/${m.id}.zip`;

  // DB-first ordering: create the row before touching storage. A duplicate id
  // fails here on the unique constraint *before* any object write, so an
  // existing skill's package can never be overwritten (or destructively
  // deleted by a compensation path). Storage is written only after the row is
  // safely reserved.
  let created;
  try {
    created = await db.skill.create({
      data: {
        id: m.id,
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
        docsUrl: m.docsUrl || null,
        homepage: m.homepage || null,
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
  } catch (e) {
    // Only a unique-constraint violation is a real id conflict (409). Any other
    // DB error is a genuine server failure (500), not a mislabeled conflict.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A skill with this id already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create skill." },
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
      { error: "Failed to store package." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: created.id });
}
