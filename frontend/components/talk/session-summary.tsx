"use client";

import type { SessionSummary as Summary } from "@/lib/api/types";
import { sourceLabel } from "@/lib/utils";

export function SessionSummary({ summary, onClose, onNew }: { summary: Summary; onClose: () => void; onNew: () => void }) {
  const answered = summary.questions.length - summary.unresolved.length;
  return (
    <section aria-labelledby="summary-title" className="pt-8">
      <p className="eyebrow">Session summary</p>
      <h2 id="summary-title" className="display mt-3 text-[2.4rem]">
        {summary.questions.length} question{summary.questions.length === 1 ? "" : "s"}, {answered} answered from the agreement.
      </h2>

      {summary.key_points.length > 0 && (
        <div className="mt-10">
          <h3 className="eyebrow">What the agreement says</h3>
          <ul className="mt-4 space-y-4">
            {summary.key_points.map((p) => (
              <li key={p} className="border-l border-mint-deep pl-4 leading-relaxed text-ink">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.sources.length > 0 && (
        <div className="mt-10">
          <h3 className="eyebrow">Sources</h3>
          <p className="mt-3 font-mono text-[0.8rem] text-mint">{summary.sources.map((s) => sourceLabel(s)).join("  ·  ")}</p>
        </div>
      )}

      {summary.unresolved.length > 0 && (
        <div className="mt-10">
          <h3 className="eyebrow">Not found in the agreement</h3>
          <ul className="mt-3 space-y-1 text-amber-ink">
            {summary.unresolved.map((q, i) => (
              <li key={`${q}-${i}`}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-10 border-t border-line pt-6">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Transcript ({summary.transcript.length} messages)</summary>
        <ol className="mt-5 space-y-4">
          {summary.transcript.map((m) => (
            <li key={m.id}>
              <p className="eyebrow">{m.role === "user" ? "You" : "Clai"}</p>
              <p className={m.role === "user" ? "mt-1 text-ink" : "mt-1 text-ink-2"}>{m.content}</p>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={onClose} className="border border-line-strong px-4 py-2.5 text-ink hover:border-ink">
          Keep asking
        </button>
        <button type="button" onClick={onNew} className="bg-ink px-4 py-2.5 font-medium text-bg hover:bg-mint-hover">
          Start with a new document
        </button>
      </div>
    </section>
  );
}
