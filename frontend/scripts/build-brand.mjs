// Renders Clai brand exports from the source SVGs in assets/branding/source.
//   node scripts/build-brand.mjs
// Outputs:
//   assets/branding/exports/*.png      transparent PNGs of every logo/mark variant
//   frontend/app/{favicon.ico,icon.svg,apple-icon.png,opengraph-image.png,twitter-image.png}
//   frontend/public/{icon-192.png,icon-512.png,logo.svg}
//   assets/branding/social/{github-social-preview,x-card,linkedin-share}.png
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = join(root, "assets", "branding", "source");
const exportsDir = join(root, "assets", "branding", "exports");
const socialDir = join(root, "assets", "branding", "social");
const appDir = join(root, "frontend", "app");
const publicDir = join(root, "frontend", "public");
for (const d of [exportsDir, socialDir, publicDir]) mkdirSync(d, { recursive: true });

const svg = (name) => readFileSync(join(src, name), "utf8");
const dataUri = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
const geist = readFileSync(join(root, "assets", "branding", "fonts", "Geist-SemiBold.ttf")).toString("base64");
const geistMono = readFileSync(join(root, "assets", "branding", "fonts", "GeistMono-Regular.ttf")).toString("base64");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

async function renderSvg(svgText, width, height, out, background = "transparent") {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<html><body style="margin:0;background:${background}"><img src="${dataUri(svgText)}" style="width:${width}px;height:${height}px;display:block"></body></html>`,
  );
  await page.locator("img").evaluate((img) => img.decode());
  await page.screenshot({ path: out, omitBackground: background === "transparent", clip: { x: 0, y: 0, width, height } });
}

async function renderHtml(html, width, height, out) {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
}

// ── Logo exports (transparent) ──────────────────────────────────────
const lockupRatio = 141.2 / 48;
for (const [name, file] of [
  ["logo", "logo.svg"],
  ["logo-dark", "logo-dark.svg"],
  ["wordmark", "wordmark.svg"],
]) {
  const h = 192;
  const w = Math.round(h * (name === "wordmark" ? 81.2 / 48 : lockupRatio));
  await renderSvg(svg(file), w, h, join(exportsDir, `${name}.png`));
}
for (const name of ["mark", "mark-dark"]) {
  await renderSvg(svg(`${name}.svg`), 512, 512, join(exportsDir, `${name}.png`));
}
const mono = svg("logo-mono.svg").replaceAll("currentColor", "#000000");
await renderSvg(mono, Math.round(192 * lockupRatio), 192, join(exportsDir, "logo-mono-black.png"));
await renderSvg(mono.replaceAll("#000000", "#FFFFFF"), Math.round(192 * lockupRatio), 192, join(exportsDir, "logo-mono-white.png"));

// ── App icons ────────────────────────────────────────────────────────
const sizes = [16, 32, 48];
const icoPngs = [];
for (const s of sizes) {
  const out = join(exportsDir, `favicon-${s}.png`);
  await renderSvg(svg("mark.svg"), s, s, out);
  icoPngs.push({ size: s, data: readFileSync(out) });
}
writeFileSync(join(appDir, "favicon.ico"), buildIco(icoPngs));
await renderSvg(svg("app-icon.svg"), 180, 180, join(appDir, "apple-icon.png"));
await renderSvg(svg("app-icon.svg"), 192, 192, join(publicDir, "icon-192.png"));
await renderSvg(svg("app-icon.svg"), 512, 512, join(publicDir, "icon-512.png"));
copyFileSync(join(src, "favicon.svg"), join(appDir, "icon.svg"));
copyFileSync(join(src, "logo.svg"), join(publicDir, "logo.svg"));

// ── Social previews ──────────────────────────────────────────────────
const card = ({ width, height, scale = 1 }) => `<!doctype html><html><head><style>
@font-face{font-family:Geist;src:url(data:font/ttf;base64,${geist})}
@font-face{font-family:GeistMono;src:url(data:font/ttf;base64,${geistMono})}
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;background:#FAFAF7;color:#1D2320;font-family:Geist;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(to right,#E4E2DA 1px,transparent 1px),linear-gradient(to bottom,#E4E2DA 1px,transparent 1px);background-size:${48 * scale}px ${48 * scale}px;opacity:.55;mask-image:radial-gradient(ellipse at 75% 40%,#000 0%,transparent 70%)}
.wrap{position:absolute;inset:${72 * scale}px;display:flex;flex-direction:column;justify-content:space-between}
.logo img{height:${56 * scale}px}
h1{font-size:${76 * scale}px;line-height:1.02;letter-spacing:-0.045em;font-weight:600;max-width:${780 * scale}px}
h1 span{color:#1F7A66}
.meta{font-family:GeistMono;font-size:${20 * scale}px;letter-spacing:.08em;text-transform:uppercase;color:#6F7873;display:flex;gap:${28 * scale}px}
.meta b{color:#2E9E85;font-weight:400}
.frame{position:absolute;right:${72 * scale}px;top:${64 * scale}px;font-family:GeistMono;font-size:${17 * scale}px;line-height:1.55;color:#6F7873;white-space:pre}
.frame i{font-style:normal;color:#1F7A66}
</style></head><body><div class="grid"></div>
<pre class="frame">${asciiBox([["Q  termination notice?"], ["A  ", "30 days' written notice"], ["── clause 8.1 · p. 2"]])}</pre>
<div class="wrap"><div class="logo"><img src="${dataUri(svg("logo.svg"))}"></div>
<h1>Talk to your agreements. <span>Understand what matters.</span></h1>
<div class="meta"><span><b>●</b> voice-first</span><span>hybrid RAG</span><span>cited evidence</span><span>open source</span></div></div>
</body></html>`;

await renderHtml(card({ width: 1200, height: 630 }), 1200, 630, join(appDir, "opengraph-image.png"));
copyFileSync(join(appDir, "opengraph-image.png"), join(appDir, "twitter-image.png"));
copyFileSync(join(appDir, "opengraph-image.png"), join(socialDir, "x-card.png"));
copyFileSync(join(appDir, "opengraph-image.png"), join(socialDir, "linkedin-share.png"));
await renderHtml(card({ width: 1280, height: 640, scale: 1.04 }), 1280, 640, join(socialDir, "github-social-preview.png"));

await browser.close();
console.log("brand assets written");

/** Box-drawn frame; each row is [plain, highlighted?]. Pads by character count so borders align. */
function asciiBox(rows) {
  const width = Math.max(...rows.map((r) => r.join("").length)) + 2;
  const line = (r) => `│ ${r[0]}${r[1] ? `<i>${r[1]}</i>` : ""}${" ".repeat(width - r.join("").length - 1)}│`;
  return [`┌${"─".repeat(width)}┐`, ...rows.map(line), `└${"─".repeat(width)}┘`].join("\n");
}

/** Minimal ICO writer: PNG-compressed entries (supported by all modern browsers). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}
