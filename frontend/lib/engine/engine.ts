// Clai's browser engine: the document never leaves the browser.
//
// pdf.js → lines → sections/clauses → provenance chunks → BM25 (+ intent expansion, RRF)
// → IDF-weighted coverage grading → one corrective round → extractive answer with citations.
//
// It's an evidence-first engine. It quotes the agreement and never generates wording, and it
// says what's missing when the agreement doesn't cover a question. It's not the backend's
// LangGraph + vector + cross-encoder pipeline, and the UI labels it accordingly.

import type { AnswerOut, Claim, DocumentOut, Evidence, Message, SessionSummary, SourceRef } from "@/lib/api/types";
import { extractPdf, type PdfJs } from "./pdf";
import { classifyIntent, INTENT_EXPANSIONS, resolveQuestion, SYNONYMS, synonymTerms, type Intent } from "./query";
import { buildChunks, searchText, toEvidence, type Chunk } from "./structure";
import { splitAnswerSentences, STOPWORDS, stem, tokenize } from "./text";

const TOP_K = 12;
const RRF_K = 60;
const EVIDENCE_N = 5;
const SUFFICIENT_COVERAGE = 0.5;
const MAX_ABSENT_SHARE = 0.5;
const MAX_WHOLE_QUOTE = 320;

export const ABSTAIN_SPOKEN = "I couldn't find that in this agreement.";

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Okapi BM25 with the same parameters and IDF floor as rank_bm25. */
class Bm25 {
  private readonly idf = new Map<string, number>();
  private readonly avgLen: number;
  constructor(private readonly docs: string[][], private readonly k1 = 1.5, private readonly b = 0.75, eps = 0.25) {
    const df = new Map<string, number>();
    for (const doc of docs) for (const t of new Set(doc)) df.set(t, (df.get(t) ?? 0) + 1);
    const n = docs.length;
    let sum = 0;
    const negatives: string[] = [];
    for (const [t, f] of df) {
      const v = Math.log((n - f + 0.5) / (f + 0.5));
      this.idf.set(t, v);
      sum += v;
      if (v < 0) negatives.push(t);
    }
    const floor = eps * (sum / Math.max(df.size, 1));
    for (const t of negatives) this.idf.set(t, floor);
    this.avgLen = docs.reduce((s, d) => s + d.length, 0) / Math.max(n, 1);
  }
  scores(query: string[]): number[] {
    return this.docs.map((doc) => {
      let s = 0;
      for (const q of query) {
        const tf = doc.filter((t) => t === q).length;
        if (!tf) continue;
        s += (this.idf.get(q) ?? 0) * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * doc.length) / this.avgLen)));
      }
      return s;
    });
  }
}

interface Term {
  word: string; // as asked
  stems: Set<string>; // its own stem plus synonym stems
  weight: number;
  present: boolean; // does the agreement contain it (or a synonym) anywhere?
}

interface Turn {
  question: string;
  resolved: string;
  answer: AnswerOut;
  at: string;
}

export class BrowserEngine {
  readonly conversationId = randomId();
  private readonly tokens: Set<string>[];
  private readonly bm25: Bm25;
  private readonly df = new Map<string, number>();
  private readonly turns: Turn[] = [];
  private readonly startedAt = new Date().toISOString();
  private endedAt: string | null = null;

