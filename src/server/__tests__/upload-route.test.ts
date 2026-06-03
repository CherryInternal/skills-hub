import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "~/app/api/admin/skills/route";
import { createAdminSession } from "~/server/auth";
import { db } from "~/server/db";
import { deleteObject } from "~/server/storage";

const ID = "test-upload-skill";

function zip(): Buffer {
  return Buffer.from(zipSync({ "SKILL.md": strToU8("# test skill") }));
}

function form(pkg: Buffer): FormData {
  const f = new FormData();
  f.set("package", new File([pkg], "skill.zip", { type: "application/zip" }));
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
});
