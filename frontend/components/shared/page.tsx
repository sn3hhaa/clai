import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { Reveal } from "./reveal";

/** Standard marketing page: header, main, footer. */
export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

/** Editorial page opening: a section marker, a display title and a lead, left-aligned on a 12-col grid. */
export function PageIntro({ marker, title, lead, children }: { marker: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-[1200px] px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
      <Reveal className="grid gap-8 md:grid-cols-12">
        <p data-reveal className="eyebrow md:col-span-3 md:pt-4">
          {marker}
        </p>
        <div className="md:col-span-9">
          <h1 data-reveal className="display max-w-[16ch] text-[clamp(2.75rem,6.5vw,5.5rem)]">
            {title}
          </h1>
          {lead && (
            <p data-reveal className="mt-8 max-w-[52ch] text-[1.15rem] leading-relaxed text-ink-2">
              {lead}
            </p>
          )}
          {children}
        </div>
      </Reveal>
    </header>
  );
}

/** A section with a marker in the left gutter and content on the right. */
export function Band({ marker, children, className = "" }: { marker?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-[1200px] px-5 md:px-8 ${className}`}>
      <div className="grid gap-8 border-t border-line pt-10 md:grid-cols-12">
        <p className="eyebrow md:col-span-3">{marker}</p>
        <div className="md:col-span-9">{children}</div>
      </div>
    </section>
  );
}
