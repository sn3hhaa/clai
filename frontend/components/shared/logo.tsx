import { cn } from "@/lib/utils";

// Geometry shared with assets/branding/generate.py ("the aperture" + detached evidence bar).
const APERTURE = "M38 10 H17 Q6 10 6 21 V43 Q6 54 17 54 H38 V44 H18 Q16 44 16 42 V22 Q16 20 18 20 H38 Z";

export function LogoMark({ className, title = "Clai" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7", className)} role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <path d={APERTURE} fill="currentColor" />
      <rect x="43" y="28.5" width="15" height="7" rx="1.5" fill="var(--mint)" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark is live text in Geist so it stays crisp; the brand files hold the outlined version. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark className="h-[22px] w-[22px]" title="" />
      <span aria-hidden className="relative text-[1.2rem] font-semibold leading-none tracking-[-0.045em]">
        cla<span className="relative">ı<span aria-hidden className="absolute left-[0.02em] top-[0.06em] h-[0.12em] w-[0.42em] rounded-[1px] bg-mint" /></span>
      </span>
      <span className="sr-only">Clai</span>
    </span>
  );
}
