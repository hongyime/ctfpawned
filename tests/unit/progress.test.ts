import { describe, expect, it } from "vitest";
import {
  PROGRESS_STORAGE_KEY,
  decodeProgress,
  defaultProgress,
  exportProgress,
  importProgress,
  markGaveUp,
  markHintUsed,
  markSolved,
  repairStoredProgress,
} from "../../src/lib/progress";

describe("progress model", () => {
  it("repairs corrupt storage blobs", () => {
    const storage = { [PROGRESS_STORAGE_KEY]: "{bad json" };
    const progress = repairStoredProgress(storage);

    expect(progress).toEqual(defaultProgress());
    expect(JSON.parse(storage[PROGRESS_STORAGE_KEY] ?? "{}").v).toBe(1);
  });

  it("degrades unknown future versions safely", () => {
    const decoded = decodeProgress(
      JSON.stringify({
        v: 99,
        solved: {
          "01-scrambles-encoding": {
            at: 1,
            hintsUsed: 3,
            gaveUp: true,
          },
        },
      }),
    );

    expect(decoded).toEqual(defaultProgress());
  });

  it("tracks hints, solved state, and give-up state", () => {
    const hinted = markHintUsed(defaultProgress(), "01-scrambles-encoding", 2);
    const solved = markSolved(hinted, "01-scrambles-encoding", { at: 10 });
    const gaveUp = markGaveUp(solved, "01-scrambles-encoding");

    expect(gaveUp.solved["01-scrambles-encoding"]).toEqual({
      at: 10,
      hintsUsed: 2,
      gaveUp: true,
    });
  });

  it("exports and imports a base64 versioned payload", () => {
    const progress = markSolved(defaultProgress(), "02-knox-client-auth", {
      at: 20,
      hintsUsed: 1,
    });

    expect(importProgress(exportProgress(progress))).toEqual(progress);
  });
});
