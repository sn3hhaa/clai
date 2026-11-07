import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { Logo } from "./logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Clai home">
          <Logo />
        </Link>
        <ul className="flex items-center gap-1 text-sm text-ink-2">
          <li className="hidden sm:block">
            <Link href="/#how-it-works" className="rounded-full px-3 py-2 transition-colors hover:text-ink">
              How it works
            </Link>
          </li>
          <li className="hidden sm:block">
            <Link href="/technology" className="rounded-full px-3 py-2 transition-colors hover:text-ink">
              Technology
            </Link>
          </li>
          <li className="hidden md:block">
            <a href={site.repo} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-2 transition-colors hover:text-ink">
              GitHub
            </a>
          </li>
          <li className="ml-2">
            <Link
              href="/talk"
              className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-ink/85"
            >
              Talk to Clai
              <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
