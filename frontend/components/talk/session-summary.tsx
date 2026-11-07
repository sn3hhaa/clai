"use client";

import { X } from "lucide-react";
import type { SessionSummary as Summary, SourceRef } from "@/lib/api/types";
import { sourceLabel } from "@/lib/utils";

export function SessionSummary({
  summary,
  onClose,
  onShowSource,
}: {
  summary: Summary;
  onClose: () => void;
  onShowSource: (source: SourceRef) => void;
}) {
  const minutes =
    summary.ended_at && summary.started_at
      ? Math.max(1, Math.round((Date.parse(summary.ended_at) - Date.parse(summary.started_at)) / 60000))
      : null;
  return (
    <div className="h-full overflow-y-auto" role="region" aria-labelledby="summary-title">
      <div className="flex items-start justify-between border-b border-line p-5">
        <div>
          <p className="label-mono">Session summary</p>
          <h2 id="summary-title" className="mt-1.5 text-xl font-semibold tracking-tight">
            {summary.questions.length} question{summary.questions.length === 1 ? "" : "s"}
            {minutes ? ` · ${minutes} min` : ""}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close summary" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Block title="Questions asked">
        <ol className="space-y-1.5 text-sm">
          {summary.questions.map((q, i) => (
            <li key={`${q}-${i}`} className="flex gap-2">
              <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              {q}
            </li>
          ))}
        </ol>
      </Block>

      {summary.key_points.length > 0 && (
        <Block title="Key points">
          <ul className="space-y-1.5 text-sm text-ink-2">
            {summary.key_points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="text-mint-ink">↳</span>
                {p}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary.sources.length > 0 && (
        <Block title="Sources">
          <ul className="flex flex-wrap gap-2">
            {summary.sources.map((s) => (
              <li key={s.chunk_id}>
                <button
                  type="button"
                  onClick={() => onShowSource(s)}
                  className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-mint-ink hover:border-mint"
                >
                  {sourceLabel(s)}
                </button>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary.unresolved.length > 0 && (
        <Block title="Not answered by the agreement">
          <ul className="space-y-1.5 text-sm text-amber-ink">
            {summary.unresolved.map((q, i) => (
              <li key={`${q}-${i}`}>{q}</li>
            ))}
          </ul>
        </Block>
      )}

      {summary.transcript.length > 0 && (
        <Block title="Transcript">
          <ol className="space-y-3 text-sm">
            {summary.transcript.map((m) => (
              <li key={m.id}>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{m.role === "user" ? "You" : "Clai"}</p>
                <p className={m.role === "user" ? "text-ink" : "text-ink-2"}>{m.content}</p>
              </li>
            ))}
          </ol>
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line p-5 last:border-0">
      <h3 className="label-mono mb-3">{title}</h3>
      {children}
    </section>
  );
}
