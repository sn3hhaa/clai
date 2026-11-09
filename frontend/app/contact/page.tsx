import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/shared/page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Feedback, bug reports and collaboration: how to reach the people behind Clai.",
};

type Channel = { purpose: string; detail: string; label: string; href: string };

const CHANNELS: Channel[] = [
  {
    purpose: "Product feedback",
    detail: "Something confusing, missing or wrong? Open an issue. Feature ideas are welcome too.",
    label: "Open an issue on GitHub",
    href: site.discussions,
  },
  {
    purpose: "Report a problem",
    detail: "Include what you asked and what Clai answered. Please don't attach a real agreement; describe it or use a fictional one.",
    label: "Report a bug",
    href: site.issues,
  },
  {
    purpose: "Security",
    detail: "Found a vulnerability? Report it privately rather than in a public issue.",
    label: "Private security report",
    href: `${site.repo}/security/advisories/new`,
  },
  {
    purpose: "Collaboration",
    detail: "Interested in contributing, or building on Clai? Start with the maintainer's profile and the contributing guide.",
    label: "github.com/sn3hhaa",
    href: site.social.github,
  },
  ...(site.social.email ? [{ purpose: "Email", detail: "For anything else.", label: site.social.email, href: `mailto:${site.social.email}` }] : []),
  ...(site.social.linkedin ? [{ purpose: "LinkedIn", detail: "Professional enquiries.", label: "LinkedIn", href: site.social.linkedin }] : []),
  ...(site.social.x ? [{ purpose: "X", detail: "Updates and short questions.", label: "X", href: site.social.x }] : []),
];

export default function ContactPage() {
  return (
    <SitePage>
      <section className="mx-auto grid max-w-[1200px] gap-16 px-5 pb-10 pt-20 md:grid-cols-12 md:px-8 md:pt-28">
        <div className="md:col-span-5">
          <p className="eyebrow">Contact</p>
          <h1 className="display mt-6 text-[clamp(2.8rem,6vw,5rem)]">
            Let&apos;s talk about <em>Clai.</em>
          </h1>
          <p className="mt-8 max-w-[38ch] text-[1.1rem] leading-relaxed text-ink-2">
            Clai is built in the open, so most conversations happen on GitHub. Pick whatever fits what you want to say.
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line md:col-span-7">
          {CHANNELS.map((c) => (
            <li key={c.purpose} className="grid gap-3 py-7 sm:grid-cols-[10rem_1fr]">
              <h2 className="eyebrow pt-1">{c.purpose}</h2>
              <div>
                <p className="leading-relaxed text-ink-2">{c.detail}</p>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group mt-3 inline-flex items-center gap-1.5 text-ink hover:text-mint"
                >
                  {c.label}
                  <ArrowUpRight aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SitePage>
  );
}
