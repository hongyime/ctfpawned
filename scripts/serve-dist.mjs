import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const host = args[args.indexOf("--host") + 1] ?? "127.0.0.1";
const portArg =
  args.indexOf("--port") === -1 ? undefined : args[args.indexOf("--port") + 1];
const port = Number(portArg ?? 4321);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".xml", "application/xml; charset=utf-8"],
]);
const parentCsp = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const candidate = path.resolve(
    distDir,
    decoded === "/" ? "index.html" : decoded.slice(1),
  );

  if (!candidate.startsWith(distDir)) {
    return undefined;
  }

  return candidate;
}

async function findFile(urlPath) {
  const candidate = resolvePath(urlPath);
  if (!candidate) return undefined;

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
    if (info.isDirectory()) {
      const index = path.join(candidate, "index.html");
      if ((await stat(index)).isFile()) return index;
    }
  } catch {
    const htmlCandidate = `${candidate}.html`;
    try {
      if ((await stat(htmlCandidate)).isFile()) return htmlCandidate;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400).end("Bad request");
    return;
  }

  const filePath = await findFile(
    new URL(request.url, "http://local").pathname,
  );

  if (!filePath) {
    response.writeHead(404).end("Not found");
    return;
  }

  const headers = {
    "Content-Type":
      contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
  };

  if (filePath.includes(`${path.sep}targets${path.sep}`)) {
    const html = await readFile(filePath, "utf8");
    const csp = html.match(
      /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]+)"/i,
    )?.[1];
    if (csp) {
      headers["Content-Security-Policy"] = `${csp}; frame-ancestors 'self'`;
    }
  } else if (path.extname(filePath) === ".html") {
    headers["Content-Security-Policy"] = parentCsp;
  } else if (path.extname(filePath) === ".wasm") {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving dist at http://${host}:${port}`);
});
