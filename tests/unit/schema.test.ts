import { describe, expect, it } from "vitest";
import { ChallengeMeta } from "../../src/lib/schema";

const validMeta = {
  slug: "01-scrambles-encoding",
  order: 1,
  act: 1,
  cat: "Scrambles",
  title: "Encoding mistaken for encryption",
  tagline: "Decode the session blob and work out what did not get encrypted.",
  vulnClass: "Encoding mistaken for encryption",
  difficulty: 1,
  tags: ["encoding"],
  flagHash: "a".repeat(64),
  frameHeight: 420,
};

describe("ChallengeMeta", () => {
  it("accepts valid metadata and fills defaults", () => {
    const parsed = ChallengeMeta.parse(validMeta);

    expect(parsed.status).toBe("draft");
    expect(parsed.targetCsp).toEqual({ connectSrc: "'none'", wasm: false });
  });

  it("rejects malformed metadata", () => {
    expect(() =>
      ChallengeMeta.parse({ ...validMeta, slug: "bad slug" }),
    ).toThrow();
  });
});
