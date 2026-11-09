"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { DocPage, Heading } from "@/lib/docs";
import { cn } from "@/lib/utils";

export function DocsSidebar({ docs, index }: { docs: DocPage[]; index: { slug: string; title: string; text: string }[] }) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? new Set(index.filter((d) => q.split(/\s+/).every((w) => d.text.includes(w))).map((d) => d.slug)) : null;
  const groups = ["Guides", "Reference"] as const;
  return (
    <nav aria-label="Documentation" className="md:sticky md:top-24">
      <label className="flex items-center gap-2 border border-line-strong bg-surface px-3 py-2 focus-within:border-mint">
        <Search aria-hidden className="h-3.5 w-3.5 text-ink-3" />
        <span className="sr-only">Search the documentation</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs" className="w-full bg-transparent text-[0.9rem] text-ink outline-none placeholder:text-ink-3" />
      </label>
      {groups.map((g) => {
        const items = docs.filter((d) => d.group === g && (!matches || matches.has(d.slug)));
        if (!items.length) return null;
        return (
          <div key={g} className="mt-8">
            <p className="eyebrow">{g}</p>
            <ul className="mt-3 space-y-1">
              {items.map((d) => {
                const active = pathname.replace(/\/$/, "").endsWith(`/docs/${d.slug}`);
                return (
                  <li key={d.slug}>
                    <Link
                      href={`/docs/${d.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={cn("-ml-3 block border-l px-3 py-1.5 text-[0.92rem]", active ? "border-mint text-ink" : "border-transparent text-ink-2 hover:text-ink")}
                    >
                      {d.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {matches && matches.size === 0 && <p className="mt-6 text-[0.85rem] text-ink-3">No pages match “{query}”.</p>}
    </nav>
  );
}

export function OnThisPage({ headings }: { headings: Heading[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="sticky top-24">
      <p className="eyebrow">On this page</p>
      <ul className="mt-3 space-y-2 text-[0.85rem]">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="text-ink-3 hover:text-ink">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Adds copy buttons to code blocks rendered from Markdown. */
export function CopyButtons({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const pre of root.querySelectorAll("pre")) {
      if (pre.querySelector("button")) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Copy";
      btn.className = "absolute right-2 top-2 border border-[var(--line-strong)] bg-[var(--bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)]";
      btn.addEventListener("click", () => {
        void navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "").then(() => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1500);
        });
      });
      pre.appendChild(btn);
    }
  }, []);
  return <div ref={ref}>{children}</div>;
}
