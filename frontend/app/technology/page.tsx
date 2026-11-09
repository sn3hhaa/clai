import type { Metadata } from "next";
import Link from "next/link";
import { Band, PageIntro, SitePage } from "@/components/shared/page";
import { Reveal } from "@/components/shared/reveal";
import { repoFile, repoTree } from "@/lib/site";

export const metadata: Metadata = {
  title: "Technology",
  description: "How Clai turns a PDF into answers with sources, what runs in your browser, and what needs a Clai server.",
};

function Flow({ steps }: { steps: [string, string][] }) {
  return (
    <ol className="grid gap-px border border-line bg-line md:grid-cols-5">
      {steps.map(([name, detail], i) => (
        <li key={name} className="relative bg-bg p-5">
          <p className="font-mono text-[0.72rem] text-ink-3">{String(i + 1).padStart(2, "0")}</p>
          <p className="mt-3 font-medium text-ink">{name}</p>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-2">{detail}</p>
        </li>
      ))}
    </ol>
  );
}

const TIERS = [
  {
    label: "On this website",
    tone: "text-mint",
    items: [
      "PDF reading with pdf.js, in a Web Worker",
      "Section and clause detection with page provenance",
      "BM25 search, intent expansion and rank fusion",
      "Evidence grading and refusal with named missing terms",
      "Quoted answers with clause and page citations",
      "Voice through the Web Speech API (Chrome, Edge, Safari)",
    ],
  },
  {
    label: "In the repository, needs a Clai server",
    tone: "text-ink",
    items: [
      "FastAPI backend with SQLite persistence",
      "Vector search in Qdrant with MiniLM embeddings",
      "Cross-encoder reranking",
      "LangGraph agent with corrective search and citation checks",
      "Optional written answers through a free OpenRouter model",
      "Real-time voice over LiveKit with Whisper, Piper and barge-in",
    ],
  },
  {
    label: "Planned",
    tone: "text-amber-ink",
    items: ["Text recognition (OCR) for scanned agreements", "Comparing two agreements", "Word (.docx) input", "Streaming speech recognition"],
  },
];

export default function TechnologyPage() {
  return (
    <SitePage>
      <PageIntro
        marker="Technology"
        title={
          <>
            Built so every answer <em>has a source.</em>
          </>
        }
        lead="Clai has two engines that share one idea: never present an answer without the passage it came from. The public website runs the first one entirely in your browser."
      />

      <Band marker="Availability">
        <Reveal className="grid gap-10 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.label} data-reveal>
              <h2 className={`eyebrow ${tier.tone}`}>{tier.label}</h2>
              <ul className="mt-5 space-y-3 border-t border-line pt-5 text-[0.95rem] leading-relaxed text-ink-2">
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </Band>

      <Band marker="Browser engine" className="mt-24">
        <h2 className="display text-[2.4rem]">What happens when you add a PDF</h2>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-2">
          Everything below runs in your browser tab. The file never leaves your device, and closing the tab discards it.
        </p>
        <div className="mt-10">
          <Flow
            steps={[
              ["Read", "pdf.js extracts each line with its page and font size."],
              ["Structure", "Numbering (8, 8.1, (a), Article IV) and headings mark sections and clauses. Nothing is guessed."],
              ["Index", "Clauses become passages that remember page, section and clause, indexed with BM25."],
              ["Retrieve", "Your question, plus words agreements use for the same idea, is searched and fused with RRF."],
              ["Grade", "Weighted term coverage decides: quote the clause, or say what's missing."],
            ]}
          />
        </div>
      </Band>

      <Band marker="Server engine" className="mt-24">
        <h2 className="display text-[2.4rem]">The full pipeline, when you run a server</h2>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-2">
          The repository also contains a Python backend for people who run Clai themselves. It adds meaning-based
          search, a reranking model, a reasoning graph and real-time voice. GitHub Pages can&apos;t run it, so the public
          site doesn&apos;t use it. When <Link className="text-ink underline decoration-mint-deep underline-offset-4" href="/talk">Clai</Link>{" "}
          detects a server, it offers it as the engine.
        </p>
        <div className="mt-10">
          <Flow
            steps={[
              ["Ingest", "PyMuPDF with the same clause rules; SQLite stores documents and conversations."],
              ["Hybrid search", "MiniLM vectors in Qdrant plus BM25, fused with RRF."],
              ["Rerank", "A local cross-encoder scores each passage against the question."],
              ["Reason", "A LangGraph state machine grades, re-searches once, and validates every citation."],
              ["Speak", "LiveKit carries audio; Whisper listens, Piper answers, and you can interrupt."],
            ]}
          />
        </div>
      </Band>

      <Band marker="Measured" className="mt-24">
        <h2 className="display text-[2.4rem]">How well it works, honestly</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="border-t border-line pt-5">
            <p className="eyebrow">Browser engine</p>
            <p className="mt-3 leading-relaxed text-ink-2">
              On 12 held-out questions written after tuning, it answered <strong className="text-ink">8 correctly</strong> and
              declined the other 4. In every one of those 4, the right clause was among the passages it showed. It
              never cited a wrong clause, and it refused all 3 questions the agreement doesn&apos;t answer.
            </p>
          </div>
          <div className="border-t border-line pt-5">
            <p className="eyebrow">Server engine</p>
            <p className="mt-3 leading-relaxed text-ink-2">
              On the 23-question development set, the right clause ranked first 94.7% of the time and appeared in the
              top five every time. Real-time voice answered in about 2.1 seconds on a laptop with a GPU.
            </p>
          </div>
        </div>
        <p className="mt-6 text-[0.85rem] text-ink-3">
          Small, fictional test sets. The numbers show the system works end to end; they aren&apos;t a benchmark.{" "}
          <a className="underline underline-offset-4 hover:text-ink" href={repoTree("evaluations")} target="_blank" rel="noopener noreferrer">
            Raw results
          </a>
        </p>
      </Band>

      <Band marker="Open source" className="mt-24">
        <p className="max-w-[62ch] leading-relaxed text-ink-2">
          Clai is MIT-licensed. The{" "}
          <Link className="text-ink underline decoration-mint-deep underline-offset-4" href="/docs/technical-reference">
            technical reference
          </Link>{" "}
          covers the architecture, and the{" "}
          <a className="text-ink underline decoration-mint-deep underline-offset-4" href={repoFile("ARCHITECTURE.md")} target="_blank" rel="noopener noreferrer">
            repository
          </a>{" "}
          has the code, tests and design decisions.
        </p>
      </Band>
    </SitePage>
  );
}
