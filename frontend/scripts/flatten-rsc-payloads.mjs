// Post-export fix for static hosts. This Next.js version writes segment prefetch payloads nested
// (out/talk/__next.talk/__PAGE__.txt) while the client router requests a flat name
// (out/talk/__next.talk.__PAGE__.txt). Without a rewrite-capable server those requests 404 and
// navigation degrades to full page loads, so each nested payload gets a flat-named copy.
//   node scripts/flatten-rsc-payloads.mjs [outDir=out]
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "out";
let copies = 0;

function copyNested(dir, flatPrefix, targetDir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) copyNested(path, `${flatPrefix}.${name}`, targetDir);
    else {
      copyFileSync(path, join(targetDir, `${flatPrefix}.${name}`));
      copies += 1;
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name.startsWith("__next.")) copyNested(path, name, dir);
    else walk(path);
  }
}

walk(outDir);
console.log(`flatten-rsc-payloads: ${copies} flat copies written in ${outDir}`);
