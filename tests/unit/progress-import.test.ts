import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { importProgress } from "../../src/lib/progress";

// Exercise the public browser implementation as well as the typed model.
const shell = readFileSync(
  new URL("../../public/shell.js", import.meta.url),
  "utf8",
);
const browserImport = runInNewContext(
  shell.slice(0, shell.indexOf("function toHex(")) + "\ndecodeImport;",
  { atob, btoa, TextEncoder, TextDecoder },
) as (encoded: string) => unknown;

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64");

for (const [name, decode] of [
  ["typed model", importProgress],
  ["public browser", browserImport],
] as const) {
  describe(`${name}: imported progress validation`, () => {
    it.each([
      null,
      [],
      { unrelated: "not a game backup" },
      { v: 99, solved: {}, hintsUsed: {} },
      { v: 1, solved: [], hintsUsed: {} },
      { v: 1, solved: {}, hintsUsed: [] },
      { v: 1, solved: { challenge: "invalid record" }, hintsUsed: {} },
    ])(
      "rejects an unsupported payload instead of returning empty progress: %j",
      (payload) => {
        expect(() => decode(encode(payload))).toThrow();
      },
    );

    it("retains a valid empty export", () => {
      const progress = { v: 1, solved: {}, hintsUsed: {} };
      expect(decode(encode(progress))).toEqual(progress);
    });

    it("retains every supported solved record and hint", () => {
      const progress = {
        v: 1,
        solved: {
          "01-scrambles-encoding": { at: 123, hintsUsed: 2, gaveUp: false },
        },
        hintsUsed: { "01-scrambles-encoding": 2, "02-knox-client-auth": 1 },
      };
      expect(decode(encode(progress))).toEqual(progress);
    });

    it("migrates a legacy solved list without losing its records", () => {
      expect(
        decode(
          encode({
            solved: ["01-scrambles-encoding"],
            hintsUsed: { "01-scrambles-encoding": 2 },
          }),
        ),
      ).toEqual({
        v: 1,
        solved: {
          "01-scrambles-encoding": { at: 0, hintsUsed: 2, gaveUp: false },
        },
        hintsUsed: { "01-scrambles-encoding": 2 },
      });
    });
  });
}
