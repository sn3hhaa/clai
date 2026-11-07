import type {
  AnswerOut,
  ApiErrorBody,
  DocumentOut,
  HealthOut,
  SessionSummary,
  VoiceTokenResponse,
} from "./types";

// `||` not `??`: CI passes an empty string when no URL is configured.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      "Can't reach the Clai backend. Start it locally (see the README) and try again.",
      "backend_unreachable",
      0,
    );
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(err?.message ?? `Request failed (${response.status})`, err?.code ?? "http_error", response.status);
  }
  return body as T;
}

const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  health: () => request<HealthOut>("/health"),

  /** Upload with progress (fetch has no upload progress events). */
  uploadDocument(file: File, onProgress?: (fraction: number) => void): Promise<DocumentOut> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/documents`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onerror = () => reject(new ApiError("Can't reach the Clai backend.", "backend_unreachable", 0));
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* non-JSON error page */
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as DocumentOut);
        else {
          const err = (body as ApiErrorBody | null)?.error;
          reject(new ApiError(err?.message ?? `Upload failed (${xhr.status})`, err?.code ?? "http_error", xhr.status));
        }
      };
      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    });
  },

  getDocument: (id: string) => request<DocumentOut>(`/documents/${id}`),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),
  documentFileUrl: (id: string) => `${API_BASE_URL}/documents/${id}/file`,

  ask: (documentId: string, question: string, conversationId?: string | null) =>
    request<AnswerOut>(
      "/query",
      json({ document_id: documentId, question, conversation_id: conversationId ?? null, channel: "text" }),
    ),

  endConversation: (id: string) => request<SessionSummary>(`/conversations/${id}/end`, { method: "POST" }),
  summary: (id: string) => request<SessionSummary>(`/conversations/${id}/summary`),

  voiceToken: (documentId: string, conversationId?: string | null) =>
    request<VoiceTokenResponse>("/voice/token", json({ document_id: documentId, conversation_id: conversationId ?? null })),
};
