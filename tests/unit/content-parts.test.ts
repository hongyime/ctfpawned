import { describe, expect, it } from "vitest";
import {
  parseHintSections,
  parseRecoveredSection,
} from "../../src/lib/content-parts";

describe("content part parsing", () => {
  it("extracts sequential hint sections", () => {
    expect(parseHintSections("## Hint\n\nfirst\n\n## Hint\n\nsecond")).toEqual([
      "first",
      "second",
    ]);
  });

  it("extracts only the recovered story section", () => {
    expect(
      parseRecoveredSection(
        "## Walkthrough\n\nbody\n\n## Recovered\n\nstory\n\n## Later\n\nnope",
      ),
    ).toBe("story");
  });
});
