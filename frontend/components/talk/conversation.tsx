"use client";

import * as React from "react";
import type { AnswerOut, Evidence } from "@/lib/api/types";
import { cn, sourceLabel } from "@/lib/utils";

export type Turn = { id: string; question: string; answer?: AnswerOut; error?: string; via: "text" | "voice" };

export function Conversation({
  turns,
  onCite,
  activeChunk,
}: {
  turns: Turn[];
  onCite: (answer: AnswerOut, evidence: Evidence) => void;
  activeChunk: string | null;
}) {
  const end = React.useRef<HTMLLIElement>(null);
  React.useEffect(() => {
    // Braces matter: Chrome's scrollIntoView now returns a Promise, and an effect must return
    // nothing or a cleanup function.
    void end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <ol className="space-y-12" aria-label="Conversation" aria-live="polite">
      {turns.map((t) => (
        <li key={t.id} className="space-y-4">
          <p className="ml-auto w-fit max-w-[85%] border border-line bg-surface px-4 py-2.5 text-ink">
            {t.via === "voice" && <span className="eyebrow mr-2">Spoken</span>}
            {t.question}
          </p>
          {t.error ? (
            <p role="alert" className="text-danger">
              {t.error}
            </p>
          ) : !t.answer ? (
            <p className="eyebrow animate-pulse">Reading the agreement…</p>
          ) : (
            <AnswerBlock answer={t.answer} onCite={onCite} activeChunk={activeChunk} />
          )}
        </li>
      ))}
      <li ref={end} aria-hidden />
    </ol>
  );
}

function AnswerBlock({ answer, onCite, activeChunk }: { answer: AnswerOut; onCite: (a: AnswerOut, e: Evidence) => void; activeChunk: string | null }) {
  const cited = answer.evidence.filter((e) => e.cited);
  const grounded = answer.grounding !== "insufficient";
  return (
    <div className="max-w-[62ch]">
      <p className={cn("eyebrow mb-2", grounded ? "text-mint" : "text-amber-ink")}>
        {grounded ? (answer.generation === "llm" ? "Answer · from the cited passage" : "Quoted from the agreement") : "Not found in the agreement"}
      </p>
      <p className={cn("leading-relaxed", grounded ? "display text-[1.45rem] leading-snug text-ink" : "text-[1.05rem] text-ink")}>{answer.answer}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(grounded ? cited : answer.evidence.slice(0, 3)).map((e) => (
          <button
            key={e.chunk_id}
            type="button"
            onClick={() => onCite(answer, e)}
            className={cn(
              "inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[0.75rem] transition-colors",
              activeChunk === e.chunk_id ? "border-mint bg-mint-soft text-mint" : "border-line-strong text-ink-2 hover:border-mint hover:text-ink",
            )}
            aria-label={`Show ${sourceLabel(e)} in the document`}
          >
            {grounded ? "↳" : "?"} {sourceLabel(e)}
          </button>
        ))}
      </div>
      {!grounded && answer.evidence.length > 0 && <p className="mt-3 text-[0.85rem] text-ink-3">These are the closest passages. Open them to check.</p>}
    </div>
  );
}
