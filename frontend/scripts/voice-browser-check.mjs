// Browser voice check: Chrome's fake microphone plays a WAV (silence, then a spoken question)
// into the real /talk page. Needs the full stack running (scripts/dev). Not a substitute for the
// human microphone-to-speaker acceptance test.
//   node scripts/voice-browser-check.mjs [outDir]
import { chromium } from "@playwright/test";
import { tmpdir } from "node:os";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? tmpdir();
const question = "What is the termination notice period?";

// Build the WAV: LEAD seconds of silence (let the greeting finish), the question, then 8 s of silence.
const res = await fetch("http://127.0.0.1:5000/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: question }) });
const wav = Buffer.from(await res.arrayBuffer());
const rate = wav.readUInt32LE(24);
const dataStart = wav.indexOf("data") + 8;
const speech = wav.subarray(dataStart);
const silence = (s) => Buffer.alloc(Math.round(rate * s) * 2);
const pcm = Buffer.concat([silence(Number(process.env.LEAD ?? 20)), speech, silence(8)]);
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8); header.write("fmt ", 12);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
const wavPath = join(dir, "fake-mic.wav");
writeFileSync(wavPath, Buffer.concat([header, pcm]));

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wavPath}%noloop`, "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:3000/talk", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /fictional sample/i }).click();
await page.getByText(/2 pages/).waitFor({ timeout: 60000 });

const states = new Set();
const t0 = Date.now();
await page.getByRole("button", { name: /Start call/ }).click();
const poll = setInterval(async () => {
  const s = await page.locator("canvas[data-state]").first().getAttribute("data-state").catch(() => null);
  if (s) states.add(s);
}, 150);

await page.getByText("Supporting passages").waitFor({ timeout: 90000 });
console.log(`evidence arrived after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await page.waitForTimeout(6000); // let the spoken answer play
const transcript = await page.getByLabel("Live transcript").innerText();
const answer = await page.locator("#current-answer").locator("..").locator("..").innerText();
await page.screenshot({ path: join(dir, "talk-voice.png") });
await page.getByRole("button", { name: "End call" }).click();
await page.getByText("Session summary").waitFor({ timeout: 30000 });
clearInterval(poll);
await page.screenshot({ path: join(dir, "talk-summary.png") });
console.log("aura states seen:", [...states].join(", "));
console.log("transcript:\n" + transcript);
console.log("evidence panel:", answer.split("\n").filter(Boolean).slice(0, 4).join(" | "));
console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
await browser.close();
