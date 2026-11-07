// Serves the static export the way GitHub Pages does: under a base path, index.html for
// directories, 404.html for misses. Used to verify the Pages build locally.
//   node scripts/serve-static.mjs [port=4173] [basePath=/clai]
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] ?? 4173);
const base = process.argv[3] ?? "/clai";
const root = fileURLToPath(new URL("../out", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".txt": "text/plain", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".pdf": "application/pdf", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (!url.startsWith(base)) {
    res.writeHead(404).end("outside base path");
    return;
  }
  let file = normalize(join(root, url.slice(base.length)));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  const status = existsSync(file) ? 200 : 404;
  if (status === 404) file = join(root, "404.html");
  res.writeHead(status, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving out/ at http://localhost:${port}${base}/`));
