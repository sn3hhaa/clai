import type { Metadata } from "next";
import { PrimaryCta } from "@/components/home/sections";
import { PageIntro, SitePage } from "@/components/shared/page";
import { Reveal } from "@/components/shared/reveal";
import { asset } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description: "Add an agreement, explore it, ask a question, find the evidence, and keep the conversation going.",
};

const STEPS = [
  {
    title: "Add your agreement",
    body: "Drop in a PDF, or try the fictional sample. Clai reads it right there in your browser: every page, every heading, every numbered clause. Nothing is uploaded.",
    img: "/media/how/1-start.png",
    alt: "The Clai start screen with an area to drop a PDF and a link to try a sample agreement.",
  },
  {
    title: "Explore the document",
    body: "Open the document panel to read the agreement itself, with an outline of its sections and clauses you can jump between.",
    img: "/media/how/2-document.png",
    alt: "The document panel showing a page of the agreement beside its outline of sections and clauses.",
  },
  {
    title: "Ask a question",
    body: "Type it, or tap the microphone and say it. Use everyday words; Clai maps them to the way agreements are written.",
    img: "/media/how/3-ask.png",
    alt: "A question about ending the agreement early, with Clai's answer quoting clause 8.1.",
  },
  {
    title: "Find the evidence",
    body: "Every answer names its clause and page. Click it to see the passage highlighted in the original document, along with the other passages Clai considered.",
    img: "/media/how/4-evidence.png",
    alt: "The cited clause highlighted on page 2 of the document, next to the answer that quotes it.",
  },
  {
    title: "Keep the conversation going",
    body: "Ask follow-ups that build on your last question. When you're done, the session summary lists what you asked, what the agreement says, and what it didn't cover.",
    img: "/media/how/5-summary.png",
    alt: "A session summary listing the questions asked, the quoted clauses, and one question the agreement doesn't answer.",
  },
];

export default function HowItWorksPage() {
  return (
    <SitePage>
      <PageIntro
        marker="How it works"
        title={
          <>
            From a PDF to an answer <em>you can check.</em>
          </>
        }
        lead="Five steps, shown with the real interface and a fictional services agreement."
      />
      <ol className="mx-auto max-w-[1200px] px-5 md:px-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-line py-16 md:py-24">
            <Reveal className={`grid items-center gap-10 md:grid-cols-12 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div data-reveal className="md:col-span-4">
                <p className="font-mono text-[0.8rem] text-mint">0{i + 1}</p>
                <h2 className="display mt-3 text-[clamp(2rem,3.6vw,2.8rem)] leading-tight">{s.title}</h2>
                <p className="mt-5 leading-relaxed text-ink-2">{s.body}</p>
              </div>
              <figure data-reveal className={`md:col-span-8 ${i % 2 ? "" : "md:col-start-5"}`}>
                {/* Static export: no image optimisation server, so a plain img is correct here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(s.img)} alt={s.alt} width={1440} height={900} loading="lazy" className="block w-full border border-line" />
              </figure>
            </Reveal>
          </li>
        ))}
      </ol>
      <section className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="border-t border-line pt-16">
          <h2 className="display max-w-[18ch] text-[clamp(2.4rem,5vw,4rem)]">
            Ready to read <em>yours?</em>
          </h2>
          <div className="mt-8">
            <PrimaryCta />
          </div>
        </div>
      </section>
    </SitePage>
  );
}
