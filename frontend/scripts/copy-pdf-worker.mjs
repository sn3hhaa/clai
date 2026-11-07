// Copies the pdf.js worker that matches react-pdf's own pdfjs-dist into public/ (git-ignored),
// so the viewer works under any base path, including the GitHub Pages export.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fromReactPdf = createRequire(createRequire(import.meta.url).resolve("react-pdf"));
const worker = fromReactPdf.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const version = fromReactPdf("pdfjs-dist/package.json").version;
const out = join(here, "..", "public", "pdf.worker.min.mjs");
mkdirSync(dirname(out), { recursive: true });
copyFileSync(worker, out);
console.log(`copied pdf.js worker ${version} → public/pdf.worker.min.mjs`);
