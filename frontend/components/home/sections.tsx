import Link from "next/link";
import { ArrowRight, FileText, MessageSquareText, Quote, Search } from "lucide-react";
import { AsciiFrame, SectionLabel } from "@/components/shared/ascii";
import { Reveal } from "@/components/shared/reveal";
import { site } from "@/lib/site";
import { AuraDemo } from "./aura-demo";

const container = "mx-auto max-w-6xl px-5 sm:px-8";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,#000_10%,transparent_65%)] opacity-60" />
      <div className={`${container} relative grid gap-12 pb-20 pt-20 sm:pt-28 lg:grid-cols-[1.25fr_1fr] lg:items-end`}>
        <div>
          <SectionLabel>Agreement intelligence, through conversation</SectionLabel>
          <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem]">
            Talk to your agreements.{" "}
            <span className="text-mint-ink">Understand what matters.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2">
            Clai turns agreements into something you can actually talk to. Upload a document, ask questions naturally, and
            get answers grounded in the agreement itself—with the evidence to trace them back.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/talk"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.95rem] font-medium text-bg transition-colors hover:bg-ink/85"
            >
              Talk to Clai
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 text-[0.95rem] font-medium text-ink transition-colors hover:border-ink"
            >
              See how it works
            </Link>
          </div>
        </div>
        <AsciiFrame
          className="hidden justify-self-end lg:block"
          label="Example exchange"
          lines={[
            "C L A I",
            "──────────────────────────────",
            "Q  what is the notice period?",
            "A  30 days' written notice",
            "",
            "↳  clause 8.1 · page 2",
            "↳  evidence: grounded",
          ]}
        />
      </div>
    </section>
  );
}

const steps = [
  { icon: FileText, title: "Document", body: "Your agreement, parsed page by page into sections and clauses." },
  { icon: MessageSquareText, title: "Question", body: "Ask the way you'd ask a person, by voice or text." },
  { icon: Search, title: "Answer", body: "A short answer built only from what the agreement says." },
  { icon: Quote, title: "Source", body: "The exact passages, with page, section and clause." },
];

