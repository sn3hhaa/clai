import type { Metadata } from "next";
import { SectionLabel } from "@/components/shared/ascii";
import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { repoFile } from "@/lib/site";

export const metadata: Metadata = {
  title: "Technology",
  description: "How Clai turns a PDF agreement into grounded, cited voice answers: ingestion, hybrid retrieval, LangGraph and LiveKit.",
};

const stages = [
  {
    n: "01",
    title: "Ingestion with provenance",
    body: "PyMuPDF extracts each line with its page, font size and weight. Clause numbering (8, 8.1, (a), Article IV) and headings are detected conservatively, and anything not detected stays empty instead of being guessed. Passages never cross a clause boundary, and each one records its document, page range, section, clause and heading.",
    facts: ["PDF validation: encrypted, empty, scanned, size/page limits", "running headers & page numbers removed", "OCR not supported: scans are rejected with a clear message"],
  },
  {
    n: "02",
    title: "Hybrid retrieval",
    body: "Each passage is embedded with all-MiniLM-L6-v2 (384-d) into Qdrant and indexed with BM25. Both rankings are fused with Reciprocal Rank Fusion, then a local cross-encoder (ms-marco-MiniLM-L-6-v2) reranks the candidates. Every query is filtered to one document.",
    facts: ["dense + lexical, fused with RRF (k = 60)", "cross-encoder relevance in [0, 1]", "tested for cross-document isolation"],
  },
  {
    n: "03",
    title: "A reasoning graph, not a prompt",
    body: "A LangGraph state machine resolves follow-ups, classifies intent, plans queries, retrieves, reranks and grades the evidence. If the evidence is weak it runs one bounded corrective search with agreement-specific synonyms. Only then does it write an answer.",
    facts: ["understand → classify → plan → retrieve → rerank → grade", "corrective search ≤ 1 retry", "abstains when evidence is insufficient"],
  },
  {
    n: "04",
    title: "One model call, validated",
    body: "The language model (a free OpenRouter model, configurable) gets numbered sources and must return JSON with citations. Without a key, or when the free quota runs out, Clai quotes the best passage verbatim instead. Claims are then checked: numbers must appear in the cited text and citations must point to retrieved passages.",
    facts: ["≤ 1 LLM call per question", "extractive fallback, never invented text", "grounded · partially grounded · insufficient"],
  },
  {
    n: "05",
    title: "Real-time voice",
    body: "The browser joins a LiveKit room. A LiveKit Agents worker runs Silero VAD, a local turn detector, speech-to-text (faster-whisper, or Gradium) and text-to-speech (Piper, or Gradium). Each user turn calls the same /query endpoint the text box uses, and evidence is sent back to the page on a data channel.",
    facts: ["one engine for voice and text", "barge-in via VAD", "GPU speech-to-text when available"],
  },
];

export default function TechnologyPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <SectionLabel>Technology</SectionLabel>
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">Built around evidence.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
          Each stage below is a separate module with its own tests. Read the{" "}
          <a className="underline decoration-line-strong underline-offset-4 hover:decoration-ink" href={repoFile("ARCHITECTURE.md")} target="_blank" rel="noopener noreferrer">
            architecture document
          </a>{" "}
          for the details.
        </p>

        <ol className="mt-16 divide-y divide-line border-y border-line">
          {stages.map((s) => (
            <li key={s.n} className="grid gap-6 py-12 md:grid-cols-[120px_1fr_1fr]">
              <p className="font-mono text-sm text-mint-ink">{s.n}</p>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-2">{s.body}</p>
              </div>
              <ul className="space-y-2 self-start rounded-xl border border-line bg-surface p-5 font-mono text-xs text-ink-2">
                {s.facts.map((f) => (
                  <li key={f}>
                    <span className="text-mint-ink">↳</span> {f}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-20" aria-labelledby="limits">
          <SectionLabel>Limits, stated plainly</SectionLabel>
          <h2 id="limits" className="mt-4 text-3xl font-semibold tracking-tight">What Clai doesn&apos;t do</h2>
          <ul className="mt-6 grid gap-3 text-ink-2 md:grid-cols-2">
            {[
              "It is not legal advice and doesn't judge whether terms are fair.",
              "Scanned (image-only) PDFs aren't supported: there's no OCR yet.",
              "Clause detection relies on numbering and headings; unusual layouts may get no clause labels.",
              "The full app runs locally. GitHub Pages hosts only this website.",
            ].map((t) => (
              <li key={t} className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
