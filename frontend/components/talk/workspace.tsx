"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, FileText, Loader2, Mic, X } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { api } from "@/lib/api/client";
import type { AnswerOut, Evidence, SessionSummary as Summary } from "@/lib/api/types";
import { describeError, openBrowserSession, openServerSession, validateFile, type EngineKind, type Session } from "@/lib/session";
import { asset, cn } from "@/lib/utils";
import { browserVoiceSupport, useBrowserVoice } from "@/lib/voice/browser-voice";
import { Conversation, type Turn } from "./conversation";
import { ServerVoiceDock } from "./server-voice";
import { SessionSummary } from "./session-summary";
import { SidePanel, type PanelTab } from "./side-panel";
import { BrowserVoiceDock } from "./voice-dock";

let turnSeq = 0;

export function Workspace() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [serverAvailable, setServerAvailable] = React.useState(false);
  const [preferServer, setPreferServer] = React.useState(true);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [panel, setPanel] = React.useState<{ open: boolean; tab: PanelTab }>({ open: false, tab: "document" });
  const [page, setPage] = React.useState(1);
  const [highlight, setHighlight] = React.useState<{ page: number; text: string; chunk: string } | null>(null);
  const [focused, setFocused] = React.useState<AnswerOut | null>(null);
  const [voiceMode, setVoiceMode] = React.useState<"off" | "browser" | "server">("off");
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [question, setQuestion] = React.useState("");
  const [support, setSupport] = React.useState({ recognition: false, synthesis: false });

  React.useEffect(() => {
    setSupport(browserVoiceSupport());
    api
      .health()
      .then(() => setServerAvailable(true))
      .catch(() => setServerAvailable(false));
  }, []);

  const engine: EngineKind = serverAvailable && preferServer ? "server" : "browser";

  const reveal = React.useCallback((answer: AnswerOut, e: Evidence, open = true) => {
    setFocused(answer);
    setPage(e.page_number);
    setHighlight({ page: e.page_number, text: e.text, chunk: e.chunk_id });
    if (open) setPanel({ open: true, tab: "document" });
  }, []);

  const record = React.useCallback(
    (answer: AnswerOut) => {
      setFocused(answer);
      const top = answer.evidence.find((e) => e.cited);
      if (top) reveal(answer, top, false);
    },
    [reveal],
  );

  const ask = React.useCallback(
    async (q: string, via: Turn["via"]): Promise<AnswerOut | null> => {
      if (!session) return null;
      const id = `t${++turnSeq}`;
      setTurns((ts) => [...ts, { id, question: q, via }]);
      try {
        const answer = await session.ask(q);
        setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, answer } : t)));
        record(answer);
        return answer;
      } catch (e) {
        setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, error: describeError(e) } : t)));
        return null;
      }
    },
    [session, record],
  );

  const voice = useBrowserVoice(async (spoken) => {
    const a = await ask(spoken, "voice");
    return a ? a.spoken_answer : "Sorry, something went wrong.";
  });

  async function open(file: File) {
    const problem = validateFile(file);
    if (problem) return setError(problem);
    setError(null);
    setLoading(engine === "server" ? "Uploading to your Clai server…" : "Reading the agreement in your browser…");
    try {
      const s = engine === "server" ? await openServerSession(file) : await openBrowserSession(file);
      setSession(s);
      setTurns([]);
      setSummary(null);
      setPage(1);
      setHighlight(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(null);
    }
  }

  async function useSample() {
    try {
      const blob = await (await fetch(asset("/samples/services_agreement.pdf"))).blob();
      await open(new File([blob], "Sample — Master Services Agreement.pdf", { type: "application/pdf" }));
    } catch {
      setError("Couldn't load the sample agreement.");
    }
  }

  async function finish() {
    if (voice.active) voice.stop();
    setVoiceMode("off");
    if (session && turns.length) {
      try {
        setSummary(await session.end());
      } catch {
        /* nothing asked yet */
      }
    }
  }

  async function closeDocument() {
    if (voice.active) voice.stop();
    setVoiceMode("off");
    await session?.close();
    setSession(null);
    setTurns([]);
    setSummary(null);
    setPanel({ open: false, tab: "document" });
  }

  function startVoice() {
    if (engine === "server") setVoiceMode("server");
    else {
      setVoiceMode("browser");
      void voice.start();
    }
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (!session) {
    return (
      <Shell>
        <Empty onFile={open} onSample={useSample} loading={loading} error={error} engine={engine} serverAvailable={serverAvailable} onEngine={(s) => setPreferServer(s === "server")} />
      </Shell>
    );
  }

  const doc = session.document;
  return (
    <Shell
      doc={
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <FileText aria-hidden className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />
          <p className="min-w-0 truncate text-[0.9rem]" title={doc.filename}>
            {doc.filename}
          </p>
          <span className="hidden shrink-0 font-mono text-[0.72rem] text-ink-3 md:inline">
            {doc.page_count} pp · {doc.chunk_count} passages
          </span>
          <button
            type="button"
            onClick={() => setPanel((p) => ({ open: !p.open || p.tab !== "document", tab: "document" }))}
            aria-expanded={panel.open}
            className="shrink-0 border border-line-strong px-2.5 py-1 text-[0.82rem] text-ink hover:border-ink"
          >
            Document
          </button>
          <button type="button" onClick={closeDocument} aria-label="Close and remove this document" className="grid h-8 w-8 shrink-0 place-items-center text-ink-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className={cn("grid min-h-0 flex-1", panel.open && "lg:grid-cols-[minmax(0,1fr)_minmax(420px,46%)]")}>
        <section aria-label="Conversation" className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[760px] px-5 py-8">
              {voiceMode === "browser" && <BrowserVoiceDock voice={voice} />}
              {voiceMode === "server" && (
                <ServerVoiceDock
                  documentId={doc.id}
                  conversationId={session.conversationId}
                  onConversation={(id) => session.setConversation(id)}
                  onAnswer={(a) => {
                    setTurns((ts) => [...ts, { id: `t${++turnSeq}`, question: a.question, answer: a, via: "voice" }]);
                    record(a);
                  }}
                  onEnd={() => void finish()}
                />
              )}
              {summary ? (
                <SessionSummary summary={summary} onClose={() => setSummary(null)} onNew={closeDocument} />
              ) : turns.length === 0 && voiceMode === "off" ? (
                <Suggestions engine={engine} onAsk={(q) => void ask(q, "text")} />
              ) : (
                <div className="pt-8">
                  <Conversation turns={turns} onCite={reveal} activeChunk={highlight?.chunk ?? null} />
                </div>
              )}
            </div>
          </div>

          {!summary && (
            <form
              className="shrink-0 border-t border-line bg-bg px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                const q = question.trim();
                if (!q) return;
                setQuestion("");
                void ask(q, "text");
              }}
            >
              <div className="mx-auto flex w-full max-w-[760px] items-center gap-2">
                <label htmlFor="ask" className="sr-only">
                  Ask about this agreement
                </label>
                <input
                  id="ask"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about this agreement…"
                  maxLength={1000}
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 border border-line-strong bg-surface px-4 text-ink outline-none placeholder:text-ink-3 focus:border-mint"
                />
                <button type="submit" disabled={!question.trim()} aria-label="Ask" className="grid h-12 w-12 place-items-center bg-ink text-bg transition-opacity disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                {voiceMode === "off" && (engine === "server" || support.recognition) && (
                  <button type="button" onClick={startVoice} aria-label="Start voice" className="grid h-12 w-12 place-items-center border border-line-strong text-ink hover:border-mint hover:text-mint">
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                {turns.length > 0 && voiceMode === "off" && (
                  <button type="button" onClick={() => void finish()} className="hidden h-12 border border-line-strong px-3 text-[0.85rem] text-ink-2 hover:text-ink sm:block">
                    End session
                  </button>
                )}
              </div>
              {voiceMode === "off" && engine === "browser" && !support.recognition && (
                <p className="mx-auto mt-2 max-w-[760px] text-[0.75rem] text-ink-3">Voice input isn&apos;t available in this browser. Typing works everywhere.</p>
              )}
            </form>
          )}
        </section>

        {panel.open && (
          <SidePanel
            open={panel.open}
            tab={panel.tab}
            onTab={(tab) => setPanel({ open: true, tab })}
            onClose={() => setPanel((p) => ({ ...p, open: false }))}
            fileUrl={session.fileUrl}
            pageCount={doc.page_count}
            outline={doc.outline}
            page={page}
            onPage={setPage}
            highlight={highlight}
            answer={focused}
            onShow={(e) => focused && reveal(focused, e)}
          />
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, doc }: { children: React.ReactNode; doc?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-4 md:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Clai home">
          <LogoMark className="h-5 w-5" title="" />
          <span className="font-semibold tracking-[-0.04em]">clai</span>
        </Link>
        {doc}
      </header>
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}

function Empty({
  onFile,
  onSample,
  loading,
  error,
  engine,
  serverAvailable,
  onEngine,
}: {
  onFile: (f: File) => void;
  onSample: () => void;
  loading: string | null;
  error: string | null;
  engine: EngineKind;
  serverAvailable: boolean;
  onEngine: (e: EngineKind) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-5 py-12">
      <p className="eyebrow">Clai</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4.2rem)]">
        Start with a <em>document.</em>
      </h1>
      <p className="mt-5 max-w-[46ch] text-[1.1rem] leading-relaxed text-ink-2">
        Add an agreement to explore its terms, ask questions, and see the clause behind every answer.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-busy={!!loading}
        aria-label="Add a PDF agreement"
        onClick={() => !loading && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !loading && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !loading) onFile(f);
        }}
        className={cn(
          "mt-10 flex cursor-pointer items-center gap-5 border border-dashed px-6 py-8 transition-colors",
          drag ? "border-mint bg-mint-soft" : "border-line-strong hover:border-ink-3",
          loading && "cursor-wait",
        )}
      >
        {loading ? <Loader2 aria-hidden className="h-6 w-6 animate-spin text-mint" /> : <FileText aria-hidden className="h-6 w-6 text-mint" />}
        <div>
          <p className="text-ink">{loading ?? "Drop a PDF here, or choose a file"}</p>
          <p className="mt-1 text-[0.85rem] text-ink-3">Text-based PDFs up to 20 MB. Scanned documents aren&apos;t supported yet.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 border-l-2 border-danger pl-3 text-[0.95rem] text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[0.9rem]">
        <button type="button" onClick={onSample} disabled={!!loading} className="text-ink underline decoration-mint-deep underline-offset-4 hover:decoration-mint disabled:opacity-50">
          Try a fictional sample agreement
        </button>
        {serverAvailable ? (
          <label className="flex items-center gap-2 text-ink-2">
            <span>Engine</span>
            <select value={engine} onChange={(e) => onEngine(e.target.value as EngineKind)} className="border border-line-strong bg-surface px-2 py-1 text-ink">
              <option value="server">Clai server (detected)</option>
              <option value="browser">In this browser</option>
            </select>
          </label>
        ) : (
          <p className="text-ink-3">Read in your browser · nothing is uploaded</p>
        )}
      </div>
    </div>
  );
}

const SUGGESTED = ["What is the notice period to end the agreement?", "How much are the fees, and when are they due?", "Who owns the work produced?", "Is there a cap on liability?"];

function Suggestions({ engine, onAsk }: { engine: EngineKind; onAsk: (q: string) => void }) {
  return (
    <div className="pt-6">
      <p className="eyebrow">Ready</p>
      <h2 className="display mt-3 text-[2.2rem]">What would you like to know?</h2>
      <p className="mt-3 max-w-[52ch] text-ink-2">
        Ask in your own words. Answers quote the agreement and link to the clause.{" "}
        {engine === "browser" ? "Everything happens in this browser tab." : "Answers come from your Clai server."}
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {SUGGESTED.map((q) => (
          <li key={q}>
            <button type="button" onClick={() => onAsk(q)} className="group flex w-full items-center justify-between py-4 text-left text-ink-2 hover:text-ink">
              {q}
              <ArrowUp aria-hidden className="h-4 w-4 rotate-45 text-ink-3 group-hover:text-mint" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
