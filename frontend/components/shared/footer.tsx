import Link from "next/link";
import { repoFile, repoTree, site } from "@/lib/site";
import { Logo } from "./logo";
import { SocialLinks } from "./social-icons";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Talk to Clai", href: "/talk" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Technology", href: "/technology" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: repoTree("docs") },
      { label: "API reference", href: repoFile("docs/api/reference.md") },
      { label: "Architecture", href: repoFile("ARCHITECTURE.md") },
      { label: "Roadmap", href: repoFile("docs/roadmap.md") },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: site.repo },
      { label: "Contributing", href: repoFile("CONTRIBUTING.md") },
      { label: "Security", href: repoFile("SECURITY.md") },
      { label: "License (MIT)", href: repoFile("LICENSE") },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2/50">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-ink-2">{site.tagline}</p>
          <SocialLinks />
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="label-mono mb-4">{column.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {column.links.map((link) => {
                const external = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    {external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-ink-2 transition-colors hover:text-ink">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-ink-2 transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-ink-3 sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl leading-relaxed">
            Clai explains what an agreement says and shows where it says it. It is not legal advice and does not replace a
            qualified lawyer.
          </p>
          <p className="font-mono uppercase tracking-wider">
            <span aria-hidden>└─ </span>clai · open source · mit
          </p>
        </div>
      </div>
    </footer>
  );
}
