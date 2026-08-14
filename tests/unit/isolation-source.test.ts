import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

describe("isolation source invariants", () => {
  it("keeps ChallengeFrame sandbox tokens exact", () => {
    const source = readFileSync(
      path.join(root, "src", "components", "ChallengeFrame.astro"),
      "utf8",
    );

    expect(source).toContain('sandbox="allow-scripts"');
    expect(source).not.toMatch(/allow-same-origin|allow-forms|allow-popups/);
    expect(source).not.toMatch(/allow-top-navigation|allow-modals/);
  });

  it("does not register parent message listeners in trusted source", () => {
    const trustedFiles = [
      ...walkFiles(path.join(root, "src")).filter(
        (file) => !file.includes(`${path.sep}targets${path.sep}`),
      ),
      path.join(root, "public", "shell.js"),
    ];
    const listeners = trustedFiles
      .map((file) => ({
        file,
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ source }) =>
        /addEventListener\s*\(\s*["']message["']/.test(source),
      );

    expect(listeners).toEqual([]);
  });
});
