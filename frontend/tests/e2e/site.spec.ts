import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const API = "http://127.0.0.1:8000";
const SAMPLE = readFileSync(join(__dirname, "..", "..", "public", "samples", "services_agreement.pdf"));

const doc = {
  id: "0".repeat(32),
  filename: "services_agreement.pdf",
  status: "ready",
  error: null,
  size_bytes: SAMPLE.length,
  page_count: 2,
  chunk_count: 23,
  created_at: "2026-11-07T00:00:00Z",
  outline: [
    { label: "8 Termination", clause: "8", page_number: 2, level: 1 },
    { label: "8.1 Termination for convenience", clause: "8.1", page_number: 2, level: 2 },
  ],
};
const evidence = {
  chunk_id: `${doc.id}-c0017`,
  page_number: 2,
  page_end: 2,
  section: "8. Termination",
  clause: "8.1",
  heading: "Termination for convenience",
  text: "Either party may terminate this agreement with 30 days' written notice.",
  score: 0.97,
  cited: true,
};

/** Fictional API responses so the UI flow is tested without a backend in CI. */
async function mockApi(page: Page) {
  await page.route(`${API}/documents`, (route) => route.fulfill({ status: 201, json: doc }));
  await page.route(`${API}/documents/${doc.id}/file`, (route) =>
    route.fulfill({ status: 200, body: SAMPLE, contentType: "application/pdf" }),
  );
  await page.route(`${API}/query`, async (route) => {
    const body = route.request().postDataJSON();
    route.fulfill({
      json: {
        conversation_id: "conv1",
        message_id: "m1",
        question: body.question,
        resolved_question: body.question,
        intent: "termination",
        answer: "Clause 8.1 (page 2) says: “Either party may terminate this agreement with 30 days' written notice.”",
        spoken_answer: "According to clause 8.1, either party may terminate this agreement with 30 days' written notice.",
        key_points: [],
        citations: [evidence.chunk_id],
        evidence: [evidence],
        claims: [],
        grounding: "grounded",
        sufficient: true,
        generation: "extractive",
        retrieval_rounds: 1,
        timings_ms: { total: 90 },
      },
    });
  });
}

test("homepage presents the product and its sections", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Clai — Talk to your agreements/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Talk to your agreements.");
  for (const heading of [
    "Don't search the agreement. Talk to it.",
    "Answers with a trail back to the agreement.",
    "How it works",
    "Free and open source",
    "Built for engineers who care where answers come from.",
    "Your agreement has answers. Talk to it.",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText("Demonstration · simulated audio")).toBeVisible();
  await expect(page.getByText("Fictional example")).toBeVisible();
  await expect(page.getByRole("img", { name: /The Clai workspace/ })).toBeVisible();
  await expect(page.getByText(/George Inness/)).toBeVisible();
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon|favicon/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
});

test("navigation reaches technology and talk", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Talk to Clai" }).first().click();
  await expect(page.getByRole("heading", { name: "What are we reading today?" })).toBeVisible();
  await page.goto("/technology");
  await expect(page.getByRole("heading", { level: 1, name: "Built around evidence." })).toBeVisible();
});

test("upload rejects non-PDF files before contacting the backend", async ({ page }) => {
  await page.goto("/talk");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(page.getByRole("alert").filter({ hasText: "PDF" })).toContainText("Please choose a .pdf file");
});

test("upload → ask → evidence → document navigation", async ({ page, isMobile }) => {
  await mockApi(page);
  await page.goto("/talk");
  await page.locator('input[type="file"]').setInputFiles({ name: "services_agreement.pdf", mimeType: "application/pdf", buffer: SAMPLE });
  await expect(page.getByText("2 pages · 23 passages")).toBeVisible();

  if (isMobile) await page.getByRole("tab", { name: "Clai voice" }).click();
  await expect(page.getByRole("button", { name: /Start call/ })).toBeVisible();
  await page.getByLabel("Ask a question by text").fill("What is the termination notice period?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();

  if (isMobile) await page.getByRole("tab", { name: "Evidence" }).click();
  await expect(page.getByText("grounded", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show Clause 8.1 · p. 2 in the document" }).click();
  await expect(page.getByText("page 2 / 2")).toBeVisible();
  await expect(page.locator("mark.evidence-mark").first()).toBeVisible({ timeout: 15_000 });
});
