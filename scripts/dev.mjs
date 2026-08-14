import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const astroBin = path.join(root, "node_modules", "astro", "bin", "astro.mjs");
let pending = false;
let shuttingDown = false;

async function buildTargets() {
  const moduleUrl = pathToFileURL(
    path.join(root, "scripts", "build-targets.mjs"),
  );
  moduleUrl.search = `?t=${Date.now()}`;
  await import(moduleUrl.href);
}

async function scheduleBuild() {
  if (pending) return;
  pending = true;
  await delay(100);
  pending = false;

  try {
    await buildTargets();
  } catch (error) {
    console.error(error);
  }
}

function runAstro(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [astroBin, ...args], {
      cwd: root,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  await runAstro(["dev", "stop"]);
  process.exit(signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1);
}

await buildTargets();

try {
  watch(
    path.join(root, "src", "challenges"),
    { recursive: true },
    (_eventType, fileName) => {
      if (!fileName) return;
      if (
        String(fileName).endsWith("target.html") ||
        String(fileName).endsWith("meta.json")
      ) {
        void scheduleBuild();
      }
    },
  );
} catch (error) {
  console.warn(
    `Challenge target watch disabled: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const code = await runAstro(["dev", "--background", ...forwardedArgs]);

if (code !== 0) {
  process.exit(code);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  console.error(error);
  void shutdown("uncaughtException");
});

setInterval(() => undefined, 60_000);
