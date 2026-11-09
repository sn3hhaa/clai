"use client";

import * as React from "react";
import { Aura, type AuraState } from "@/components/voice/aura";

const SCRIPT: { state: AuraState; ms: number; line?: { who: "You" | "Clai"; text: string } }[] = [
  { state: "listening", ms: 3200, line: { who: "You", text: "Can I leave this agreement early?" } },
  { state: "thinking", ms: 1500 },
  { state: "speaking", ms: 4200, line: { who: "Clai", text: "Yes. Clause 8.1 lets either party end it with 30 days' written notice." } },
  { state: "listening", ms: 2600, line: { who: "You", text: "And if they break it?" } },
  { state: "thinking", ms: 1300 },
  { state: "speaking", ms: 4000, line: { who: "Clai", text: "Clause 8.2: immediately, if a material breach isn't fixed within 10 days." } },
  { state: "idle", ms: 2200 },
];

/** Homepage demonstration. The states and audio levels are simulated and labelled as such. */
export function AuraDemo() {
  const [step, setStep] = React.useState(0);
  const start = React.useRef(0);
  const reduced = React.useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  React.useEffect(() => {
    if (reduced) return;
    start.current = performance.now();
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  const { state } = SCRIPT[step];
  const getLevel = React.useCallback(() => {
    if (state !== "listening" && state !== "speaking") return 0;
    const t = (performance.now() - start.current) / 1000;
    const syllables = Math.max(0, Math.sin(t * 9.3) * 0.6 + Math.sin(t * 13.7) * 0.4);
    return Math.min(1, syllables * (0.5 + 0.5 * Math.sin(t * 1.6)) * (state === "speaking" ? 0.95 : 0.75));
  }, [state]);

  const lines = SCRIPT.slice(0, step + 1)
    .map((s) => s.line)
    .filter(Boolean)
    .slice(-3) as { who: string; text: string }[];

  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <figure className="relative mx-auto w-full max-w-[420px]">
        <Aura state={reduced ? "idle" : state} getLevel={getLevel} label={`Demonstration of the Clai Aura, currently ${state}`} />
        <figcaption className="eyebrow mt-3 text-center">Demonstration · simulated audio</figcaption>
      </figure>
      <ol aria-live="polite" className="space-y-6">
        {lines.map((l, i) => (
          <li key={`${step}-${i}-${l.text}`} className="grid grid-cols-[3.5rem_1fr] gap-4">
            <span className="eyebrow pt-1.5">{l.who}</span>
            <p className={l.who === "Clai" ? "display text-[1.6rem] leading-snug text-ink" : "text-[1.05rem] leading-relaxed text-ink-2"}>{l.text}</p>
          </li>
        ))}
        <li className="grid grid-cols-[3.5rem_1fr] gap-4">
          <span className="eyebrow pt-0.5">Now</span>
          <span className="font-mono text-xs text-mint">{reduced ? "idle" : state}</span>
        </li>
      </ol>
    </div>
  );
}
