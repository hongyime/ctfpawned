import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const shell = readFileSync(
  new URL("../../public/shell.js", import.meta.url),
  "utf8",
);
const prefix = shell.slice(0, shell.indexOf("function toHex("));
const key = "ctfpawned:progress";
const saved = {
  v: 1,
  solved: { challenge: { at: 123, hintsUsed: 1, gaveUp: false } },
  hintsUsed: { challenge: 1 },
};

function fixture(raw: string | null, failWrites = false) {
  let stored = raw;
  const api = runInNewContext(prefix + "\n({readProgress, writeProgress});", {
    atob,
    btoa,
    TextEncoder,
    TextDecoder,
    renderProgress: () => {},
    localStorage: {
      getItem: (name: string) => (name === key ? stored : null),
      setItem: (_name: string, value: string) => {
        if (failWrites) throw new Error("storage full");
        stored = value;
      },
    },
  }) as {
    readProgress: () => unknown;
    writeProgress: (value: unknown, replace?: boolean) => unknown;
  };
  return { api, stored: () => stored };
}

describe("browser storage recovery", () => {
  it.each([
    "{broken",
    JSON.stringify({ v: 99, solved: saved.solved, hintsUsed: saved.hintsUsed }),
  ])(
    "preserves unsupported raw storage during reads and gameplay: %s",
    (raw) => {
      const { api, stored } = fixture(raw);
      api.readProgress();
      expect(stored()).toBe(raw);
      api.writeProgress(saved);
      expect(stored()).toBe(raw);
      expect(api.readProgress()).toEqual(saved);
    },
  );

  it("keeps new progress in memory when storage rejects writes", () => {
    const { api, stored } = fixture(null, true);
    api.readProgress();
    expect(() => api.writeProgress(saved)).not.toThrow();
    expect(api.readProgress()).toEqual(saved);
    expect(stored()).toBeNull();
  });

  it("does not accept a failed explicit replacement", () => {
    const { api, stored } = fixture("{broken", true);
    api.readProgress();
    expect(() => api.writeProgress(saved, true)).toThrow();
    expect(stored()).toBe("{broken");
  });
});
