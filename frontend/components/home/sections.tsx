import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  FileSearch,
  HardDrive,
  Layers,
  MessagesSquare,
  Quote,
} from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { GitHubIcon } from "@/components/shared/social-icons";
import { site } from "@/lib/site";
import { Painting } from "@/components/shared/painting";
import { asset } from "@/lib/utils";
import { AuraDemo } from "./aura-demo";

const column = "mx-auto w-full max-w-5xl px-6";
const serif = "font-serif text-[2.5rem] font-normal leading-[1.2] tracking-[-0.0025em] text-ink";
const lead = "text-[1.1875rem] leading-[1.5] text-ink-2";

export function PillLink({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  const cls =
    "group inline-flex items-center gap-1.5 rounded-full bg-ink px-6 py-3 text-[0.95rem] font-medium text-white transition-colors hover:bg-ink/85";
  const body = (
    <>
      {children}
      <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

export function Hero() {
  return (
    <section className="px-6 text-center">
      <p className="text-ink-2">Agreement intelligence, through conversation</p>
      <h1 className={`${serif} mx-auto mt-4 max-w-[34rem]`}>Talk to your agreements. Understand what matters.</h1>
      <p className={`${lead} mx-auto mt-6 max-w-[38rem] text-balance`}>
        Upload a document, ask questions naturally, and get answers grounded in the agreement itself—with the
        evidence to trace them back.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <PillLink href="/talk">Talk to Clai</PillLink>
        <Link href="/#how-it-works" className="text-[0.95rem] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          See how it works
        </Link>
      </div>
    </section>
  );
}

/** Full-bleed painted band with the real product floating on it. */
export function ProductBand() {
  return (
    <section aria-label="Clai workspace" className="relative isolate mt-24 w-full">
      <Painting position="center 22%" />
      <div className="mx-auto max-w-5xl px-6 pb-14 pt-16 sm:pb-24 sm:pt-32">
        <figure className="overflow-hidden rounded-2xl border border-black/20 bg-white shadow-[0_30px_80px_-20px_rgba(20,30,15,0.55)]">
          <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </div>
          <picture>
            <source srcSet={asset("/art/product-talk.webp")} type="image/webp" />
            <img
              src={asset("/art/product-talk.png")}
              width={1440}
              height={900}
              alt="The Clai workspace: the agreement PDF with clause 8.1 highlighted, the voice panel with the transcript, and the evidence panel citing clause 8.1 on page 2."
              className="block h-auto w-full"
            />
          </picture>
        </figure>
      </div>
    </section>
  );
}

const features = [
  { icon: AudioLines, title: "Voice first", body: "Ask out loud and hear a short answer. Interrupt any time; follow-ups keep their context." },
  { icon: Quote, title: "Every answer cited", body: "Answers point to the page, section and clause they came from, and you can open them in the PDF." },
  { icon: FileSearch, title: "Reads the whole agreement", body: "Meaning-based and exact-wording search run together, then a reranker picks the best passages." },
  { icon: MessagesSquare, title: "Says when it doesn't know", body: "If the agreement doesn't answer your question, Clai tells you instead of guessing." },
  { icon: HardDrive, title: "Runs on your machine", body: "Your documents stay with your Clai backend. Speech can be recognised and spoken entirely locally." },
  { icon: Layers, title: "Open and inspectable", body: "MIT-licensed, documented and tested. Every step from PDF to answer is a module you can read." },
];

export function Features() {
  return (
    <section id="features" className={`${column} mt-32 scroll-mt-24`} aria-label="Features">
      <Reveal className="grid gap-x-10 gap-y-14 text-center sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} data-reveal>
            <Icon aria-hidden strokeWidth={1.5} className="mx-auto h-8 w-8 text-ink" />
            <h3 className="mt-4 font-medium tracking-[-0.02em]">{title}</h3>
            <p className="mx-auto mt-2 max-w-[18rem] leading-[1.6] text-ink-2">{body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function Card({ children, title, body }: { children: React.ReactNode; title: string; body: string }) {
  return (
    <div data-reveal className="flex flex-col items-center rounded-2xl border border-line bg-surface-2 px-8 pb-10 pt-8 text-center">
      <div className="flex min-h-[176px] w-full items-center justify-center">{children}</div>
      <h3 className="mt-4 font-medium tracking-[-0.02em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[24rem] leading-[1.6] text-ink-2">{body}</p>
    </div>
  );
}

export function Highlights() {
  return (
    <section className={`${column} mt-32`} aria-label="Voice and evidence">
      <Reveal className="grid gap-4 md:grid-cols-2">
        <Card
          title="Don't search the agreement. Talk to it."
          body="The Aura follows the conversation as Clai listens, thinks and speaks. In a call it moves with the real audio."
        >
          <AuraDemo />
        </Card>
        <Card
          title="Answers with a trail back to the agreement."
          body="Each answer comes with the passages it used. Citations are checked against what was actually retrieved."
        >
          <figure className="w-full max-w-[19rem] rounded-xl border border-line bg-white p-4 text-left shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]">
            <figcaption className="flex items-center justify-between text-[11px] text-ink-3">
              <span>Evidence</span>
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-amber-ink">Fictional example</span>
            </figcaption>
            <p className="mt-3 text-[13px] leading-snug text-ink">
              Either party may end the agreement with <span className="rounded bg-mint-soft px-1">30 days&apos; written notice</span>.
            </p>
            <p className="mt-3 border-l-2 border-mint pl-2.5 text-[12px] leading-snug text-ink-2">
              <span className="font-mono text-[11px] text-mint-ink">Clause 8.1 · p. 2</span>
              <br />“Either party may terminate this agreement with 30 days&apos; written notice.”
            </p>
          </figure>
        </Card>
      </Reveal>
    </section>
  );
}

const steps = [
  { pill: "Step 1", title: "Upload", body: "Drop in a PDF. Clai reads every page with its headings and clause numbers." },
  { pill: "Step 2", title: "Understand", body: "Each clause becomes a passage that remembers its page, section and clause." },
  { pill: "Step 3", title: "Ask", body: "Speak or type. Clai searches, grades the evidence, and searches again if it's weak." },
  { pill: "Step 4", title: "Trace", body: "Hear the answer, then open the cited clause, highlighted in the original PDF." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={`${column} mt-40 scroll-mt-24 text-center`} aria-labelledby="how-heading">
      <h2 id="how-heading" className={serif}>How it works</h2>
      <p className="mx-auto mt-4 max-w-xl text-ink-2">From a PDF to an answer you can check, in four steps.</p>
      <Reveal className="mt-12 grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.title} data-reveal className="rounded-2xl border border-line bg-surface-2 px-6 py-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs text-ink-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />
              {s.pill}
            </span>
            <h3 className="mt-4 text-lg font-medium tracking-[-0.02em]">{s.title}</h3>
            <p className="mt-2 text-sm leading-[1.6] text-ink-2">{s.body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

export function OpenSource() {
  return (
    <section className="mx-auto mt-40 max-w-md px-6 text-center" aria-labelledby="free-heading">
      <h2 id="free-heading" className={serif}>Free and open source</h2>
      <p className="mt-8 font-serif text-[4rem] leading-none text-ink">₹0</p>
      <p className="mt-3 text-sm text-ink-2">MIT licensed. Runs on your own machine with free, local models.</p>
      <div className="mt-8 flex justify-center">
        <PillLink href={site.repo} external>
          View on GitHub
        </PillLink>
      </div>
    </section>
  );
}

const pipeline = [
  ["PDF", "PyMuPDF · pages, sections, clauses"],
  ["Search", "Qdrant vectors + BM25, fused with RRF"],
  ["Rerank", "local cross-encoder"],
  ["Reason", "LangGraph · grade, correct, cite"],
  ["Answer", "one LLM call, or a direct quote"],
  ["Voice", "LiveKit · Whisper · Piper"],
];

export function Developers() {
  return (
    <section className="mx-auto mt-40 max-w-3xl px-6 text-center" aria-labelledby="dev-heading">
      <h2 id="dev-heading" className={serif}>Built for engineers who care where answers come from.</h2>
      <p className="mx-auto mt-4 max-w-xl text-ink-2">Every stage is a separate, tested module. The language model writes the answer and nothing else.</p>
      <Reveal className="mt-12 rounded-2xl border border-line bg-surface-2 p-3 text-left">
        <ol className="divide-y divide-line rounded-xl bg-white">
          {pipeline.map(([stage, detail], i) => (
            <li key={stage} data-reveal className="flex items-baseline gap-4 px-5 py-4">
              <span className="w-6 text-sm tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="w-20 font-medium">{stage}</span>
              <span className="text-sm text-ink-2">{detail}</span>
            </li>
          ))}
        </ol>
      </Reveal>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
        <Link href="/technology" className="text-ink underline-offset-4 hover:underline">
          Explore the technology →
        </Link>
        <a href={site.repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-ink underline-offset-4 hover:underline">
          <GitHubIcon className="h-4 w-4" /> Source on GitHub
        </a>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="mt-40 px-6 text-center" aria-labelledby="cta-heading">
      <h2 id="cta-heading" className={serif}>Your agreement has answers. Talk to it.</h2>
      <div className="mt-10 flex justify-center">
        <PillLink href="/talk">Talk to Clai</PillLink>
      </div>
    </section>
  );
}
