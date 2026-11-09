import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PrimaryCta } from "@/components/home/sections";
import { Band, PageIntro, SitePage } from "@/components/shared/page";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Product",
  description: "What Clai is, who it helps, which documents it reads, and how answers connect back to the agreement.",
};

const PEOPLE = [
  ["Signing an offer or a lease", "Find the notice period, the probation terms, the deposit, or what happens if you leave early, before you sign."],
  ["Running a small business", "Check vendor, SaaS, NDA and consulting agreements for renewal dates, payment terms and liability caps."],
  ["Reviewing someone else's draft", "Jump between related clauses, quote the exact wording back, and spot what the agreement doesn't say."],
];

const DOCS = [
  ["Employment contracts and offer letters", "Supported"],
  ["NDAs, SaaS, vendor and service agreements", "Supported"],
  ["Freelance, consulting and software development", "Supported"],
  ["Rental, partnership and licensing agreements", "Supported"],
  ["Scanned PDFs (images of text)", "Not yet: needs OCR"],
  ["Word documents (.docx)", "Not yet: export to PDF first"],
];

export default function ProductPage() {
  return (
    <SitePage>
      <PageIntro
        marker="Product"
        title={
          <>
            A reader for agreements that <em>answers back.</em>
          </>
        }
        lead="Clai reads the agreement you add, lets you ask about it in your own words, and answers by quoting the clause that settles the question, with its page and section, so you can check it yourself."
      >
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <PrimaryCta />
          <Link href="/how-it-works" className="inline-flex items-center gap-2 text-ink-2 hover:text-ink">
            See how it works <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </PageIntro>

      <Band marker="Who it helps">
        <Reveal>
          <ol className="divide-y divide-line">
            {PEOPLE.map(([who, what], i) => (
              <li key={who} data-reveal className="grid gap-3 py-8 first:pt-0 md:grid-cols-[3rem_1fr_1.3fr] md:gap-8">
                <span className="font-mono text-[0.8rem] text-ink-3">0{i + 1}</span>
                <h2 className="display text-[1.7rem] leading-tight">{who}</h2>
                <p className="leading-relaxed text-ink-2">{what}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </Band>

      <Band marker="The idea" className="mt-24">
        <Reveal className="grid gap-12 md:grid-cols-2">
          <div data-reveal>
            <h2 className="display text-[2.4rem]">
              Quote first. <em>Explain second.</em>
            </h2>
            <p className="mt-5 leading-relaxed text-ink-2">
              The public version of Clai doesn&apos;t write its own summary of your contract. It finds the passage that
              answers your question and shows it to you word for word. If the agreement doesn&apos;t cover something,
              Clai says so and tells you which terms it couldn&apos;t find.
            </p>
            <p className="mt-4 leading-relaxed text-ink-2">
              That&apos;s deliberate. With contracts, a confident paraphrase you can&apos;t check is worse than no answer.
            </p>
          </div>
          <figure data-reveal className="self-start border border-line bg-surface p-6">
            <p className="eyebrow">You asked</p>
            <p className="mt-1.5 text-ink">Is there a cap on liability?</p>
            <p className="eyebrow mt-6 text-mint">Quoted from the agreement</p>
            <p className="display mt-1.5 text-[1.3rem] leading-snug">
              “Each party&apos;s total liability under this Agreement is limited to the fees paid by the Client in the twelve
              (12) months before the claim arose.”
            </p>
            <p className="mt-4 font-mono text-[0.75rem] text-ink-3">↳ Clause 7.2 · page 2 · fictional agreement</p>
          </figure>
        </Reveal>
      </Band>

      <Band marker="Documents" className="mt-24">
        <h2 className="display text-[2.4rem]">What Clai can read</h2>
        <table className="mt-8 w-full text-left">
          <caption className="sr-only">Supported document types</caption>
          <tbody>
            {DOCS.map(([kind, status]) => (
              <tr key={kind} className="border-b border-line">
                <th scope="row" className="py-4 pr-6 font-normal text-ink">
                  {kind}
                </th>
                <td className={`py-4 font-mono text-[0.8rem] ${status === "Supported" ? "text-mint" : "text-amber-ink"}`}>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 max-w-[60ch] text-[0.95rem] text-ink-3">
          Clai works best with agreements that number their clauses (8, 8.1, (a)…). Unnumbered documents still work;
          answers then cite the page and heading instead of a clause number.
        </p>
      </Band>

      <Band marker="Voice" className="mt-24">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="display text-[2.4rem]">
              Ask out loud, <em>if you like.</em>
            </h2>
            <p className="mt-5 leading-relaxed text-ink-2">
              In browsers that support speech recognition (Chrome, Edge and Safari), you can speak your question and
              hear the answer read back. Your browser turns speech into text; Clai only ever sees the text. Typing works
              in every browser.
            </p>
          </div>
          <div>
            <h2 className="display text-[2.4rem]">
              Context <em>carries over.</em>
            </h2>
            <p className="mt-5 leading-relaxed text-ink-2">
              Ask “what&apos;s the notice period?”, then “and if they breach it?” Clai links the follow-up to your
              earlier question and finds the clause about termination for cause.
            </p>
          </div>
        </div>
      </Band>

      <Band marker="Limits" className="mt-24">
        <h2 className="display text-[2.4rem]">What it won&apos;t do</h2>
        <ul className="mt-8 grid gap-x-10 gap-y-5 text-ink-2 md:grid-cols-2">
          <li>Give legal advice, or say whether a term is fair or enforceable.</li>
          <li>Read scanned documents. They need text recognition, which isn&apos;t built yet.</li>
          <li>Compare two agreements side by side. It&apos;s on the roadmap.</li>
          <li>Remember documents after you close the tab, by design.</li>
        </ul>
        <div className="mt-12">
          <PrimaryCta>Try it with a sample agreement</PrimaryCta>
        </div>
      </Band>
    </SitePage>
  );
}
