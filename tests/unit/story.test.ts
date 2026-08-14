import path from "node:path";
import { describe, expect, it } from "vitest";
import { getStoryCatalog } from "../../src/lib/story";

describe("story catalog", () => {
  it("falls back to a plain challenge catalog when story.json is absent", () => {
    const missingPath = path.join(
      process.cwd(),
      "src",
      "content",
      "missing-story.json",
    );

    expect(getStoryCatalog(missingPath)).toMatchObject({
      enabled: false,
      acts: [
        { id: 1, title: "Challenges" },
        { id: 2, title: "Challenges" },
        { id: 3, title: "Challenges" },
      ],
    });
  });
});
