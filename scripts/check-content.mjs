import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChallengeMeta } from "./challenge-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const challengesDir = path.join(root, "src", "challenges");
const requiredFiles = [
  "meta.json",
  "brief.mdx",
  "hints.mdx",
  "solution.mdx",
  "target.html",
  "solve.ts",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function collectHeadingCount(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, "gim");
  return [...markdown.matchAll(pattern)].length;
}

async function checkChallenge(entry, seen) {
  const challengeDir = path.join(challengesDir, entry.name);
  const metaPath = path.join(challengeDir, "meta.json");
  const meta = ChallengeMeta.parse(
    JSON.parse(await readFile(metaPath, "utf8")),
  );

  if (meta.slug !== entry.name) {
    throw new Error(`${entry.name}: meta.slug must match directory name`);
  }

  for (const [field, value] of [
    ["slug", meta.slug],
    ["order", meta.order],
    ["flagHash", meta.flagHash],
  ]) {
    const prior = seen[field].get(value);
    if (prior) {
      throw new Error(`${entry.name}: duplicate ${field} with ${prior}`);
    }
    seen[field].set(value, entry.name);
  }

  if (meta.status !== "ready") {
    return;
  }

  for (const file of requiredFiles) {
    if (!(await exists(path.join(challengeDir, file)))) {
      throw new Error(`${entry.name}: missing ${file}`);
    }
  }

  const hints = await readFile(path.join(challengeDir, "hints.mdx"), "utf8");
  const solution = await readFile(
    path.join(challengeDir, "solution.mdx"),
    "utf8",
  );
  const target = await readFile(path.join(challengeDir, "target.html"), "utf8");

  if (collectHeadingCount(hints, "Hint") !== 3) {
    throw new Error(
      `${entry.name}: hints.mdx must contain exactly 3 ## Hint headings`,
    );
  }

  if (!/^##\s+The fix\s*$/im.test(solution)) {
    throw new Error(`${entry.name}: solution.mdx missing ## The fix`);
  }

  if (!/^##\s+Recovered\s*$/im.test(solution)) {
    throw new Error(`${entry.name}: solution.mdx missing ## Recovered`);
  }

  if (!target.includes("ctfpawned-runtime")) {
    throw new Error(`${entry.name}: target.html missing runtime marker`);
  }
}

const entries = (await readdir(challengesDir, { withFileTypes: true })).filter(
  (entry) => entry.isDirectory(),
);
const seen = {
  slug: new Map(),
  order: new Map(),
  flagHash: new Map(),
};

for (const entry of entries) {
  await checkChallenge(entry, seen);
}

console.log(
  `Checked ${entries.length} challenge${entries.length === 1 ? "" : "s"}.`,
);
