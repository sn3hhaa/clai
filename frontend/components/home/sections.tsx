import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { AuraDemo } from "./aura-demo";
import { EvidenceLink } from "./evidence-link";
import { ProductFilm } from "./product-film";

const wrap = "mx-auto max-w-[1200px] px-5 md:px-8";

export function PrimaryCta({ children = "Open Clai" }: { children?: React.ReactNode }) {
  return (
    <Link href="/talk" className="group inline-flex items-center gap-2 bg-ink px-6 py-3.5 font-medium text-bg transition-colors hover:bg-mint-hover">
      {children}
      <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Marker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="eyebrow flex items-baseline gap-3">
      <span className="text-mint">§ {n}</span>
      <span>{children}</span>
    </p>
  );
}

/* ── A. Hero ───────────────────────────────────────────────────────── */
export function Hero() {
  return (
    <section className={`${wrap} pb-20 pt-16 md:pb-28 md:pt-24`}>
      <Reveal className="grid gap-14 md:grid-cols-12 md:gap-8" stagger={0.09}>
        <div className="md:col-span-7">
          <h1 data-reveal className="display text-[clamp(3.2rem,8.4vw,7.4rem)]">
            Your agreement, <em>explained.</em>
          </h1>
          <p data-reveal className="mt-8 max-w-[34ch] text-[1.2rem] leading-relaxed text-ink-2">
            Ask about the details that matter in plain language, and see every answer traced back to the clause it came from.
          </p>
          <div data-reveal className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <PrimaryCta />
            <a href="#walkthrough" className="group inline-flex items-center gap-2 text-ink-2 transition-colors hover:text-ink">
              Watch the walkthrough
              <ArrowRight aria-hidden className="h-4 w-4 rotate-90 transition-transform group-hover:translate-y-0.5" />
            </a>
          </div>
        </div>

        {/* A page fragment with a margin annotation: the product's idea in one image. */}
        <aside data-reveal aria-label="Example: an answer traced to its clause" className="relative md:col-span-5 md:pt-6">
          <div className="border border-line bg-surface p-6 font-mono text-[0.78rem] leading-[1.9] text-ink-3">
            <p className="mb-3 text-ink-2">8. Termination</p>
            <p>
              8.1 Termination for convenience. Either party may terminate this agreement with{" "}
              <span className="evidence-highlight">30 days&apos; written notice.</span>
            </p>
            <p className="mt-3">8.2 Termination for cause. Either party may terminate this Agreement immediately by written notice if the other party commits a material breach…</p>
          </div>
          <div className="relative ml-6 border-l border-mint-deep pl-5 pt-5">
            <span aria-hidden className="absolute -left-[3px] top-0 h-1.5 w-1.5 bg-mint" />
            <p className="eyebrow">You asked</p>
            <p className="mt-1.5 text-ink">How much notice do I need to give?</p>
            <p className="eyebrow mt-4">Clai · clause 8.1 · page 2</p>
            <p className="display mt-1.5 text-[1.45rem] leading-snug">Thirty days, in writing.</p>
          </div>
          <p className="mt-4 text-right text-[0.75rem] text-ink-3">Fictional agreement</p>
        </aside>
      </Reveal>
    </section>
  );
}

/* ── C. Product film ───────────────────────────────────────────────── */
export function Film() {
  return (
    <section className={`${wrap}`} aria-label="Product walkthrough">
      <ProductFilm />
    </section>
  );
}

/* ── D. The problem ────────────────────────────────────────────────── */
const DENSE = `10.4 Notwithstanding anything to the contrary herein, and subject always to the provisions of Clauses 7.2 and 9.1, neither Party shall be liable to the other Party for any indirect, special or consequential losses howsoever arising, including without limitation loss of profit, revenue, goodwill or anticipated savings, whether in contract, tort (including negligence), breach of statutory duty or otherwise, save that `;
const DENSE_AFTER = ` and provided further that any claim shall be notified in writing within the period specified in Schedule C, failing which such claim shall be deemed waived to the fullest extent permitted by applicable law.`;

