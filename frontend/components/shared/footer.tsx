import Link from "next/link";
import { repoFile, repoTree, site } from "@/lib/site";
import { Painting } from "./painting";
import { SocialLinks } from "./social-icons";

const links: { label: string; href: string }[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Technology", href: "/technology" },
  { label: "Docs", href: repoTree("docs") },
  { label: "API", href: repoFile("docs/api/reference.md") },
  { label: "Architecture", href: repoFile("ARCHITECTURE.md") },
  { label: "Roadmap", href: repoFile("docs/roadmap.md") },
  { label: "Contributing", href: repoFile("CONTRIBUTING.md") },
  { label: "Security", href: repoFile("SECURITY.md") },
  { label: "License", href: repoFile("LICENSE") },
];

export function Footer() {
  return (
    <footer className="mt-32">
      <div className="mx-auto max-w-5xl px-6 pb-10">
        <div className="flex flex-col items-center gap-4 border-t border-line pt-10 text-center">
          <SocialLinks />
          <p className="max-w-xl text-xs leading-relaxed text-ink-3">
            Clai explains what an agreement says and shows where it says it. It is not legal advice and does not replace
            a qualified lawyer.
          </p>
        </div>
      </div>
      <div className="relative isolate flex min-h-[220px] flex-col justify-end">
        <Painting size={1280} position="center 75%" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-black/45" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pb-8 text-[13px] text-white md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-medium">Clai</p>
            <p className="mt-1 max-w-sm text-[11px] leading-snug text-white/75">
              Painting: George Inness, <cite>Landscape</cite> (1884 or 1889), The Metropolitan Museum of Art, public domain.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map(({ label, href }) => (
                <li key={label}>
                  {href.startsWith("http") ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className="hover:underline">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <span className="sr-only">{site.fullName}</span>
    </footer>
  );
}
