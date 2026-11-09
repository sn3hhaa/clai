// @vitest-environment node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { BrowserEngine } from "@/lib/engine/engine";
import { DocumentError, type PdfJs } from "@/lib/engine/pdf";

const ROOT = join(__dirname, "..", "..", "..");
const fixture = (name: string) => new Uint8Array(readFileSync(join(ROOT, "backend", "tests", "fixtures", name)));
let pdfjs: PdfJs;

beforeAll(async () => {
  pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJs;
});

describe("ingestion in the browser engine", () => {
  it("detects clauses with page provenance", async () => {
    const engine = await BrowserEngine.fromPdf(pdfjs, fixture("services_agreement.pdf"), "services.pdf");
    const clause = engine.chunks.find((c) => c.text.includes("30 days' written notice"))!;
    expect(clause).toMatchObject({ clause: "8.1", pageNumber: 2, section: "8. Termination", heading: "Termination for convenience" });
    expect(clause.text).toBe("Either party may terminate this agreement with 30 days' written notice.");
    const clauses = engine.chunks.map((c) => c.clause).filter(Boolean);
    expect(clauses.slice(0, 3)).toEqual(["1.1", "1.2", "1.3"]);
    expect(clauses.at(-1)).toBe("10.2");
    expect(new Set(clauses).size).toBe(clauses.length);
    expect(engine.chunks.some((c) => c.text.includes("1.5% per month"))).toBe(true);
    expect(engine.chunks.some((c) => /Page \d of \d/.test(c.text))).toBe(false);
    expect(engine.document.outline.find((o) => o.label === "5 Confidentiality")?.page_number).toBe(2);
  });

  it.each([
    [new Uint8Array(), "empty_file"],
    [new TextEncoder().encode("plain text, not a pdf"), "not_a_pdf"],
    [new TextEncoder().encode("%PDF-1.7\n garbage garbage"), "corrupt_pdf"],
  ])("rejects invalid input (%#)", async (bytes, code) => {
    await expect(BrowserEngine.fromPdf(pdfjs, bytes, "x.pdf")).rejects.toMatchObject({ code });
  });
});

