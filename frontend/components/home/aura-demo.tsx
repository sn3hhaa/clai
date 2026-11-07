"use client";

import * as React from "react";
import { Aura, type AuraState } from "@/components/voice/aura";

const SCRIPT: { state: AuraState; ms: number; caption: string }[] = [
  { state: "listening", ms: 3200, caption: "Listening: “Can I end this early?”" },
  { state: "thinking", ms: 1800, caption: "Thinking: searching clauses 8.1–8.3" },
  { state: "speaking", ms: 4200, caption: "Speaking: “Yes, with 30 days' written notice.”" },
  { state: "idle", ms: 1600, caption: "Waiting for your next question" },
];

/** Homepage demonstration. The state sequence and audio levels here are simulated. */
export function AuraDemo() {
  const [step, setStep] = React.useState(0);
  const start = React.useRef(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    start.current = performance.now();
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
    return () => window.clearTimeout(timer);
  }, [step]);

  const { state, caption } = SCRIPT[step];
  const getLevel = React.useCallback(() => {
    if (state !== "listening" && state !== "speaking") return 0;
    const t = (performance.now() - start.current) / 1000;
    // A speech-like envelope: syllable bursts under a slower phrase contour.
    const syllables = Math.max(0, Math.sin(t * 9.5) * 0.6 + Math.sin(t * 14.3) * 0.4);
    const phrase = 0.55 + 0.45 * Math.sin(t * 1.7);
    return Math.min(1, syllables * phrase * (state === "speaking" ? 1 : 0.8));
  }, [state]);

  return (
    <figure className="relative">
      <div className="mx-auto max-w-[420px]">
        <Aura state={state} getLevel={getLevel} label={`Demonstration of the Clai Aura: ${state}`} />
      </div>
      <figcaption className="mt-2 flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-xs text-ink-2" aria-live="polite">
          {caption}
        </span>
        <span className="label-mono">Demonstration · simulated audio</span>
      </figcaption>
    </figure>
  );
}
