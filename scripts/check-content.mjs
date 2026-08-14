import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChallengeMeta } from "./challenge-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const challengesDir = path.join(root, "src", "challenges");
const catAssetsDir = path.join(root, "src", "assets", "cats");
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

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function collectHeadingCount(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, "gim");
  return [...markdown.matchAll(pattern)].length;
}

async function checkChallenge(entry, seen, knownSlugs) {
  const challengeDir = path.join(challengesDir, entry.name);
  const metaPath = path.join(challengeDir, "meta.json");
  const meta = ChallengeMeta.parse(
    JSON.parse(await readFile(metaPath, "utf8")),
  );
  knownSlugs.add(meta.slug);

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

async function checkCrossSlugReferences(knownSlugs) {
  const files = (await walkFiles(challengesDir)).filter((file) =>
    /\.(mdx|json|html|ts)$/.test(file),
  );
  const slugPattern = /\b\d{2}-[a-z0-9-]+\b/g;

  for (const file of files) {
    const relative = path.relative(challengesDir, file);
    const currentSlug = relative.split(path.sep)[0];
    const source = await readFile(file, "utf8");

    for (const [reference] of source.matchAll(slugPattern)) {
      if (!knownSlugs.has(reference)) {
        throw new Error(`${relative}: unknown challenge slug ${reference}`);
      }

      if (reference !== currentSlug) {
        throw new Error(
          `${relative}: cross-slug reference to ${reference} is not allowed`,
        );
      }
    }
  }
}

async function checkCatSvgs(knownSlugs) {
  for (const slug of [...knownSlugs].sort()) {
    const svgPath = path.join(catAssetsDir, `${slug}.svg`);

    if (!(await exists(svgPath))) {
      throw new Error(`${slug}: missing cat SVG asset`);
    }

    const source = await readFile(svgPath, "utf8");
    const info = await stat(svgPath);

    if (info.size > 20 * 1024) {
      throw new Error(`${slug}: cat SVG exceeds 20KB`);
    }

    if (!/<title\b/i.test(source) || !/<desc\b/i.test(source)) {
      throw new Error(`${slug}: cat SVG must include title and desc`);
    }

    if (/<\s*(image|foreignObject|script|text)\b/i.test(source)) {
      throw new Error(`${slug}: cat SVG contains a forbidden element`);
    }

    if (/\b(?:href|src)\s*=\s*["'](?:https?:|data:|\/)/i.test(source)) {
      throw new Error(
        `${slug}: cat SVG contains an external or embedded asset`,
      );
    }

    if (/#[0-9a-f]{3,8}\b/i.test(source)) {
      throw new Error(`${slug}: cat SVG must use token colors, not hex`);
    }

    if (/\b(?:fill|stroke)\s*=\s*["'](?!var\(|none["'])/i.test(source)) {
      throw new Error(`${slug}: cat SVG fill/stroke must use tokens only`);
    }
  }
}

async function checkShellHexColors() {
  const files = [
    ...(await walkFiles(path.join(root, "src", "components"))),
    ...(await walkFiles(path.join(root, "src", "layouts"))),
    ...(await walkFiles(path.join(root, "src", "pages"))),
    path.join(root, "src", "styles", "tokens.css"),
    path.join(root, "public", "shell.js"),
  ].filter((file) => !file.endsWith(`${path.sep}tokens.css`));

  for (const file of files) {
    if (!/\.(astro|css|js|ts)$/.test(file)) continue;

    const source = await readFile(file, "utf8");
    if (/#[0-9a-f]{3,8}\b/i.test(source)) {
      throw new Error(
        `${path.relative(root, file)}: shell UI colors must come from tokens.css`,
      );
    }
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
const knownSlugs = new Set();

for (const entry of entries) {
  await checkChallenge(entry, seen, knownSlugs);
}

await checkCrossSlugReferences(knownSlugs);
await checkCatSvgs(knownSlugs);
await checkShellHexColors();

console.log(
  `Checked ${entries.length} challenge${entries.length === 1 ? "" : "s"}.`,
);
