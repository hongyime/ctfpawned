import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const tokenSource = readFileSync(
  path.join(process.cwd(), "src", "styles", "tokens.css"),
  "utf8",
);
const tokens = Object.fromEntries(
  [...tokenSource.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map(
    ([, name, value]) => [name, value],
  ),
);
const aaPairs = [
  ["ink", "paper"],
  ["ink", "surface"],
  ["ink", "accent"],
  ["ink", "danger"],
  ["ink", "info"],
  ["ink", "act-1"],
  ["ink", "act-2"],
  ["ink", "act-3"],
  ["surface", "success"],
  ["surface", "error"],
  ["surface", "muted"],
];

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/[0-9a-f]{2}/gi)!
    .map((pair) => Number.parseInt(pair, 16));

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

function contrast(a: string, b: string) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort(
    (left, right) => right - left,
  );

  return (lighter + 0.05) / (darker + 0.05);
}

describe("design tokens", () => {
  it("keeps used foreground/background pairs at WCAG AA contrast", () => {
    for (const [foreground, background] of aaPairs) {
      expect(
        contrast(tokens[foreground], tokens[background]),
        `${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
