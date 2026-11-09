import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CopyButtons, OnThisPage } from "@/components/docs/docs-shell";
import { DOCS, renderDoc } from "@/lib/docs";
import { repoFile } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS.find((d) => d.slug === slug);
  return doc ? { title: `${doc.title} · Docs`, description: doc.description } : {};
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = DOCS.findIndex((d) => d.slug === slug);
  if (index < 0) notFound();
  const doc = DOCS[index];
  const { html, headings } = renderDoc(slug);
  const prev = DOCS[index - 1];
  const next = DOCS[index + 1];

  return (
    <div className="grid gap-12 xl:grid-cols-[1fr_12rem]">
      <article className="min-w-0">
        <nav aria-label="Breadcrumb" className="eyebrow">
          <ol className="flex gap-2">
            <li>
              <Link href="/docs" className="hover:text-ink">
                Docs
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink-2">
              {doc.title}
            </li>
          </ol>
        </nav>
        <h1 className="display mt-5 text-[clamp(2.4rem,4.6vw,3.6rem)]">{doc.title}</h1>
        <p className="mt-4 max-w-[60ch] text-[1.1rem] text-ink-2">{doc.description}</p>
        <CopyButtons>
          <div className="prose-clai mt-10" dangerouslySetInnerHTML={{ __html: html }} />
        </CopyButtons>

        <div className="mt-16 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="group border border-line p-4 hover:border-line-strong">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <ArrowLeft aria-hidden className="h-3 w-3" /> Previous
              </span>
              <span className="mt-1.5 block text-ink group-hover:text-mint">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/docs/${next.slug}`} className="group border border-line p-4 text-right hover:border-line-strong">
              <span className="eyebrow inline-flex items-center gap-1.5">
                Next <ArrowRight aria-hidden className="h-3 w-3" />
              </span>
              <span className="mt-1.5 block text-ink group-hover:text-mint">{next.title}</span>
            </Link>
          )}
        </div>
        <p className="mt-8 text-[0.8rem] text-ink-3">
          Something unclear?{" "}
          <a className="underline underline-offset-4 hover:text-ink" href={repoFile(`frontend/content/docs/${slug}.md`)} target="_blank" rel="noopener noreferrer">
            Suggest an edit to this page
          </a>
          .
        </p>
      </article>
      <aside className="hidden xl:block">
        <OnThisPage headings={headings} />
      </aside>
    </div>
  );
}
