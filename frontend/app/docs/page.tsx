import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCS } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How to use Clai: getting started, asking questions, voice, documents, evidence, privacy and the technical reference.",
};

export default function DocsIndex() {
  return (
    <div>
      <p className="eyebrow">Documentation</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,5vw,4rem)]">
        Everything about <em>using Clai.</em>
      </h1>
      <p className="mt-6 max-w-[52ch] text-[1.1rem] leading-relaxed text-ink-2">
        Start with getting started. It takes about two minutes and ends with your first answer.
      </p>
      <ol className="mt-12 divide-y divide-line border-y border-line">
        {DOCS.map((d, i) => (
          <li key={d.slug}>
            <Link href={`/docs/${d.slug}`} className="group grid gap-2 py-6 md:grid-cols-[3rem_14rem_1fr_1.5rem] md:items-baseline md:gap-6">
              <span className="font-mono text-[0.78rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="display text-[1.4rem] text-ink group-hover:text-mint">{d.title}</span>
              <span className="leading-relaxed text-ink-2">{d.description}</span>
              <ArrowRight aria-hidden className="hidden h-4 w-4 text-ink-3 group-hover:text-mint md:block" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
