// Mirrors backend/app/schemas (Pydantic). Keep in sync with GET /openapi.json.

export type DocumentStatus = "processing" | "ready" | "failed";
export type Grounding = "grounded" | "partially_grounded" | "insufficient";
export type Channel = "text" | "voice";

export interface OutlineItem {
  label: string;
  clause: string | null;
  page_number: number;
  level: number;
}

export interface DocumentOut {
  id: string;
  filename: string;
  status: DocumentStatus;
  error: string | null;
  size_bytes: number;
  page_count: number;
  chunk_count: number;
  created_at: string;
  outline: OutlineItem[];
}

export interface Evidence {
  chunk_id: string;
  page_number: number;
  page_end: number;
  section: string | null;
  clause: string | null;
  heading: string | null;
  text: string;
  score: number;
  cited: boolean;
}

export interface Claim {
  text: string;
  chunk_ids: string[];
  supported: boolean;
  support_score: number;
}

export interface AnswerOut {
  conversation_id: string;
  message_id: string;
  question: string;
  resolved_question: string;
  intent: string;
  answer: string;
  spoken_answer: string;
  key_points: string[];
  citations: string[];
  evidence: Evidence[];
  claims: Claim[];
  grounding: Grounding;
  sufficient: boolean;
  generation: "llm" | "extractive";
  retrieval_rounds: number;
  timings_ms: Record<string, number>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: string[];
  grounding: Grounding | null;
}

export interface SourceRef {
  chunk_id: string;
  page_number: number;
  section: string | null;
  clause: string | null;
}

export interface SessionSummary {
  conversation_id: string;
  document_id: string;
  channel: Channel;
  started_at: string;
  ended_at: string | null;
  questions: string[];
  key_points: string[];
  sources: SourceRef[];
  unresolved: string[];
  transcript: Message[];
}

export interface VoiceTokenResponse {
  server_url: string;
  participant_token: string;
  room_name: string;
  conversation_id: string;
  expires_in: number;
}

export interface HealthOut {
  status: "ok";
  version: string;
  llm: "configured" | "not_configured";
  llm_model: string | null;
  qdrant_mode: string;
  stt_provider: string;
  tts_provider: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
