// Captures the homepage walkthrough video and the How-it-works screenshots from the real app
// (browser engine, fictional sample agreement). Requires the dev server on :3000.
//   node scripts/capture-media.mjs [baseUrl=http://localhost:3000]
// Then convert the recording: see scripts/encode-media.py (run by this script's caller).
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "media");
const tmp = join(out, "_raw");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(join(out, "how"), { recursive: true });
mkdirSync(tmp, { recursive: true });

const W = 1440, H = 900;
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });

// ── 1. How-it-works stills ───────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/talk`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(out, "how", "1-start.png") });
  await page.getByRole("button", { name: /fictional sample/i }).click();
  await page.getByText("What would you like to know?").waitFor();
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await page.locator(".react-pdf__Page canvas").first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, "how", "2-document.png") });
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByLabel("Ask about this agreement").fill("Can I leave this agreement early?");
  await page.keyboard.press("Enter");
  await page.getByText("Quoted from the agreement").first().waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, "how", "3-ask.png") });
  await page.getByRole("button", { name: /^Show Clause 8\.1/ }).first().click();
  await page.locator("mark.evidence-mark").first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, "how", "4-evidence.png") });
  for (const q of ["And what if the other party breaches it?", "What is the dress code?"]) {
    await page.getByLabel("Ask about this agreement").fill(q);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
  }
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByText(/answered from the agreement/).waitFor();
  await page.screenshot({ path: join(out, "how", "5-summary.png") });
  await page.close();
}

// ── 2. Walkthrough recording ─────────────────────────────────────────
const cues = [];
const t0 = Date.now();
const cue = (text) => cues.push({ at: (Date.now() - t0) / 1000, text });
{
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  const page = await context.newPage();
  await page.goto(`${base}/talk`, { waitUntil: "networkidle" });
  cue("Start with a document: a fictional services agreement.");
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: /fictional sample/i }).click();
  await page.getByText("What would you like to know?").waitFor();
  cue("Clai reads it in the browser: 2 pages, 23 passages.");
  await page.waitForTimeout(1800);
  const box = page.getByLabel("Ask about this agreement");
  await box.click();
  cue("Ask in plain language.");
  await box.pressSequentially("Can I leave this agreement early?", { delay: 55 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await page.getByText("Quoted from the agreement").first().waitFor();
  cue("The answer quotes the clause that settles it: 8.1, page 2.");
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /^Show Clause 8\.1/ }).first().click();
  await page.locator("mark.evidence-mark").first().waitFor();
  cue("One click shows it highlighted in the original document.");
  await page.waitForTimeout(3200);
  await box.click();
  cue("Follow-ups keep their context.");
  await box.pressSequentially("And what if the other party breaches it?", { delay: 50 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Show Clause 8\.2/ }).first().click();
  cue("Clause 8.2: termination for cause.");
  await page.waitForTimeout(3200);
  await box.click();
  await box.pressSequentially("What is the dress code?", { delay: 55 });
  await page.keyboard.press("Enter");
  await page.getByText("Not found in the agreement").first().waitFor();
  cue("If the agreement doesn't say, Clai says so.");
  await page.waitForTimeout(3200);
  await page.close();
  await context.close();
}
await browser.close();
cue("");

const raw = readdirSync(tmp).find((f) => f.endsWith(".webm"));
renameSync(join(tmp, raw), join(out, "walkthrough-raw.webm"));
rmSync(tmp, { recursive: true, force: true });
const ts = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, "0")}`;
};
const vtt = ["WEBVTT", ""];
for (let i = 0; i < cues.length - 1; i++) vtt.push(`${ts(cues[i].at)} --> ${ts(cues[i + 1].at)}`, cues[i].text, "");
writeFileSync(join(out, "walkthrough.en.vtt"), vtt.join("\n"));
writeFileSync(join(out, "walkthrough-cues.json"), JSON.stringify(cues, null, 2));
console.log(`captured ${cues.length - 1} scenes; raw video at public/media/walkthrough-raw.webm`);
