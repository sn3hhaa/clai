import Link from "next/link";
import { repoFile, site } from "@/lib/site";
import { asset } from "@/lib/utils";
import { LogoMark } from "./logo";

type FooterLink = { label: string; href: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/product" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Open Clai", href: "/talk" },
      { label: "Technology", href: "/technology" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "FAQ", href: "/docs/faq" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Source code", href: site.repo },
      { label: "Roadmap", href: repoFile("docs/roadmap.md") },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "GitHub", href: site.social.github },
      ...(site.social.linkedin ? [{ label: "LinkedIn", href: site.social.linkedin }] : []),
      ...(site.social.x ? [{ label: "X", href: site.social.x }] : []),
      ...(site.social.email ? [{ label: "Email", href: `mailto:${site.social.email}` }] : []),
      { label: "Report an issue", href: site.issues },
    ],
  },
];

function FooterAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "text-ink-2 transition-colors hover:text-ink";
  return href.startsWith("http") || href.startsWith("mailto:") ? (
    <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-line bg-bg-2">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(4,1fr)] md:gap-8">
          <div className="max-w-xs">
            <p className="display text-[1.65rem] leading-[1.15] text-ink">
              Read agreements by <em>asking them.</em>
            </p>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-3">
              Clai answers questions about an agreement and shows the clause behind every answer.
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow mb-5">{column.title}</h2>
              <ul className="space-y-3 text-[0.93rem]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterAnchor href={link.href}>{link.label}</FooterAnchor>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Oversized wordmark: the footer's signature. Decorative; the brand name is in the header. */}
      <div aria-hidden className="pointer-events-none select-none border-t border-line">
        <div className="mx-auto flex max-w-[1200px] items-end gap-[3vw] px-5 pt-10 md:px-8">
          <LogoMark className="mb-[1.4vw] h-[13vw] max-h-[150px] w-[13vw] max-w-[150px] text-ink/90" title="" />
          {/* The outlined brand wordmark (exact geometry, including the sage i-dot). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/brand/wordmark.svg")} alt="" className="h-[17vw] max-h-[190px] w-auto opacity-90" />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-6 text-[0.8rem] leading-relaxed text-ink-3 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="max-w-2xl">
            Clai helps you read agreements. It isn&apos;t legal advice, and it can be wrong, so check the cited clause
            and ask a qualified lawyer about anything that matters.
          </p>
          <p className="shrink-0">
            Open source ·{" "}
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
