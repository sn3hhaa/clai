// Full-page screenshots for visual review and README images.
//   node scripts/screenshot.mjs <url> <out.png> [width=1440] [height=900] [--full]
import { chromium } from "@playwright/test";

const [url, out, width = "1440", height = "900", ...flags] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/screenshot.mjs <url> <out.png> [width] [height] [--full]");
  process.exit(1);
}
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
// Trigger scroll-based reveals, then return to the top.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(900);
await page.screenshot({ path: out, fullPage: flags.includes("--full") });
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await browser.close();
