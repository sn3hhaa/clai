// One interface over Clai's two engines, so the workspace doesn't care which one runs.
//
//   browser: everything in this tab (pdf.js + BrowserEngine). Nothing is uploaded.
//   server:  a Clai backend (FastAPI + LangGraph + LiveKit voice), when one is reachable.

import { api } from "@/lib/api/client";
import type { AnswerOut, DocumentOut, SessionSummary } from "@/lib/api/types";
import type { BrowserEngine } from "@/lib/engine/engine";
import { DocumentError, MAX_BYTES } from "@/lib/engine/pdf";

export type EngineKind = "browser" | "server";

export interface Session {
  kind: EngineKind;
  document: DocumentOut;
  /** URL the PDF viewer loads: an object URL (browser) or the API file route (server). */
  fileUrl: string;
  conversationId: string | null;
  ask(question: string): Promise<AnswerOut>;
  end(): Promise<SessionSummary>;
  close(): Promise<void>;
  setConversation(id: string): void;
}

export function validateFile(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Clai reads PDF agreements. Please choose a .pdf file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return "That file is larger than the 20 MB limit.";
  return null;
}

export async function openBrowserSession(file: File): Promise<Session> {
  const [{ pdfjs }, { BrowserEngine }] = await Promise.all([import("@/lib/pdfjs"), import("@/lib/engine/engine")]);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const engine: BrowserEngine = await BrowserEngine.fromPdf(pdfjs, bytes, file.name);
  const fileUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  return {
    kind: "browser",
    document: engine.document,
    fileUrl,
    conversationId: engine.conversationId,
    ask: async (q) => engine.ask(q),
    end: async () => engine.end(),
    close: async () => URL.revokeObjectURL(fileUrl),
    setConversation: () => undefined,
  };
}

export async function openServerSession(file: File, onProgress?: (f: number) => void): Promise<Session> {
  const document = await api.uploadDocument(file, onProgress);
  const session: Session = {
    kind: "server",
    document,
    fileUrl: api.documentFileUrl(document.id),
    conversationId: null,
    async ask(q) {
      const answer = await api.ask(document.id, q, session.conversationId);
      session.conversationId = answer.conversation_id;
      return answer;
    },
    async end() {
      if (!session.conversationId) throw new Error("No conversation yet.");
      return api.endConversation(session.conversationId);
    },
    close: async () => {
      await api.deleteDocument(document.id).catch(() => undefined);
    },
    setConversation(id) {
      session.conversationId = id;
    },
  };
  return session;
}

export function describeError(err: unknown): string {
  if (err instanceof DocumentError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong while reading the document.";
}
