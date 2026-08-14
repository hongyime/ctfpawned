import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("README local links", () => {
  it("points only at local files or directories that exist", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    const localLinks = Array.from(readme.matchAll(/\]\((\.\/[^)#]+)[^)]*\)/g));

    expect(localLinks.length).toBeGreaterThan(0);

    for (const [, link] of localLinks) {
      expect(existsSync(path.join(root, link))).toBe(true);
    }
  });
});
