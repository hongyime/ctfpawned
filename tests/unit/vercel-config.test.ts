import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const shellCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe("vercel header config", () => {
  const config = JSON.parse(
    readFileSync(path.join(root, "vercel.json"), "utf8"),
  ) as { headers: HeaderRule[] };

  it("keeps shell CSP routes from overlapping target documents", () => {
    const shellSources = config.headers
      .filter((rule) =>
        rule.headers.some(
          (header) =>
            header.key.toLowerCase() === "content-security-policy" &&
            header.value === shellCsp,
        ),
      )
      .map((rule) => rule.source);

    expect(shellSources).toEqual([
      "/",
      "/primer",
      "/primer/(.*)",
      "/writeups",
      "/writeups/(.*)",
      "/about",
      "/about/(.*)",
      "/c/(.*)",
    ]);
    expect(shellSources).not.toContain("/(.*)");
    expect(shellSources.every((source) => !source.startsWith("/targets"))).toBe(
      true,
    );
  });

  it("keeps target CSP routes explicit", () => {
    const targetSources = config.headers
      .filter((rule) => rule.source.startsWith("/targets"))
      .map((rule) => rule.source);

    expect(targetSources).toEqual([
      "/targets/07-bobby-sqli.html",
      "/targets/(.*)",
    ]);
  });
});
