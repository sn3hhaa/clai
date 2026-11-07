import { cn } from "@/lib/utils";

const RING = "M47.43 13.61 A24 24 0 1 0 47.43 50.39 L41 42.72 A14 14 0 1 1 41 21.28 Z";

/** Clai mark: an open "C" (conversation) holding an evidence block (the cited passage). */
export function LogoMark({ className, title = "Clai" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7", className)} role="img" aria-label={title}>
      <g transform="translate(2 0)">
        <path d={RING} fill="currentColor" />
        <rect x="42.5" y="27" width="10" height="10" rx="1.5" fill="var(--mint)" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark className="h-7 w-7" title="" />
      <span className="text-[1.35rem] font-semibold tracking-[-0.04em] leading-none">clai</span>
      <span className="sr-only">Clai home</span>
    </span>
  );
}
