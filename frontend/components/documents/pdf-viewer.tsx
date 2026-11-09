"use client";

import * as React from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdfjs"; // configures the worker for react-pdf's pdf.js
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { OutlineItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const normalise = (s: string) => s.toLowerCase().replace(/[‘’']/g, "'").replace(/\s+/g, " ").trim();

/**
 * Wrap text-layer items that belong to the highlighted passage in an evidence mark.
 * pdf.js splits text into line fragments that may also contain neighbouring text (e.g. a clause
 * number), so an item matches when it is contained in the passage, or when at least 60% of its
 * words fall inside 3-word runs that also occur in the passage. The coverage threshold stops
 * neighbouring clauses with shared boilerplate ("either party may terminate…") from lighting up.
 */
export function highlightItem(item: string, passage: string | null): string {
  const escaped = item.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  if (!passage) return escaped;
  const needle = normalise(item);
  if (needle.length < 4) return escaped;
  const haystack = normalise(passage);
  let match = haystack.includes(needle);
  if (!match) {
    const words = needle.split(" ");
    const covered = new Array<boolean>(words.length).fill(false);
    for (let i = 0; i + 3 <= words.length; i++) {
      if (haystack.includes(words.slice(i, i + 3).join(" "))) covered.fill(true, i, i + 3);
    }
    match = words.length >= 3 && covered.filter(Boolean).length / words.length >= 0.6;
  }
  return match ? `<mark class="evidence-mark">${escaped}</mark>` : escaped;
}

export interface PdfViewerProps {
  url: string;
  pageCount: number;
  page: number;
  onPageChange: (page: number) => void;
  outline: OutlineItem[];
  highlight: { page: number; text: string } | null;
}

export function PdfViewer({ url, pageCount, page, onPageChange, outline, highlight }: PdfViewerProps) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(560);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width) - 2)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const passage = highlight && highlight.page === page ? highlight.text : null;
  const renderText = React.useCallback(({ str }: { str: string }) => highlightItem(str, passage), [passage]);
  const sections = outline.filter((o) => o.level <= 2);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="grid h-8 w-8 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-mono text-xs text-ink-2" aria-live="polite">
          page {page} / {pageCount}
        </p>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="grid h-8 w-8 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-bg p-3">
        <div ref={frameRef} className="mx-auto max-w-[760px]">
          {error ? (
            <p role="alert" className="p-6 text-sm text-danger">{error}</p>
          ) : (
            <Document
              file={url}
              onLoadError={() => setError("The PDF couldn't be displayed. Is the backend still running?")}
              loading={<Spinner />}
            >
              <Page
                pageNumber={page}
                width={width}
                renderAnnotationLayer={false}
                customTextRenderer={renderText}
                loading={<Spinner />}
                className="overflow-hidden border border-line bg-white"
              />
            </Document>
          )}
        </div>
      </div>

      {sections.length > 0 && (
        <nav aria-label="Sections and clauses" className="max-h-[32%] shrink-0 overflow-y-auto border-t border-line px-2 py-2">
          <p className="eyebrow px-2 pb-1">Sections &amp; clauses</p>
          <ul>
            {sections.map((item, i) => (
              <li key={`${item.label}-${i}`}>
                <button
                  type="button"
                  onClick={() => onPageChange(item.page_number)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 px-2 py-1.5 text-left text-sm hover:bg-surface-2",
                    item.level === 2 ? "pl-6 text-ink-2" : "font-medium",
                    item.page_number === page && "text-ink",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-3">p.{item.page_number}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid h-64 place-items-center text-ink-3">
      <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading page" />
    </div>
  );
}
