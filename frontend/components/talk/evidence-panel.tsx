"use client";

import { ArrowUpRight, CircleAlert } from "lucide-react";
import { StatusChip } from "@/components/shared/ascii";
import type { AnswerOut, Evidence, Grounding } from "@/lib/api/types";
import { cn, sourceLabel } from "@/lib/utils";

const GROUNDING: Record<Grounding, { tone: "mint" | "amber" | "danger"; label: string }> = {
  grounded: { tone: "mint", label: "grounded" },
  partially_grounded: { tone: "amber", label: "partly grounded" },
  insufficient: { tone: "amber", label: "not in agreement" },
};

export function EvidencePanel({
  answer,
  onShow,
  activeChunk,
}: {
  answer: AnswerOut | null;
  onShow: (evidence: Evidence) => void;
  activeChunk: string | null;
}) {
  if (!answer) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <pre aria-hidden className="font-mono text-[11px] leading-relaxed text-line-strong">{"┌──────────┐\n│ evidence │\n└──────────┘"}</pre>
        <p className="mt-4 text-sm text-ink-2">Answers and the passages behind them appear here.</p>
        <p className="mt-1 font-mono text-xs text-ink-3">ask by voice or text to begin</p>
      </div>
    );
  }

  const grounding = GROUNDING[answer.grounding];
  const cited = answer.evidence.filter((e) => e.cited);
  const related = answer.evidence.filter((e) => !e.cited);

  return (
    <div className="h-full overflow-y-auto">
      <section className="border-b border-line p-5" aria-labelledby="current-answer">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="current-answer" className="label-mono">Current answer</h2>
          <StatusChip tone={grounding.tone}>{grounding.label}</StatusChip>
        </div>
        <p className="mt-3 text-sm text-ink-3">“{answer.question}”</p>
        <p className="mt-2 text-[1.05rem] leading-relaxed text-ink">{answer.answer}</p>
        {answer.grounding === "insufficient" && (
          <p className="mt-3 flex gap-2 rounded-lg bg-amber-soft p-3 text-sm text-amber-ink">
            <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            The agreement doesn&apos;t appear to answer this. The closest passages are listed below so you can check.
          </p>
        )}
        {answer.key_points.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
            {answer.key_points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden className="text-mint-ink">↳</span>
                {point}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 font-mono text-[11px] text-ink-3">
          {answer.generation === "llm" ? "written by the language model from the sources" : "quoted directly from the agreement"} ·{" "}
          {answer.retrieval_rounds > 1 ? "corrective search used · " : ""}
          {Math.round(answer.timings_ms.total ?? 0)} ms
        </p>
      </section>

      {cited.length > 0 && (
        <EvidenceList title="Supporting passages" items={cited} onShow={onShow} activeChunk={activeChunk} emphasise />
      )}
      {related.length > 0 && (
        <EvidenceList
          title={cited.length ? "Also retrieved" : "Closest passages"}
          items={related}
          onShow={onShow}
          activeChunk={activeChunk}
        />
      )}
    </div>
  );
}

function EvidenceList({
  title,
  items,
  onShow,
  activeChunk,
  emphasise = false,
}: {
  title: string;
  items: Evidence[];
  onShow: (e: Evidence) => void;
  activeChunk: string | null;
  emphasise?: boolean;
}) {
  return (
    <section className="p-5" aria-label={title}>
      <h3 className="label-mono">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((e) => (
          <li key={e.chunk_id}>
            <button
              type="button"
              onClick={() => onShow(e)}
              aria-label={`Show ${sourceLabel(e)} in the document`}
              className={cn(
                "group w-full rounded-xl border p-4 text-left transition-colors",
                activeChunk === e.chunk_id ? "border-mint bg-mint-soft/40" : "border-line bg-surface hover:border-ink/40",
                !emphasise && "opacity-80",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-mint-ink">{sourceLabel(e)}</span>
                <span className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
                  <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-line sm:block" aria-hidden>
                    <span className="block h-full bg-mint" style={{ width: `${Math.round(e.score * 100)}%` }} />
                  </span>
                  {Math.round(e.score * 100)}%
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
              {e.heading && <p className="mt-1.5 text-xs font-medium text-ink-2">{e.section && e.section !== e.heading ? `${e.section} · ${e.heading}` : e.heading}</p>}
              <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-ink-2">“{e.text}”</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