  private constructor(readonly document: DocumentOut, readonly chunks: Chunk[]) {
    const tokenLists = chunks.map((c) => tokenize(searchText(c)));
    this.tokens = tokenLists.map((t) => new Set(t));
    this.bm25 = new Bm25(tokenLists);
    for (const set of this.tokens) for (const t of set) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  static async fromPdf(pdfjs: PdfJs, bytes: Uint8Array, filename: string): Promise<BrowserEngine> {
    const pdf = await extractPdf(pdfjs, bytes);
    const id = randomId();
    const { chunks, outline } = buildChunks(id, pdf);
    if (!chunks.length) {
      const { DocumentError } = await import("./pdf");
      throw new DocumentError("No readable passages were found in this PDF.", "no_text");
    }
    const document: DocumentOut = {
      id,
      filename,
      status: "ready",
      error: null,
      size_bytes: bytes.byteLength,
      page_count: pdf.pageCount,
      chunk_count: chunks.length,
      created_at: new Date().toISOString(),
      outline,
    };
    return new BrowserEngine(document, chunks);
  }

  // ── retrieval ──────────────────────────────────────────────────────
  private rank(queries: string[]): Map<number, number> {
    const fused = new Map<number, number>();
    for (const q of queries) {
      const scores = this.bm25.scores(tokenize(q));
      const ranked = scores
        .map((s, i) => [i, s] as const)
        .filter(([, s]) => s > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_K);
      ranked.forEach(([i], r) => fused.set(i, (fused.get(i) ?? 0) + 1 / (RRF_K + r + 1)));
    }
    return fused;
  }

  private terms(text: string): Term[] {
    const n = this.chunks.length;
    const seen = new Map<string, Term>();
    for (const word of text.toLowerCase().match(/[a-z0-9]+(?:[.,][0-9]+)*/g) ?? []) {
      if (STOPWORDS.has(word)) continue;
      const s = stem(word);
      if (seen.has(s)) continue;
      const stems = new Set([s, ...(SYNONYMS[word] ?? []).flatMap((syn) => tokenize(syn))]);
      const df = Math.max(...[...stems].map((t) => this.df.get(t) ?? 0));
      seen.set(s, { word, stems, weight: Math.log(1 + n / (df + 0.5)), present: df > 0 });
    }
    return [...seen.values()];
  }

  private coverage(terms: Term[], i: number): number {
    const total = terms.reduce((s, t) => s + t.weight, 0);
    if (!total) return 0;
    const hit = terms.filter((t) => [...t.stems].some((s) => this.tokens[i].has(s))).reduce((s, t) => s + t.weight, 0);
    return hit / total;
  }

  private evaluate(terms: Term[], candidates: Map<number, number>) {
    const maxRrf = Math.max(...candidates.values(), 1e-9);
    return [...candidates.entries()]
      .map(([i, rrf]) => {
        const cov = this.coverage(terms, i);
        return { i, cov, score: 0.75 * cov + 0.25 * (rrf / maxRrf) };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ── answering ──────────────────────────────────────────────────────
  ask(question: string): AnswerOut {
    const started = performance.now();
    const q = question.trim();
    const resolved = resolveQuestion(q, this.turns.map((t) => t.resolved));
    const intent: Intent = classifyIntent(resolved);
    const plain = resolved.replace("(follow-up to:", "").replace(")", "");
    const terms = this.terms(plain);
    const total = terms.reduce((s, t) => s + t.weight, 0) || 1;
    const absentShare = terms.filter((t) => !t.present).reduce((s, t) => s + t.weight, 0) / total;

    let rounds = 1;
    let candidates = this.rank([resolved, `${plain} ${INTENT_EXPANSIONS[intent]}`.trim()]);
    let ranked = this.evaluate(terms, candidates);
    let sufficient = absentShare < MAX_ABSENT_SHARE && (ranked[0]?.cov ?? 0) >= SUFFICIENT_COVERAGE;

    if (!sufficient && absentShare < MAX_ABSENT_SHARE) {
      // Corrective round: agreement vocabulary for the words the user chose.
      rounds = 2;
      const corrective = this.rank([`${plain} ${synonymTerms(plain).join(" ")}`, INTENT_EXPANSIONS[intent]].filter(Boolean));
      for (const [i, s] of corrective) candidates.set(i, (candidates.get(i) ?? 0) + s);
      candidates = new Map(candidates);
      ranked = this.evaluate(terms, candidates);
      sufficient = (ranked[0]?.cov ?? 0) >= SUFFICIENT_COVERAGE;
    }

    const top = ranked.slice(0, EVIDENCE_N);
    let answer: string;
    let spoken: string;
    let keyPoints: string[] = [];
    let citations: string[] = [];
    let claims: Claim[] = [];

    if (sufficient && top.length) {
      const chunk = this.chunks[top[0].i];
      const quote = this.quote(chunk, plain);
      const where = chunk.clause ? `Clause ${chunk.clause}` : "The agreement";
      answer = `${where} (page ${chunk.pageNumber}) says: “${quote}”`;
      spoken = chunk.clause ? `According to clause ${chunk.clause}, ${quote.charAt(0).toLowerCase()}${quote.slice(1)}` : `The agreement says: ${quote}`;
      keyPoints = [quote];
      citations = [chunk.chunkId];
      claims = splitAnswerSentences(quote).map((text) => ({ text, chunk_ids: [chunk.chunkId], supported: true, support_score: 1 }));
    } else {
      const missing = terms.filter((t) => !t.present).map((t) => `“${t.word}”`);
      answer =
        missing.length && absentShare >= MAX_ABSENT_SHARE
          ? `I couldn't find this in the agreement. It doesn't mention ${missing.slice(0, 3).join(" or ")}.`
          : "I couldn't find a passage that answers this. The closest passages are below so you can check.";
      spoken = ABSTAIN_SPOKEN;
    }

    const evidence: Evidence[] = top.map(({ i, cov }, rank) => toEvidence(this.chunks[i], cov, sufficient && rank === 0));
    const result: AnswerOut = {
      conversation_id: this.conversationId,
      message_id: randomId(),
      question: q,
      resolved_question: resolved,
      intent,
      answer,
      spoken_answer: spoken,
      key_points: keyPoints,
      citations,
      evidence,
      claims,
      grounding: sufficient ? "grounded" : "insufficient",
      sufficient,
      generation: "extractive",
      retrieval_rounds: rounds,
      timings_ms: { total: Math.round((performance.now() - started) * 10) / 10 },
    };
    this.turns.push({ question: q, resolved, answer: result, at: new Date().toISOString() });
    return result;
  }

  /** Quote short clauses whole; trim long ones to the best-matching sentence. */
  private quote(chunk: Chunk, question: string): string {
    const text = chunk.text.trim();
    if (text.length <= MAX_WHOLE_QUOTE) return text;
    const want = new Set(tokenize(question));
    const parts = splitAnswerSentences(text);
    return (parts.length ? parts : [text]).reduce((best, s) =>
      tokenize(s).filter((t) => want.has(t)).length > tokenize(best).filter((t) => want.has(t)).length ? s : best,
    );
  }

  // ── session ────────────────────────────────────────────────────────
  end(): SessionSummary {
    this.endedAt ??= new Date().toISOString();
    return this.summary();
  }

  summary(): SessionSummary {
    const sources: SourceRef[] = [];
    const keyPoints: string[] = [];
    const transcript: Message[] = [];
    for (const t of this.turns) {
      transcript.push({ id: `${t.answer.message_id}-q`, role: "user", content: t.question, created_at: t.at, citations: [], grounding: null });
      transcript.push({ id: t.answer.message_id, role: "assistant", content: t.answer.answer, created_at: t.at, citations: t.answer.citations, grounding: t.answer.grounding });
      for (const p of t.answer.key_points) if (!keyPoints.includes(p)) keyPoints.push(p);
      for (const e of t.answer.evidence) {
        if (e.cited && !sources.some((s) => s.chunk_id === e.chunk_id)) {
          sources.push({ chunk_id: e.chunk_id, page_number: e.page_number, section: e.section, clause: e.clause });
        }
      }
    }
    return {
      conversation_id: this.conversationId,
      document_id: this.document.id,
      channel: "text",
      started_at: this.startedAt,
      ended_at: this.endedAt,
      questions: this.turns.map((t) => t.question),
      key_points: keyPoints.slice(0, 8),
      sources,
      unresolved: this.turns.filter((t) => !t.answer.sufficient).map((t) => t.question),
      transcript,
    };
  }
}
