import type { Metadata } from "next";
import { Band, PageIntro, SitePage } from "@/components/shared/page";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "About",
  description: "Why Clai exists, what it believes about answers and evidence, and where it is today.",
};

const PRINCIPLES = [
  ["Evidence before assumptions", "An answer without its source is a claim. Clai shows the clause first and lets you decide."],
  ["Clarity before complexity", "Plain questions, plain answers, and the original wording one click away."],
  ["Honest gaps", "“The agreement doesn't mention it” is a useful answer. Guessing isn't."],
  ["Calm by default", "A quiet interface for a stressful kind of document. Nothing flashes for attention."],
  ["Private by design", "The public version never receives your document, because it doesn't need to."],
];

export default function AboutPage() {
  return (
    <SitePage>
      <PageIntro
        marker="About"
        title={
          <>
            Contracts decide a lot. <em>They should be easier to read.</em>
          </>
        }
      />
      <Band marker="Why">
        <div className="prose-clai max-w-none">
          <p>
            Most people sign agreements they haven&apos;t really read. Not out of carelessness: the clauses that matter
            (how to leave, what you owe, who owns the work, when it renews) are written for precision, spread across
            pages, and phrased differently from how anyone would ask about them.
          </p>
          <p>
            Search finds words, not answers. General chatbots answer fluently but can&apos;t show you where an answer
            came from, and with a contract, an answer you can&apos;t check is a risk.
          </p>
          <p>
            Clai sits in between. It lets you ask in your own words, and it answers by pointing at the agreement: this
            clause, this page, this wording.
          </p>
        </div>
      </Band>

      <Band marker="Principles" className="mt-24">
        <Reveal>
          <dl className="divide-y divide-line border-y border-line">
            {PRINCIPLES.map(([name, body]) => (
              <div key={name} data-reveal className="grid gap-2 py-6 md:grid-cols-[1fr_1.4fr] md:gap-10">
                <dt className="display text-[1.5rem]">{name}</dt>
                <dd className="leading-relaxed text-ink-2">{body}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Band>

      <Band marker="Status" className="mt-24">
        <div className="prose-clai max-w-none">
          <p>
            Clai is an independent, open-source project, built and maintained by one developer. It isn&apos;t a company,
            and there are no customers, investors or team to list. The public version on this site is free and runs
            entirely in your browser. A fuller version with meaning-based search and real-time voice is in the same
            repository for anyone who runs it on their own computer.
          </p>
          <p>
            It&apos;s early. It reads text-based PDFs in English, it can be wrong, and it doesn&apos;t give legal advice.
            Feedback is genuinely useful. See the contact page.
          </p>
        </div>
      </Band>
    </SitePage>
  );
}
