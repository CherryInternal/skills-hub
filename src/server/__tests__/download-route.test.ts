import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "~/app/api/skills/[id]/download/route";
import { db } from "~/server/db";
import { deleteObject, ensureBucket, putObject } from "~/server/storage";

const ID = "test-download-skill";

function get(id: string, ip = "9.9.9.9"): Promise<Response> {
  return GET(
    new Request(`http://localhost/api/skills/${id}/download`, {
      headers: { "x-forwarded-for": ip },
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/skills/[id]/download (integration)", () => {
  beforeEach(async () => {
    await ensureBucket();
    await putObject(`skills/${ID}.zip`, Buffer.from(zipSync({ "SKILL.md": strToU8("# t") })));
    await db.skill.create({
      data: {
        id: ID, nameEn: "T", descriptionEn: "d", longDescEn: "l",
        domain: "Other", author: "t", version: "0.1.0", tags: [],
        releaseDate: new Date(), packageKey: `skills/${ID}.zip`, packageName: "t.zip",
      },
    });
  });
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: ID } });
    await deleteObject(`skills/${ID}.zip`).catch(() => {});
  });

  it("302 to presigned url + increments downloads", async () => {
    const res = await get(ID);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("X-Amz-Signature");
    const row = await db.skill.findUnique({ where: { id: ID } });
    expect(row?.downloads).toBe(1);
  });

  it("404 when no package", async () => {
    await db.skill.update({ where: { id: ID }, data: { packageKey: null } });
    expect((await get(ID)).status).toBe(404);
  });

  it("sanitizes CRLF in packageName so the redirect location stays single-line", async () => {
    await db.skill.update({
      where: { id: ID },
      data: { packageName: 'evil\r\nSet-Cookie: x=1";name.zip' },
    });
    const res = await get(ID);
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).not.toContain("\r");
    expect(location).not.toContain("\n");
  });
});
