"use client";

import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { SectionLabel } from "@/components/shared/ascii";
import { api, ApiError } from "@/lib/api/client";
import type { DocumentOut } from "@/lib/api/types";
import { asset, cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 20 * 1024 * 1024;

type Stage = { kind: "idle" } | { kind: "uploading"; fraction: number; name: string } | { kind: "processing"; name: string };

export function validatePdf(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Clai reads PDF agreements. Please choose a .pdf file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return `That file is ${formatBytes(file.size)}; the limit is 20 MB.`;
  return null;
}

export function Uploader({ onReady }: { onReady: (doc: DocumentOut) => void }) {
  const [stage, setStage] = React.useState<Stage>({ kind: "idle" });
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const busy = stage.kind !== "idle";

  async function upload(file: File) {
    const problem = validatePdf(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStage({ kind: "uploading", fraction: 0, name: file.name });
    try {
      const doc = await api.uploadDocument(file, (fraction) =>
        setStage(fraction >= 1 ? { kind: "processing", name: file.name } : { kind: "uploading", fraction, name: file.name }),
      );
      onReady(doc);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
      setStage({ kind: "idle" });
    }
  }

  async function useSample() {
    setError(null);
    try {
      const response = await fetch(asset("/samples/services_agreement.pdf"));
      const blob = await response.blob();
      await upload(new File([blob], "Sample — Master Services Agreement.pdf", { type: "application/pdf" }));
    } catch {
      setError("Couldn't load the sample agreement.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-16 text-center">
      <SectionLabel>Start with an agreement</SectionLabel>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">What are we reading today?</h1>
      <p className="mt-4 max-w-md text-ink-2">
        Upload a text-based PDF up to 20 MB. It&apos;s processed by your Clai backend and stays there until you delete it.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF agreement"
        aria-busy={busy}
        aria-describedby="upload-help"
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
        className={cn(
          "mt-10 flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed bg-surface px-6 py-14 transition-colors",
          dragging ? "border-mint bg-mint-soft/40" : "border-line-strong hover:border-ink",
          busy && "cursor-wait",
        )}
      >
        {stage.kind === "idle" ? (
          <>
            <FileUp aria-hidden className="h-7 w-7 text-mint-ink" />
            <p className="mt-4 font-medium">Drop a PDF here, or click to choose</p>
            <p id="upload-help" className="mt-1 font-mono text-xs text-ink-3">
              .pdf · max 20 MB · no scans (OCR not supported)
            </p>
          </>
        ) : (
          <div className="w-full max-w-sm" aria-live="polite">
            <p className="truncate font-medium">{stage.name}</p>
            {stage.kind === "uploading" ? (
              <>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(stage.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-mint transition-[width]" style={{ width: `${Math.round(stage.fraction * 100)}%` }} />
                </div>
                <p className="mt-2 font-mono text-xs text-ink-3">uploading {Math.round(stage.fraction * 100)}%</p>
              </>
            ) : (
              <p className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-ink-2">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                parsing pages · detecting clauses · indexing
              </p>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={useSample}
        disabled={busy}
        className="mt-6 text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink disabled:opacity-50"
      >
        No agreement handy? Try a fictional sample
      </button>
    </div>
  );
}
