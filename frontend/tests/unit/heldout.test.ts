// @vitest-environment node
// Held-out evaluation: questions written after tuning. Records results; asserts only that it ran.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { BrowserEngine } from "@/lib/engine/engine";
import type { PdfJs } from "@/lib/engine/pdf";

const ROOT = join(__dirname, "..", "..", "..");

it("runs the held-out set and records the results", async () => {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJs;
  const spec = JSON.parse(readFileSync(join(ROOT, "evaluations", "heldout.json"), "utf8"));
  const rows = [];
  for (const item of spec.questions) {
    const engine = await BrowserEngine.fromPdf(pdfjs, new Uint8Array(readFileSync(join(ROOT, spec.documents[item.doc]))), "h.pdf");
    const a = engine.ask(item.q);
    const cited = a.evidence.filter((e) => e.cited).map((e) => e.clause);
    const ok = item.abstain
      ? a.grounding === "insufficient"
      : cited.includes(item.expect_clause) && item.expect_text.every((t: string) => a.answer.toLowerCase().includes(t.toLowerCase()));
    rows.push({ id: item.id, question: item.q, expected: item.abstain ? "abstain" : item.expect_clause, got: cited[0] ?? a.grounding, top: a.evidence.slice(0, 3).map((e) => e.clause), ok });
  }
  const correct = rows.filter((r) => r.ok).length;
  writeFileSync(
    join(ROOT, "evaluations", "results", "browser-engine-heldout.json"),
    JSON.stringify({ engine: "browser", questions: rows.length, correct, accuracy: Math.round((correct / rows.length) * 1000) / 1000, rows }, null, 2) + "\n",
  );
  console.log(`held-out: ${correct}/${rows.length}`, rows.filter((r) => !r.ok).map((r) => `${r.id} expected ${r.expected} got ${r.got} top ${JSON.stringify(r.top)}`).join(" | "));
  expect(rows.length).toBe(spec.questions.length);
});
