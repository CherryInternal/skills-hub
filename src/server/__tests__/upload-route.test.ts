import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "~/app/api/admin/skills/route";
import { createAdminSession } from "~/server/auth";
import { db } from "~/server/db";
import {
  deleteObject,
  ensureBucket,
  getPresignedUrl,
  putObject,
} from "~/server/storage";

const ID = "test-upload-skill";

function zip(): Buffer {
  return Buffer.from(zipSync({ "SKILL.md": strToU8("# test skill") }));
}

function form(pkg: Buffer): FormData {
  const f = new FormData();
  f.set("package", new File([new Uint8Array(pkg)], "skill.zip", { type: "application/zip" }));
  const meta: Record<string, string> = {
    id: ID,
    nameEn: "Test",
    descriptionEn: "d",
    longDescEn: "ld",
    domain: "Other",
    author: "tester",
    version: "0.1.0",
    tags: "a,b",
    releaseDate: "2026-01-01",
  };
  for (const [k, v] of Object.entries(meta)) f.set(k, v);
  return f;
}

function post(f: FormData, cookie?: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/admin/skills", {
      method: "POST",
      body: f,
      headers: cookie ? { cookie } : {},
    }),
  );
}

describe("POST /api/admin/skills (integration)", () => {
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("401 without admin cookie", async () => {
    expect((await post(form(zip()))).status).toBe(401);
  });

  it("creates skill + stores package with valid cookie", async () => {
    const token = await createAdminSession();
    const res = await post(form(zip()), `admin_session=${token}`);
    expect(res.status).toBe(200);
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.packageKey).toBe(`skills/${ID}.zip`);
    expect(row?.downloads).toBe(0);
  });

  it("400 on invalid zip", async () => {
    const token = await createAdminSession();
    const res = await post(form(Buffer.from("not a zip")), `admin_session=${token}`);
    expect(res.status).toBe(400);
  });

  it("conflicts on duplicate id without clobbering the existing package", async () => {
    const key = `skills/${ID}.zip`;
    // Pre-seed an existing skill whose package object holds known bytes.
    await ensureBucket();
    const original = Buffer.from(zipSync({ "SKILL.md": strToU8("# ORIGINAL") }));
    await putObject(key, original);
    await db.skill.create({
      data: {
        id: ID,
        nameEn: "Existing",
        descriptionEn: "d",
        longDescEn: "l",
        domain: "Other",
        author: "owner",
        version: "1.0.0",
        tags: [],
        releaseDate: new Date(),
        packageKey: key,
        packageName: "existing.zip",
        packageSize: original.byteLength,
        packageUploadedAt: new Date(),
      },
    });

    // A different uploader reuses the same id with different bytes.
    const token = await createAdminSession();
    const res = await post(form(zip()), `admin_session=${token}`);

    // Must signal conflict, never 200/success.
    expect(res.status).toBe(409);

    // The existing skill's package object must be untouched (same bytes).
    const url = await getPresignedUrl(key, "check.zip");
    const fetched = await fetch(url);
    expect(fetched.status).toBe(200);
    const bytes = Buffer.from(await fetched.arrayBuffer());
    expect(bytes.equals(original)).toBe(true);

    // And the existing skill row is unchanged.
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.packageName).toBe("existing.zip");
    expect(row?.author).toBe("owner");
  });
});