export function Problem() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`}>
      <Reveal className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <span data-reveal>
            <Marker n="01">The problem</Marker>
          </span>
          <h2 data-reveal className="display mt-6 text-[clamp(2.3rem,4.6vw,3.6rem)]">
            Agreements are written to be precise. <em>Not to be read.</em>
          </h2>
          <p data-reveal className="mt-6 max-w-[40ch] text-[1.05rem] leading-relaxed text-ink-2">
            The sentence that decides your notice period, your liability or your renewal is usually buried in a clause like
            the one beside this text. Clai finds it, quotes it, and shows you where it is.
          </p>
        </div>
        <figure data-reveal className="md:col-span-6 md:col-start-7">
          <blockquote className="border-l border-line pl-6 text-[1.02rem] leading-[1.85] text-ink-3">
            {DENSE}
            <span className="evidence-highlight">each Party&apos;s total liability is capped at the fees paid in the preceding twelve months</span>
            {DENSE_AFTER}
          </blockquote>
          <figcaption className="mt-4 pl-6 text-[0.78rem] text-ink-3">A fictional clause. The highlighted part is what most people actually need.</figcaption>
        </figure>
      </Reveal>
    </section>
  );
}

/* ── E. Conversation ───────────────────────────────────────────────── */
export function Conversation() {
  return (
    <section className="mt-32 border-y border-line bg-bg-2 py-24 md:mt-44 md:py-32">
      <div className={wrap}>
        <Reveal className="mb-14 max-w-2xl">
          <span data-reveal>
            <Marker n="02">The conversation</Marker>
          </span>
          <h2 data-reveal className="display mt-6 text-[clamp(2.3rem,4.6vw,3.6rem)]">
            Less searching. <em>More understanding.</em>
          </h2>
          <p data-reveal className="mt-6 text-[1.05rem] leading-relaxed text-ink-2">
            Ask the way you&apos;d ask a person. Follow-up questions keep their context, so “and if they break it?”
            just works. Speak or type, whichever suits you.
          </p>
        </Reveal>
        <AuraDemo />
      </div>
    </section>
  );
}

/* ── F. Evidence ───────────────────────────────────────────────────── */
export function Evidence() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`}>
      <Reveal className="max-w-2xl">
        <span data-reveal>
          <Marker n="03">The evidence</Marker>
        </span>
        <h2 data-reveal className="display mt-6 text-[clamp(2.3rem,4.6vw,3.6rem)]">
          Every answer points back to <em>the clause.</em>
        </h2>
      </Reveal>
      <EvidenceLink>
        <div className="mt-14 grid items-start gap-6 md:grid-cols-12 md:gap-0">
          <div className="space-y-5 md:col-span-5">
            <div data-q className="border border-line p-5">
              <p className="eyebrow">Question</p>
              <p className="mt-2 text-[1.1rem] text-ink">What happens if I terminate early?</p>
            </div>
            <div data-a className="border border-mint-deep bg-surface p-5">
              <p className="eyebrow text-mint">Answer · grounded</p>
              <p className="mt-2 text-[1.05rem] leading-relaxed text-ink">
                You pay for the work done up to the termination date, and both sides return each other&apos;s confidential
                information.
              </p>
              <p className="mt-4 font-mono text-[0.75rem] text-ink-3">↳ Clause 8.3 · page 2</p>
            </div>
          </div>
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="hidden h-[260px] w-full md:col-span-2 md:block">
            <path data-link-path d="M0 72 C 45 72, 55 40, 100 40" fill="none" stroke="var(--mint-deep)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <figure className="border border-line bg-[#f2f1ec] p-6 text-[#1b1f1d] md:col-span-5">
            <p className="font-mono text-[0.7rem] uppercase tracking-wider text-[#5c625e]">Page 2 · Services Agreement (fictional)</p>
            <p className="mt-4 text-[0.92rem] font-medium">8. Termination</p>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-[#4a504c]">8.2 Either party may terminate immediately by written notice if the other commits a material breach…</p>
            <p className="mt-3 text-[0.88rem] leading-relaxed">
              8.3{" "}
              <span data-hl className="bg-[length:100%_100%] bg-no-repeat px-0.5" style={{ backgroundImage: "linear-gradient(var(--mint), var(--mint))" }}>
                On termination, the Client shall pay for all Services performed up to the termination date, and each party
                shall return the other party&apos;s Confidential Information.
              </span>
            </p>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-[#4a504c]">9. Governing Law and Disputes…</p>
          </figure>
        </div>
      </EvidenceLink>
      <p className="mt-4 text-[0.78rem] text-ink-3">Illustration with a fictional agreement.</p>
    </section>
  );
}

/* ── G. How it works ───────────────────────────────────────────────── */
const STEPS = [
  ["Upload", "Add a PDF agreement. It's read in your browser, page by page, with its sections and clause numbers."],
  ["Explore", "Browse the outline and jump to any clause. Nothing is summarised away."],
  ["Ask", "Type or speak a question. Clai searches the whole agreement for the passage that answers it."],
  ["Verify", "Each answer quotes its clause and page. Open it in the document to read the context."],
];

export function HowItWorks() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`} aria-labelledby="how">
      <Reveal className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <span data-reveal>
            <Marker n="04">How it works</Marker>
          </span>
          <h2 id="how" data-reveal className="display mt-6 text-[clamp(2.3rem,4.6vw,3.6rem)]">
            Upload, explore, ask, <em>verify.</em>
          </h2>
          <Link data-reveal href="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-ink-2 hover:text-ink">
            The full walkthrough <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ol className="relative md:col-span-8">
          <span aria-hidden className="absolute left-[0.55rem] top-2 h-[calc(100%-1rem)] w-px bg-line" />
          {STEPS.map(([title, body], i) => (
            <li key={title} data-reveal className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-10 last:pb-0">
              <span aria-hidden className={`relative mt-2 h-[1.15rem] w-[1.15rem] border ${i === 3 ? "border-mint bg-mint" : "border-line-strong bg-bg"}`} />
              <div>
                <p className="font-mono text-[0.75rem] text-ink-3">0{i + 1}</p>
                <h3 className="display mt-1 text-[1.9rem]">{title}</h3>
                <p className="mt-2 max-w-[48ch] leading-relaxed text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

/* ── H. Capabilities ───────────────────────────────────────────────── */
const CAPS = [
  ["Natural questions", "“Can I leave early?” finds “termination for convenience”. Clai maps everyday words to how agreements are written."],
  ["Follow-ups", "Context carries over, so short follow-ups like “and for cause?” refer back to what you just asked."],
  ["Source references", "Answers quote the agreement and name the clause, section and page. Clai doesn't paraphrase what it can't cite."],
  ["Honest gaps", "When the agreement doesn't cover something, Clai says so and names what's missing instead of guessing."],
  ["Voice", "Speak your question and hear the answer read aloud in browsers that support it. Text always works."],
  ["Document navigation", "An outline of every section and clause, with the cited passage highlighted on its page."],
];

export function Capabilities() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`} aria-labelledby="caps">
      <Reveal>
        <div data-reveal className="flex items-end justify-between gap-6 border-b border-line pb-8">
          <h2 id="caps" className="display text-[clamp(2.3rem,4.6vw,3.6rem)]">
            What it does today
          </h2>
          <Link href="/product" className="hidden shrink-0 items-center gap-2 text-ink-2 hover:text-ink md:inline-flex">
            Product overview <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <dl>
          {CAPS.map(([name, body]) => (
            <div key={name} data-reveal className="grid gap-2 border-b border-line py-7 md:grid-cols-12 md:gap-8">
              <dt className="display text-[1.55rem] md:col-span-4">{name}</dt>
              <dd className="max-w-[56ch] leading-relaxed text-ink-2 md:col-span-7 md:col-start-6">{body}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

/* ── I. Privacy ────────────────────────────────────────────────────── */
export function Privacy() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`} aria-labelledby="privacy-h">
      <Reveal className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <span data-reveal>
            <Marker n="05">Privacy</Marker>
          </span>
          <h2 id="privacy-h" data-reveal className="display mt-6 text-[clamp(2.3rem,4.6vw,3.6rem)]">
            Your document <em>stays with you.</em>
          </h2>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 md:col-span-7">
          <div data-reveal>
            <p className="eyebrow text-mint">Stays on your device</p>
            <ul className="mt-4 space-y-3 text-ink-2">
              <li>The PDF you add. It&apos;s read in your browser and never uploaded.</li>
              <li>Search, answers and citations, all computed locally.</li>
              <li>Your conversation, which is gone when you close the tab.</li>
            </ul>
          </div>
          <div data-reveal>
            <p className="eyebrow">May leave it</p>
            <ul className="mt-4 space-y-3 text-ink-2">
              <li>Your voice, if you use the microphone. Some browsers, including Chrome, send speech to their own recognition service.</li>
              <li>Nothing else. Clai has no server for the public version, no analytics, and no accounts.</li>
            </ul>
            <Link href="/privacy" className="mt-6 inline-flex items-center gap-2 text-ink hover:text-mint">
              Read the privacy notice <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── J. Final call to action ───────────────────────────────────────── */
export function FinalCta() {
  return (
    <section className={`${wrap} mt-32 md:mt-44`}>
      <Reveal className="border-t border-line pt-16">
        <h2 data-reveal className="display max-w-[14ch] text-[clamp(2.8rem,7vw,6rem)]">
          The details are in the document. <em>Find them.</em>
        </h2>
        <div data-reveal className="mt-10">
          <PrimaryCta />
        </div>
      </Reveal>
    </section>
  );
}
