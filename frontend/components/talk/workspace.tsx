"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FilePlus2, Trash2 } from "lucide-react";
import { Uploader } from "@/components/documents/uploader";
import { StatusChip } from "@/components/shared/ascii";
import { LogoMark } from "@/components/shared/logo";
import { api } from "@/lib/api/client";
import type { AnswerOut, DocumentOut, Evidence, SessionSummary as Summary, SourceRef } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { EvidencePanel } from "./evidence-panel";
import { SessionSummary } from "./session-summary";
import { VoicePanel } from "./voice-panel";

// pdf.js needs the browser (canvas, workers).
const PdfViewer = dynamic(() => import("@/components/documents/pdf-viewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => (
    <p role="status" className="grid h-full place-items-center text-sm text-ink-3">
      Loading the document viewer…
    </p>
  ),
});

type Tab = "agreement" | "voice" | "evidence";

export function Workspace() {
  const [doc, setDoc] = React.useState<DocumentOut | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<AnswerOut | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [page, setPage] = React.useState(1);
  const [highlight, setHighlight] = React.useState<{ page: number; text: string; chunk: string } | null>(null);
  const [tab, setTab] = React.useState<Tab>("voice");
  const [unseen, setUnseen] = React.useState(false);

  const showEvidence = React.useCallback((e: Pick<Evidence, "chunk_id" | "page_number" | "text">) => {
    setPage(e.page_number);
    setHighlight({ page: e.page_number, text: e.text, chunk: e.chunk_id });
    setTab("agreement");
  }, []);

  const onAnswer = React.useCallback((a: AnswerOut) => {
    setAnswer(a);
    setSummary(null);
    const top = a.evidence.find((e) => e.cited) ?? (a.sufficient ? a.evidence[0] : undefined);
    if (top) {
      setPage(top.page_number);
      setHighlight({ page: top.page_number, text: top.text, chunk: top.chunk_id });
    }
    setUnseen(true);
  }, []);

  const onShowSource = React.useCallback(
    (s: SourceRef) => {
      const ev = answer?.evidence.find((e) => e.chunk_id === s.chunk_id);
      showEvidence({ chunk_id: s.chunk_id, page_number: s.page_number, text: ev?.text ?? "" });
    },
    [answer, showEvidence],
  );

  async function removeDocument() {
    if (!doc || !window.confirm(`Delete “${doc.filename}” and its conversations from your Clai backend?`)) return;
    await api.deleteDocument(doc.id).catch(() => undefined);
    reset();
  }

  function reset() {
    setDoc(null);
    setConversationId(null);
    setAnswer(null);
    setSummary(null);
    setHighlight(null);
    setPage(1);
  }

  if (!doc) {
    return (
      <Shell>
        <Uploader
          onReady={(d) => {
            setDoc(d);
            setTab("voice");
          }}
        />
      </Shell>
    );
  }

  const panels: Record<Tab, React.ReactNode> = {
    agreement: (
      <PdfViewer
        url={api.documentFileUrl(doc.id)}
        pageCount={doc.page_count}
        page={page}
        onPageChange={setPage}
        outline={doc.outline}
        highlight={highlight}
      />
    ),
    voice: (
      <VoicePanel
        documentId={doc.id}
        conversationId={conversationId}
        onConversation={setConversationId}
        onAnswer={onAnswer}
        onSummary={(s) => {
          setSummary(s);
          setUnseen(true);
        }}
      />
    ),
    evidence: summary ? (
      <SessionSummary summary={summary} onClose={() => setSummary(null)} onShowSource={onShowSource} />
    ) : (
      <EvidencePanel answer={answer} onShow={showEvidence} activeChunk={highlight?.chunk ?? null} />
    ),
  };
  const titles: Record<Tab, string> = { agreement: "Agreement", voice: "Clai voice", evidence: summary ? "Summary" : "Evidence" };

  return (
    <Shell
      toolbar={
        <div className="flex min-w-0 items-center gap-3">
          <p className="hidden truncate text-sm font-medium sm:block" title={doc.filename}>{doc.filename}</p>
          <StatusChip tone="mint">{doc.page_count} pages · {doc.chunk_count} passages</StatusChip>
          <button type="button" onClick={reset} className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink md:inline-flex">
            <FilePlus2 aria-hidden className="h-4 w-4" /> New
          </button>
          <button type="button" onClick={removeDocument} aria-label="Delete document" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {/* Mobile: tabs */}
      <div role="tablist" aria-label="Workspace panels" className="flex border-b border-line lg:hidden">
        {(Object.keys(titles) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => {
              setTab(t);
              if (t === "evidence") setUnseen(false);
            }}
            className={cn("relative flex-1 py-3 text-sm", tab === t ? "font-medium text-ink" : "text-ink-3")}
          >
            {titles[t]}
            {t === "evidence" && unseen && tab !== "evidence" && <span aria-label="new" className="absolute right-4 top-3 h-1.5 w-1.5 rounded-full bg-mint" />}
            {tab === t && <span aria-hidden className="absolute inset-x-6 bottom-0 h-0.5 bg-ink" />}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)_minmax(0,1fr)] lg:divide-x lg:divide-line">
        {(["agreement", "voice", "evidence"] as Tab[]).map((t) => (
          <section
            key={t}
            id={`panel-${t}`}
            role="tabpanel"
            aria-label={titles[t]}
            className={cn("min-h-0 flex-col bg-bg", tab === t ? "flex" : "hidden", "lg:flex")}
          >
            <h2 className="label-mono hidden shrink-0 border-b border-line px-5 py-3 lg:block">{titles[t]}</h2>
            <div className="min-h-0 flex-1">{panels[t]}</div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children, toolbar }: { children: React.ReactNode; toolbar?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="Clai home">
          <LogoMark className="h-6 w-6" title="" />
          <span className="font-semibold tracking-[-0.04em]">clai</span>
          <span className="label-mono hidden sm:inline">/ talk</span>
        </Link>
        {toolbar}
      </header>
      <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      <p className="shrink-0 border-t border-line px-4 py-1.5 text-center text-[11px] text-ink-3">
        Clai explains what your agreement says. It is not legal advice.
      </p>
    </div>
  );
}
