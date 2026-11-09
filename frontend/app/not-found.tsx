import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SitePage } from "@/components/shared/page";

export default function NotFound() {
  return (
    <SitePage>
      <section className="mx-auto max-w-[1200px] px-5 pb-10 pt-24 md:px-8 md:pt-36">
        <p className="font-mono text-[0.8rem] text-mint">404 · not found in this site</p>
        <h1 className="display mt-6 max-w-[14ch] text-[clamp(3rem,7vw,6rem)]">
          This page isn&apos;t in the <em>document.</em>
        </h1>
        <p className="mt-8 max-w-[44ch] text-[1.1rem] leading-relaxed text-ink-2">
          The link may be old or mistyped. Here are the places people usually look for.
        </p>
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {[
            ["Open Clai", "/talk"],
            ["How it works", "/how-it-works"],
            ["Documentation", "/docs"],
            ["Home", "/"],
          ].map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="group flex items-center justify-between py-4 text-ink-2 hover:text-ink">
                {label}
                <ArrowRight aria-hidden className="h-4 w-4 text-ink-3 group-hover:text-mint" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SitePage>
  );
}
