import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "~/app/api/admin/skills/[id]/package/route";
import { createAdminSession } from "~/server/auth";
import { db } from "~/server/db";
import { deleteObject } from "~/server/storage";

const ID = "test-repackage-skill";

function bigZip(): Buffer {
  return Buffer.from(zipSync({ "SKILL.md": strToU8("# bigger content " + "x".repeat(500)) }));
}

function post(id: string, pkg: Buffer, cookie?: string): Promise<Response> {
  const f = new FormData();
  f.set("package", new File([pkg], "new.zip", { type: "application/zip" }));
  return POST(
    new Request(`http://localhost/api/admin/skills/${id}/package`, {
      method: "POST",
      body: f,
      headers: cookie ? { cookie } : {},
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/admin/skills/[id]/package (integration)", () => {
  beforeEach(async () => {
    await db.skill.create({
      data: {
        id: ID, nameEn: "T", descriptionEn: "d", longDescEn: "l",
        domain: "Other", author: "t", version: "0.1.0", tags: [],
        releaseDate: new Date(), packageKey: `skills/${ID}.zip`,
        packageName: "old.zip", packageSize: 10,
      },
    });
  });
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("401 without admin cookie", async () => {
    expect((await post(ID, bigZip())).status).toBe(401);
  });

  it("404 for unknown skill", async () => {
    const token = await createAdminSession();
    expect((await post("nope", bigZip(), `admin_session=${token}`)).status).toBe(404);
  });

  it("overwrites package + updates size", async () => {
    const token = await createAdminSession();
    const res = await post(ID, bigZip(), `admin_session=${token}`);
    expect(res.status).toBe(200);
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.packageName).toBe("new.zip");
    expect(row?.packageSize).toBeGreaterThan(10);
  });
});