export function WhatClaiDoes() {
  return (
    <section className={`${container} py-24`} aria-labelledby="what-heading">
      <Reveal>
        <SectionLabel index="01">What Clai does</SectionLabel>
        <h2 id="what-heading" data-reveal className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          An agreement you can actually talk to.
        </h2>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} data-reveal className="relative bg-surface p-7">
              <div className="flex items-center justify-between">
                <Icon aria-hidden className="h-5 w-5 text-mint-ink" />
                <span className="font-mono text-xs text-ink-3">{i < steps.length - 1 ? `0${i + 1} →` : `0${i + 1}`}</span>
              </div>
              <h3 className="mt-8 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

export function VoiceExperience() {
  return (
    <section className="border-y border-line bg-surface" aria-labelledby="voice-heading">
      <div className={`${container} grid items-center gap-14 py-24 lg:grid-cols-2`}>
        <Reveal>
          <SectionLabel index="02">Voice experience</SectionLabel>
          <h2 id="voice-heading" data-reveal className="mt-5 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Don&apos;t search the agreement. Talk to it.
          </h2>
          <p data-reveal className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
            Ask out loud and hear a short, natural answer. Interrupt whenever you like. Follow-ups keep their context, so
            “what about if they breach it?” just works.
          </p>
          <ul data-reveal className="mt-8 space-y-3 font-mono text-sm text-ink-2">
            <li><span className="text-mint-ink">●</span> real-time audio over WebRTC (LiveKit)</li>
            <li><span className="text-mint-ink">●</span> speech-to-text and text-to-speech that can run locally</li>
            <li><span className="text-mint-ink">●</span> barge-in: speak over Clai to interrupt</li>
          </ul>
        </Reveal>
        <AuraDemo />
      </div>
    </section>
  );
}

export function GroundedAnswers() {
  return (
    <section className={`${container} py-24`} aria-labelledby="grounded-heading">
      <Reveal className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <div>
          <SectionLabel index="03">Grounded answers</SectionLabel>
          <h2 id="grounded-heading" data-reveal className="mt-5 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Answers with a trail back to the agreement.
          </h2>
          <p data-reveal className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            Every answer cites the passages it used. Citations are checked against what was actually retrieved, and when
            the agreement doesn&apos;t say, Clai tells you so instead of guessing.
          </p>
        </div>
        <figure data-reveal className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="label-mono">Evidence</span>
            <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-amber-ink">
              Fictional example
            </span>
          </div>
          <div className="space-y-5 p-6">
            <div>
              <p className="label-mono">You asked</p>
              <p className="mt-1.5 text-ink">Can either side end this agreement early?</p>
            </div>
            <div>
              <p className="label-mono">Clai</p>
              <p className="mt-1.5 text-lg leading-snug">
                Yes. Either party may terminate with <mark className="rounded bg-mint-soft px-1 text-ink">30 days&apos; written notice</mark>.
                For a material breach that isn&apos;t fixed within 10 days, termination can be immediate.
              </p>
            </div>
            <div className="space-y-3">
              {[
                ["Clause 8.1 · p. 2", "Either party may terminate this agreement with 30 days' written notice."],
                ["Clause 8.2 · p. 2", "…if the other party commits a material breach and fails to remedy it within 10 days…"],
              ].map(([ref, text]) => (
                <blockquote key={ref} className="rounded-xl border border-line bg-surface-2/60 p-4">
                  <p className="font-mono text-xs text-mint-ink">{ref}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">“{text}”</p>
                </blockquote>
              ))}
            </div>
            <p className="font-mono text-xs text-ink-3">
              <span className="text-mint-ink">●</span> grounded · 2 citations validated
            </p>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

const how = [
  { n: "01", title: "Upload", body: "Drop in a PDF agreement. Clai checks it, then extracts every page with its headings and clause numbers." },
  { n: "02", title: "Understand", body: "Each clause becomes a passage that remembers its page, section and clause. It's indexed for both meaning and exact wording." },
  { n: "03", title: "Ask", body: "Speak or type. A reasoning graph searches the agreement, grades the evidence, and searches again if the first pass is weak." },
  { n: "04", title: "Trace", body: "Hear the answer, then open the cited clauses in the original PDF, highlighted where they appear." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface-2/40" aria-labelledby="how-heading">
      <div className={`${container} py-24`}>
        <Reveal>
          <SectionLabel index="04">How it works</SectionLabel>
          <h2 id="how-heading" data-reveal className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Four steps, all of them inspectable.
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {how.map(({ n, title, body }) => (
              <li key={n} data-reveal className="border-t border-ink pt-5">
                <p className="font-mono text-sm text-mint-ink">{n}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

export function TechnologyTeaser() {
  const items = [
    ["PyMuPDF", "page & clause provenance"],
    ["Qdrant + BM25", "hybrid retrieval, fused with RRF"],
    ["Cross-encoder", "local reranking"],
    ["LangGraph", "grading & corrective search"],
    ["LiveKit", "real-time voice transport"],
    ["Validation", "every citation checked"],
  ];
  return (
    <section className={`${container} py-24`} aria-labelledby="tech-heading">
      <Reveal className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionLabel index="05">Technology</SectionLabel>
          <h2 id="tech-heading" data-reveal className="mt-5 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Built around evidence.
          </h2>
          <p data-reveal className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            Retrieval, reasoning and voice are separate, testable parts. The language model writes the answer and
            nothing else.
          </p>
          <Link data-reveal href="/technology" className="group mt-8 inline-flex items-center gap-2 font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Explore the technology
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {items.map(([name, role]) => (
            <li key={name} data-reveal className="bg-surface px-6 py-5">
              <p className="font-semibold tracking-tight">{name}</p>
              <p className="mt-1 font-mono text-xs text-ink-3">{role}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

export function DeveloperSection() {
  const diagram = `browser ──WebRTC──▶ LiveKit ──▶ voice worker
   │                            │  VAD · STT · turns · TTS
   │ HTTP                       │ POST /query
   ▼                            ▼
FastAPI ──▶ LangGraph ──▶ hybrid retrieval ──▶ Qdrant + BM25
   │            │  grade · correct · cite
   ▼            ▼
SQLite     one LLM call (or extractive fallback)`;
  return (
    <section className="border-y border-line bg-ink text-bg" aria-labelledby="dev-heading">
      <div className={`${container} grid gap-12 py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center`}>
        <Reveal>
          <p className="label-mono !text-bg/50">── 06 ─ For developers</p>
          <h2 id="dev-heading" data-reveal className="mt-5 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Built for engineers who care where answers come from.
          </h2>
          <p data-reveal className="mt-6 max-w-md leading-relaxed text-bg/70">
            Open source under MIT. FastAPI, LangGraph, Qdrant, LiveKit Agents and Next.js. It runs natively without Docker,
            and every external provider is optional or free.
          </p>
          <a
            data-reveal
            href={site.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-bg/25 px-5 py-2.5 text-sm font-medium transition-colors hover:border-bg"
          >
            View the source on GitHub
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </Reveal>
        <pre
          aria-label="Clai architecture diagram"
          className="overflow-x-auto rounded-2xl border border-bg/15 bg-bg/[0.04] p-6 font-mono text-[12px] leading-relaxed text-bg/80"
        >
          {diagram}
        </pre>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className={`${container} py-28 text-center`} aria-labelledby="cta-heading">
      <Reveal>
        <h2 id="cta-heading" data-reveal className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Your agreement has answers. <span className="text-mint-ink">Talk to it.</span>
        </h2>
        <div data-reveal className="mt-10">
          <Link
            href="/talk"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-medium text-bg transition-colors hover:bg-ink/85"
          >
            Talk to Clai
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
