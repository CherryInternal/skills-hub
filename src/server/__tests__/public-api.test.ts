import { afterEach, describe, expect, it } from "vitest";
import { env } from "~/env";
import { GET as listGET } from "~/app/api/skills/route";
import { GET as detailGET } from "~/app/api/skills/[id]/route";
import { db } from "~/server/db";

const PUB = "test-pub-skill";
const DRAFT = "test-draft-skill";

async function seed() {
  await db.skill.createMany({
    data: [
      {
        id: PUB,
        nameEn: "Public Test",
        nameZh: "公开测试",
        descriptionEn: "a public skill",
        descriptionZh: "包含唯一词 xyzzy123 的中文描述",
        longDescEn: "the full body",
        domain: "Other",
        author: "tester",
        version: "1.0.0",
        tags: ["alpha"],
        releaseDate: new Date(),
        published: true,
      },
      {
        id: DRAFT,
        nameEn: "Draft Test",
        descriptionEn: "an unpublished skill",
        longDescEn: "hidden body",
        domain: "Other",
        author: "tester",
        version: "1.0.0",
        tags: [],
        releaseDate: new Date(),
        published: false,
      },
    ],
  });
}

function listReq(qs = ""): Request {
  return new Request(`http://localhost/api/skills${qs}`);
}
function detailReq(id: string) {
  return [
    new Request(`http://localhost/api/skills/${id}`),
    { params: Promise.resolve({ id }) },
  ] as const;
}

describe("GET /api/skills (public REST, integration)", () => {
  afterEach(async () => {
    await db.skill.deleteMany({ where: { id: { in: [PUB, DRAFT] } } });
  });

  it("lists published skills only (no drafts), without longDescription", async () => {
    await seed();
    const res = await listGET(listReq("?limit=100"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; longDescription?: unknown; downloadUrl: string | null }>;
    };
    const ids = body.items.map((i) => i.id);
    expect(ids).toContain(PUB);
    expect(ids).not.toContain(DRAFT);
    const pub = body.items.find((i) => i.id === PUB)!;
    expect(pub.longDescription).toBeUndefined(); // list items are trimmed
    expect(pub.downloadUrl).toBeNull(); // no package uploaded
  });

  it("downloadUrl uses APP_URL, not the request host (proxy-safe)", async () => {
    await seed();
    await db.skill.update({
      where: { id: PUB },
      data: { packageKey: "packages/x.zip", packageName: "x.zip", packageSize: 123 },
    });
    // Request arrives on http://localhost (no port) — emulating the internal
    // listener behind nginx. The download link must use the public APP_URL.
    const res = await listGET(listReq("?limit=100"));
    const body = (await res.json()) as {
      items: Array<{ id: string; downloadUrl: string | null }>;
    };
    const pub = body.items.find((i) => i.id === PUB)!;
    expect(pub.downloadUrl).toBe(`${env.APP_URL}/api/skills/${PUB}/download`);
    // Specifically NOT the request origin (http://localhost, no :3000).
    expect(pub.downloadUrl).not.toMatch(/^http:\/\/localhost\//);
  });

  it("searches the Chinese description (descriptionZh)", async () => {
    await seed();
    const res = await listGET(listReq("?q=xyzzy123"));
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(body.items.map((i) => i.id)).toEqual([PUB]);
  });

  it("detail returns full info for a published skill", async () => {
    await seed();
    const res = await detailGET(...detailReq(PUB));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; longDescription: { en: string } };
    expect(body.id).toBe(PUB);
    expect(body.longDescription.en).toBe("the full body");
  });

  it("detail 404s for an unpublished skill (no draft leak)", async () => {
    await seed();
    const res = await detailGET(...detailReq(DRAFT));
    expect(res.status).toBe(404);
  });

  it("400s on out-of-range pagination params", async () => {
    const res = await listGET(listReq("?limit=999"));
    expect(res.status).toBe(400);
  });
});
