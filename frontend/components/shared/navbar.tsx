import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";

export function Navbar() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pb-10 pt-12 sm:pt-16">
      <Link href="/" aria-label="Clai home" className="flex items-center gap-2">
        <LogoMark className="h-6 w-6 text-ink" title="" />
        <span className="font-medium tracking-[-0.02em]">Clai</span>
      </Link>
      <nav aria-label="Main">
        <ul className="flex items-center gap-1 text-[13px] text-ink">
          <li className="hidden sm:block">
            <Link href="/#how-it-works" className="rounded-full px-3 py-2 hover:bg-surface-2">
              How it works
            </Link>
          </li>
          <li className="hidden sm:block">
            <Link href="/technology" className="rounded-full px-3 py-2 hover:bg-surface-2">
              Technology
            </Link>
          </li>
          <li>
            <a href={site.repo} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-2 hover:bg-surface-2">
              GitHub
            </a>
          </li>
          <li className="ml-2">
            <Link href="/talk" className="rounded-full bg-ink px-4 py-2 font-medium text-white transition-colors hover:bg-ink/85">
              Talk to Clai
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
