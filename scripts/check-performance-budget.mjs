import { chromium, devices } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const challengesDir = path.join(root, "src", "challenges");
const maxChallengeScriptGzipBytes = 40 * 1024;
const maxMobileFcpMs = 1500;
const host = "127.0.0.1";
const port = 4323;
const origin = `http://${host}:${port}`;

async function readyChallenges() {
  const entries = await readdir(challengesDir, { withFileTypes: true });
  const metas = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = JSON.parse(
      await readFile(path.join(challengesDir, entry.name, "meta.json"), "utf8"),
    );
    if (meta.status === "ready") metas.push(meta);
  }

  return metas.sort((a, b) => a.order - b.order);
}

function scriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/gi)].map(
    (match) => match[1],
  );
}

function distPathFromUrl(source) {
  const pathname = new URL(source, origin).pathname;
  return path.join(distDir, decodeURIComponent(pathname).slice(1));
}

async function checkScriptBudget(challenges) {
  for (const challenge of challenges) {
    const html = await readFile(
      path.join(distDir, "c", challenge.slug, "index.html"),
      "utf8",
    );
    const scripts = [...new Set(scriptSources(html))];
    let gzipBytes = 0;

    for (const source of scripts) {
      gzipBytes += gzipSync(await readFile(distPathFromUrl(source))).length;
    }

    if (gzipBytes > maxChallengeScriptGzipBytes) {
      throw new Error(
        `${challenge.slug}: initial JS is ${gzipBytes} bytes gzip; budget is ${maxChallengeScriptGzipBytes}`,
      );
    }
  }
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 30_000;

    function probe() {
      fetch(origin)
        .then((response) => {
          if (response.ok) {
            resolve();
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        })
        .catch((error) => {
          if (Date.now() > deadline) {
            reject(error);
          } else {
            setTimeout(probe, 250);
          }
        });
    }

    probe();
  });
}

async function checkMobileFcp(challenge) {
  const server = spawn(
    process.execPath,
    ["scripts/serve-dist.mjs", "--", "--host", host, "--port", String(port)],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    await Promise.race([
      waitForServer(),
      once(server, "exit").then(([code]) => {
        throw new Error(`static server exited before ready with code ${code}`);
      }),
    ]);

    const browser = await chromium.launch();
    const context = await browser.newContext(devices["Pixel 7"]);
    const page = await context.newPage();
    await page.goto(`${origin}/c/${challenge.slug}/`, {
      waitUntil: "networkidle",
    });
    const fcp = await page.evaluate(
      () =>
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        Number.POSITIVE_INFINITY,
    );

    await browser.close();

    if (fcp > maxMobileFcpMs) {
      throw new Error(
        `${challenge.slug}: mobile FCP is ${Math.round(fcp)}ms; budget is ${maxMobileFcpMs}ms`,
      );
    }
  } finally {
    server.kill();
  }
}

const challenges = await readyChallenges();
await checkScriptBudget(challenges);
await checkMobileFcp(challenges[0]);

console.log(
  `Performance budget passed: challenge JS <= ${maxChallengeScriptGzipBytes} gzip bytes; mobile FCP <= ${maxMobileFcpMs}ms.`,
);
