import { afterAll, describe, expect, it } from "vitest";
import {
  deleteObject,
  ensureBucket,
  getPresignedUrl,
  putObject,
} from "../storage";

const KEY = "test/roundtrip.txt";

describe("storage (integration — needs RustFS running)", () => {
  afterAll(async () => {
    await deleteObject(KEY).catch(() => {});
  });

  it("put → presigned GET → fetch returns same bytes", async () => {
    await ensureBucket();
    await putObject(KEY, Buffer.from("hello-content-hosting"), "text/plain");

    const url = await getPresignedUrl(KEY, "roundtrip.txt");
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello-content-hosting");
  });
});
