import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChallengeMeta } from "./challenge-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const challengesDir = path.join(root, "src", "challenges");
const runtimeDir = path.join(root, "src", "targets", "runtime");
const outputDir = path.join(root, "public", "targets");
const runtimeMarker = "<!-- ctfpawned-runtime -->";

function targetCsp(meta) {
  const connectSrc = meta.targetCsp.connectSrc;
  const scriptSrc = meta.targetCsp.wasm
    ? "'unsafe-inline' 'wasm-unsafe-eval'"
    : "'unsafe-inline'";

  return [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    "style-src 'unsafe-inline'",
    "img-src data:",
    `connect-src ${connectSrc}`,
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
}

function injectIntoHead(html, injection) {
  if (html.includes(runtimeMarker)) {
    return html.replace(runtimeMarker, injection);
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `${injection}\n</head>`);
  }

  return `<!doctype html><html><head>${injection}</head><body>${html}</body></html>`;
}

async function loadRuntime() {
  const files = await readdir(runtimeDir);
  const scripts = [];

  for (const file of files.filter((name) => name.endsWith(".js")).sort()) {
    scripts.push(await readFile(path.join(runtimeDir, file), "utf8"));
  }

  return `${runtimeMarker}\n<script>\n${scripts.join("\n\n")}\n</script>`;
}

async function buildTargets() {
  if (!outputDir.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to clear unexpected target output: ${outputDir}`);
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const runtime = await loadRuntime();
  const entries = await readdir(challengesDir, { withFileTypes: true });
  let built = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const challengeDir = path.join(challengesDir, entry.name);
    const metaRaw = JSON.parse(
      await readFile(path.join(challengeDir, "meta.json"), "utf8"),
    );
    const meta = ChallengeMeta.parse(metaRaw);
    const source = await readFile(
      path.join(challengeDir, "target.html"),
      "utf8",
    );
    const csp = `<meta http-equiv="Content-Security-Policy" content="${targetCsp(meta)}" />`;
    const html = injectIntoHead(source, `${csp}\n${runtime}`);

    await writeFile(path.join(outputDir, `${meta.slug}.html`), html);
    built += 1;
  }

  console.log(`Built ${built} target${built === 1 ? "" : "s"}.`);
}

await buildTargets();
