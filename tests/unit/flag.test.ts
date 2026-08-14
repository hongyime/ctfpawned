import { describe, expect, it } from "vitest";
import { hashFlag, verifyFlag } from "../../src/lib/flag";

describe("flag verification", () => {
  it("accepts a correct flag after trimming and case normalization", async () => {
    const slug = "01-scrambles-encoding";
    const flag = "ctfpawned{ABCDEF0123456789ABCDEFGHJK}";
    const hash = await hashFlag(slug, flag);

    await expect(
      verifyFlag(slug, `  ${flag.toUpperCase()}  `, hash),
    ).resolves.toBe(true);
  });

  it("domain-separates hashes by slug", async () => {
    const hash = await hashFlag("01-scrambles-encoding", "ctfpawned{same}");

    await expect(
      verifyFlag("02-knox-client-auth", "ctfpawned{same}", hash),
    ).resolves.toBe(false);
  });
});
