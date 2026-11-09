"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import type { AnswerOut, Evidence, OutlineItem } from "@/lib/api/types";
import { cn, sourceLabel } from "@/lib/utils";

const PdfViewer = dynamic(() => import("@/components/documents/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => (
    <p role="status" className="grid h-full place-items-center text-sm text-ink-3">
      Loading the document viewer…
    </p>
  ),
});

export type PanelTab = "document" | "evidence";

export interface PanelProps {
  open: boolean;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  fileUrl: string;
  pageCount: number;
  outline: OutlineItem[];
  page: number;
  onPage: (p: number) => void;
  highlight: { page: number; text: string; chunk: string } | null;
  answer: AnswerOut | null;
  onShow: (e: Evidence) => void;
}

/** Document and evidence, shown only when needed: a side panel on desktop, a sheet on mobile. */
export function SidePanel(p: PanelProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const onCloseRef = React.useRef(p.onClose);
  React.useLayoutEffect(() => {
    onCloseRef.current = p.onClose;
  }, [p.onClose]);
  // Only when the panel opens: on small screens it covers the conversation, so move focus into it.
  // (Re-running this on every render stole focus from the question box.)
  React.useEffect(() => {
    if (!p.open) return;
    if (window.matchMedia("(max-width: 1023px)").matches) closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open]);

  return (
    <aside
      aria-label="Document and evidence"
      hidden={!p.open}
      className={cn(
        "flex min-h-0 flex-col border-line bg-bg-2",
        // Mobile: full-height sheet over the conversation. Desktop: a column beside it.
        "fixed inset-x-0 bottom-0 top-14 z-40 border-t lg:static lg:inset-auto lg:z-auto lg:border-l lg:border-t-0",
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4">
        <div role="tablist" aria-label="Panel" className="flex">
          {(["document", "evidence"] as PanelTab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={p.tab === t}
              onClick={() => p.onTab(t)}
              className={cn("relative px-3 py-3.5 text-[0.9rem] capitalize", p.tab === t ? "text-ink" : "text-ink-3 hover:text-ink-2")}
            >
              {t}
              {p.tab === t && <span aria-hidden className="absolute inset-x-3 bottom-0 h-px bg-mint" />}
            </button>
          ))}
        </div>
        <button ref={closeRef} type="button" onClick={p.onClose} aria-label="Close panel" className="grid h-9 w-9 place-items-center text-ink-2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {p.tab === "document" ? (
          <PdfViewer url={p.fileUrl} pageCount={p.pageCount} page={p.page} onPageChange={p.onPage} outline={p.outline} highlight={p.highlight} />
        ) : (
          <EvidenceList answer={p.answer} onShow={p.onShow} active={p.highlight?.chunk ?? null} />
        )}
      </div>
    </aside>
  );
}

function EvidenceList({ answer, onShow, active }: { answer: AnswerOut | null; onShow: (e: Evidence) => void; active: string | null }) {
  if (!answer) return <p className="p-6 text-ink-3">Ask a question to see the passages behind the answer.</p>;
  return (
    <div className="h-full overflow-y-auto p-5">
      <p className="eyebrow">For</p>
      <p className="mt-1 text-ink">“{answer.question}”</p>
      <ol className="mt-6 space-y-3">
        {answer.evidence.map((e) => (
          <li key={e.chunk_id}>
            <button
              type="button"
              onClick={() => onShow(e)}
              className={cn("w-full border p-4 text-left transition-colors", active === e.chunk_id ? "border-mint bg-mint-soft" : "border-line hover:border-line-strong")}
            >
              <span className="flex items-center justify-between gap-3 font-mono text-[0.75rem]">
                <span className={e.cited ? "text-mint" : "text-ink-2"}>{sourceLabel(e)}</span>
                <span className="text-ink-3">{e.cited ? "cited" : `${Math.round(e.score * 100)}% match`}</span>
              </span>
              {e.heading && <span className="mt-2 block text-[0.85rem] text-ink-2">{e.heading}</span>}
              <span className="mt-1.5 block text-[0.92rem] leading-relaxed text-ink">“{e.text}”</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[0.8rem] text-ink-3">
        {answer.generation === "llm" ? "Answer written by a language model from these passages." : "Quoted directly from the agreement."} Found in{" "}
        {Math.max(1, Math.round(answer.timings_ms.total ?? 0))} ms.
      </p>
    </div>
  );
}
