import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLE = readFileSync(join(__dirname, "..", "..", "public", "samples", "services_agreement.pdf"));

/** No Clai server in these tests: /health fails, so /talk uses the browser engine (as on GitHub Pages). */
async function noServer(page: Page) {
  await page.route("http://127.0.0.1:8000/**", (route) => route.abort());
}

test("homepage tells the product story", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Clai — Your agreement, explained/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your agreement, explained.");
  for (const heading of [/written to be precise/, /Less searching/, /points back to/, /Upload, explore, ask/, "What it does today", /stays with you/, /The details are in the document/]) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await expect(page.locator("video source[type='video/mp4']")).toHaveAttribute("src", /walkthrough\.mp4$/);
  await expect(page.getByText("Demonstration · simulated audio")).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
});

test("every route renders with its own heading", async ({ page }) => {
  const routes: [string, RegExp][] = [
    ["/product", /answers back/],
    ["/how-it-works", /answer you can check/],
    ["/technology", /has a source/],
    ["/about", /easier to read/],
    ["/contact", /talk about Clai/],
    ["/privacy", /stays with you/],
    ["/terms", /reading tool/],
    ["/docs", /using Clai/],
    ["/docs/getting-started", /Getting started/],
    ["/docs/faq", /FAQ/],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(heading);
  }
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/isn.t in the document/);
});

test("navigation and docs search", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Docs" }).first().click();
  await expect(page).toHaveURL(/\/docs/);
  await page.goto("/docs/using-clai");
  await page.getByPlaceholder("Search docs").fill("browser");
  const sidebar = page.getByRole("navigation", { name: "Documentation" });
  await expect(sidebar.getByRole("link", { name: "Voice experience" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Getting started" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Next/ })).toBeVisible();
});

test("talk: rejects a non-PDF before reading it", async ({ page }) => {
  await noServer(page);
  await page.goto("/talk");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(page.getByRole("alert").filter({ hasText: "PDF" })).toContainText("choose a .pdf file");
});

test("talk: real browser engine — upload, ask, cite, follow up, refuse, summarise", async ({ page, isMobile }) => {
  await noServer(page);
  await page.goto("/talk");
  await expect(page.getByText("Read in your browser · nothing is uploaded")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "services_agreement.pdf", mimeType: "application/pdf", buffer: SAMPLE });
  await expect(page.getByRole("heading", { name: "What would you like to know?" })).toBeVisible({ timeout: 30_000 });

  const ask = async (q: string) => {
    await page.getByLabel("Ask about this agreement").fill(q);
    await page.keyboard.press("Enter");
  };
  await ask("Can I leave this agreement early?");
  await expect(page.getByText(/Clause 8\.1 \(page 2\) says/)).toBeVisible();

  await page.getByRole("button", { name: "Show Clause 8.1 · p. 2 in the document" }).click();
  await expect(page.getByText("page 2 / 2")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("mark.evidence-mark").first()).toBeVisible({ timeout: 20_000 });
  if (isMobile) await page.getByRole("button", { name: "Close panel" }).click();

  await ask("And what if the other party breaches it?");
  await expect(page.getByText(/Clause 8\.2 \(page 2\) says/)).toBeVisible();
  await ask("What is the dress code?");
  await expect(page.getByText(/doesn.t mention “dress”/)).toBeVisible();

  if (isMobile) await page.getByLabel("Ask about this agreement").blur();
  const end = page.getByRole("button", { name: "End session" });
  if (await end.isVisible()) {
    await end.click();
    await expect(page.getByRole("heading", { name: /3 questions, 2 answered/ })).toBeVisible();
  }
});
