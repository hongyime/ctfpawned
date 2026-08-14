import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ChallengeMeta } from "../../src/lib/schema";

const challengesDir = path.join(process.cwd(), "src", "challenges");

export const allChallengeMetas = readdirSync(challengesDir, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const metaPath = path.join(challengesDir, entry.name, "meta.json");
    const raw = JSON.parse(readFileSync(metaPath, "utf8"));
    return ChallengeMeta.parse(raw);
  })
  .sort((a, b) => a.order - b.order);
