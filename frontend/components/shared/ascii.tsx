import { cn } from "@/lib/utils";

/** Section label in the Clai ASCII style: "── 03 ─ GROUNDED ANSWERS". */
export function SectionLabel({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("label-mono flex items-center gap-2", className)}>
      <span aria-hidden className="text-line-strong">──</span>
      {index && (
        <>
          <span className="text-mint-ink">{index}</span>
          <span aria-hidden className="text-line-strong">─</span>
        </>
      )}
      <span>{children}</span>
    </p>
  );
}

/** A box-drawn frame used for the hero motif and technical callouts. */
export function AsciiFrame({ lines, className, label }: { lines: string[]; className?: string; label?: string }) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const edge = "─".repeat(width);
  const body = lines.map((l) => `│  ${l.padEnd(width - 4)}  │`);
  return (
    <pre
      aria-label={label}
      className={cn("font-mono text-[11px] leading-[1.55] text-ink-3 select-none overflow-hidden", className)}
    >
      {[`┌${edge}┐`, ...body, `└${edge}┘`].join("\n")}
    </pre>
  );
}

/** Inline monospace status chip: "[● READY]". */
export function StatusChip({ tone = "neutral", children }: { tone?: "neutral" | "mint" | "amber" | "danger"; children: React.ReactNode }) {
  const tones = {
    neutral: "text-ink-3 border-line",
    mint: "text-mint-ink border-mint/30 bg-mint-soft/60",
    amber: "text-amber-ink border-amber-ink/20 bg-amber-soft",
    danger: "text-danger border-danger/20 bg-danger-soft",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider", tones[tone])}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
