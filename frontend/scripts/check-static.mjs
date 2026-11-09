// Crawls a served static export and fails on any 4xx/5xx request, console error, or missing
// asset — including client-side navigation between pages.
//   node scripts/check-static.mjs http://localhost:4173/clai
import { chromium } from "@playwright/test";

const base = (process.argv[2] ?? "http://localhost:4173/clai").replace(/\/$/, "");
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage();
const problems = [];
page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
page.on("console", (m) => m.type() === "error" && !/127.0.0.1:8000|ERR_CONNECTION_REFUSED/.test(m.text()) && problems.push(`console: ${m.text()}`));
page.on("pageerror", (e) => problems.push(`pageerror: ${e}`));

const ROUTES = ["/", "/product/", "/how-it-works/", "/technology/", "/talk/", "/about/", "/contact/", "/privacy/", "/terms/", "/docs/",
  "/docs/getting-started/", "/docs/using-clai/", "/docs/voice-experience/", "/docs/document-support/", "/docs/evidence-and-citations/",
  "/docs/privacy-and-security/", "/docs/faq/", "/docs/technical-reference/"];
for (const path of ROUTES) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
}
// Client-side navigation (exercises RSC payload fetches on the static host).
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Technology" }).first().click();
await page.waitForURL(/technology/);
await page.getByRole("link", { name: "Docs" }).first().click();
await page.waitForURL(/docs/);
await page.getByRole("link", { name: "Open Clai" }).first().click();
await page.waitForURL(/talk/);
await page.getByRole("heading", { name: /Start with a/ }).waitFor();

const head = await page.evaluate(() => ({
  icon: document.querySelector('link[rel="icon"]')?.getAttribute("href"),
  og: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
}));
console.log("icon:", head.icon, "| og:image:", head.og);
for (const asset of ["/favicon.ico", "/icon.svg", "/apple-icon.png", "/opengraph-image.png", "/manifest.webmanifest", "/samples/services_agreement.pdf",
  "/pdf.worker.min.mjs", "/media/walkthrough.mp4", "/media/walkthrough.webm", "/media/walkthrough-poster.jpg", "/media/walkthrough.en.vtt",
  "/media/how/1-start.png", "/media/how/5-summary.png", "/brand/logo.svg"]) {
  const r = await page.request.get(`${base}${asset}`);
  if (!r.ok()) problems.push(`${r.status()} ${asset}`);
}
await browser.close();
if (problems.length) {
  console.error(`static export problems:\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
console.log("static export OK: pages, client navigation and assets all resolve under the base path");