describe("answering", () => {
  let engine: BrowserEngine;
  beforeAll(async () => {
    engine = await BrowserEngine.fromPdf(pdfjs, fixture("services_agreement.pdf"), "services.pdf");
  });

  it("answers with the exact clause and cites it", () => {
    const a = engine.ask("What is the termination notice period?");
    expect(a.grounding).toBe("grounded");
    expect(a.answer).toContain("30 days");
    expect(a.evidence[0]).toMatchObject({ clause: "8.1", page_number: 2, cited: true });
    expect(a.generation).toBe("extractive");
  });

  it("keeps follow-up context", () => {
    const fresh = engine.ask("What is the termination notice period?");
    expect(fresh.grounding).toBe("grounded");
    const follow = engine.ask("And what if the other party breaches it?");
    expect(follow.resolved_question).toContain("follow-up to");
    expect(follow.evidence[0].clause).toBe("8.2");
    expect(follow.answer).toContain("10 days");
  });

  it("names what the agreement doesn't mention instead of guessing", () => {
    const a = engine.ask("What is the dress code for employees?");
    expect(a.grounding).toBe("insufficient");
    expect(a.citations).toEqual([]);
    expect(a.answer).toMatch(/doesn't mention .*dress/);
  });

  it("builds a session summary", () => {
    const summary = engine.end();
    expect(summary.questions.length).toBeGreaterThan(2);
    expect(summary.unresolved).toContain("What is the dress code for employees?");
    expect(summary.sources.some((s) => s.clause === "8.1")).toBe(true);
    expect(summary.ended_at).not.toBeNull();
  });

  it("keeps documents isolated", async () => {
    const nda = await BrowserEngine.fromPdf(pdfjs, fixture("mutual_nda.pdf"), "nda.pdf");
    const a = nda.ask("How many days' notice is needed to terminate?");
    expect(a.answer).toContain("90 days");
    expect(a.evidence.every((e) => e.chunk_id.startsWith(nda.document.id))).toBe(true);
  });

  it("DocumentError carries a code", () => {
    expect(new DocumentError("x", "scanned_pdf").code).toBe("scanned_pdf");
  });
});

describe("evaluation (same question set as the backend)", () => {
  it("meets the quality bar and records results", async () => {
    const spec = JSON.parse(readFileSync(join(ROOT, "evaluations", "questions.json"), "utf8"));
    const engines: Record<string, BrowserEngine> = {};
    for (const [key, path] of Object.entries<string>(spec.documents)) {
      engines[key] = await BrowserEngine.fromPdf(pdfjs, new Uint8Array(readFileSync(join(ROOT, path))), path);
    }
    // Follow-ups share a conversation with their parent; others get a fresh engine state per doc.
    const rows: Record<string, unknown>[] = [];
    for (const item of spec.questions) {
      let engine = engines[item.doc];
      if (!item.follow_up_of) {
        engine = await BrowserEngine.fromPdf(pdfjs, new Uint8Array(readFileSync(join(ROOT, spec.documents[item.doc]))), "eval.pdf");
        engines[`conv:${item.id}`] = engine;
      } else {
        engine = engines[`conv:${item.follow_up_of}`];
      }
      const a = engine.ask(item.q);
      const ranked = a.evidence.map((e) => e.clause);
      const cited = a.evidence.filter((e) => e.cited).map((e) => e.clause);
      const row: Record<string, unknown> = { id: item.id, question: item.q, grounding: a.grounding, cited, top: ranked.slice(0, 3), answer: a.answer };
      if (item.abstain) row.abstained_correctly = a.grounding === "insufficient";
      else
        Object.assign(row, {
          hit1: ranked[0] === item.expect_clause,
          hit5: ranked.slice(0, 5).includes(item.expect_clause),
          citation_ok: cited.includes(item.expect_clause),
          answer_ok: item.expect_text.every((t: string) => a.answer.toLowerCase().includes(t.toLowerCase())),
          false_abstain: a.grounding === "insufficient",
        });
      rows.push(row);
    }
    const answerable = rows.filter((r) => "hit1" in r);
    const unanswerable = rows.filter((r) => "abstained_correctly" in r);
    const rate = (key: string, rs: Record<string, unknown>[]) => Math.round((rs.filter((r) => r[key]).length / rs.length) * 1000) / 1000;
    const metrics = {
      retrieval_hit_at_1: rate("hit1", answerable),
      retrieval_hit_at_5: rate("hit5", answerable),
      citation_accuracy: rate("citation_ok", answerable),
      answer_correctness: rate("answer_ok", answerable),
      false_abstention_rate: rate("false_abstain", answerable),
      abstention_accuracy: rate("abstained_correctly", unanswerable),
    };
    const misses = rows.filter((r) => ("abstained_correctly" in r ? !r.abstained_correctly : !(r.citation_ok && r.answer_ok)));
    mkdirSync(join(ROOT, "evaluations", "results"), { recursive: true });
    writeFileSync(
      join(ROOT, "evaluations", "results", "browser-engine.json"),
      JSON.stringify({ engine: "browser (pdf.js + BM25 + coverage grading, extractive)", counts: { questions: rows.length, answerable: answerable.length, unanswerable: unanswerable.length }, metrics, misses: misses.map((m) => ({ id: m.id, question: m.question, grounding: m.grounding, cited: m.cited, top: m.top })), rows }, null, 2) + "\n",
    );
    console.log(JSON.stringify(metrics), misses.map((m) => `${m.id}:${m.grounding}:${JSON.stringify(m.top)}`).join(" | "));
    expect(metrics.retrieval_hit_at_5).toBeGreaterThanOrEqual(0.9);
    expect(metrics.abstention_accuracy).toBe(1);
  });
});
