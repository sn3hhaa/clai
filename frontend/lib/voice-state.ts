import type { AuraState } from "@/components/voice/aura";

export type CallPhase = "idle" | "requesting" | "live" | "ending" | "ended" | "error";

export interface VoiceSignals {
  phase: CallPhase;
  /** livekit-client ConnectionState value: "disconnected" | "connecting" | "connected" | "reconnecting" | … */
  connection?: string;
  /** components-react AgentState: "connecting" | "initializing" | "listening" | "thinking" | "speaking" | "failed" | … */
  agent?: string;
  micEnabled?: boolean;
}

/** Map real session signals to the Aura's visual state. Pure, so it can be unit-tested. */
export function auraStateFor({ phase, connection, agent, micEnabled = true }: VoiceSignals): AuraState {
  if (phase === "error" || agent === "failed") return "error";
  if (phase === "ended") return "ended";
  if (phase === "ending") return "ending";
  if (phase === "idle") return "idle";
  if (phase === "requesting" || connection !== "connected") return "connecting";
  if (agent === "thinking") return "thinking";
  if (agent === "speaking") return "speaking";
  if (agent === "listening" || agent === "idle") return micEnabled ? "listening" : "muted";
  return "connecting"; // agent not joined yet: initializing / pre-connect-buffering
}

export const AURA_LABELS: Record<AuraState, string> = {
  idle: "Ready when you are",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Looking through the agreement",
  speaking: "Speaking",
  muted: "Microphone muted",
  ending: "Ending call…",
  ended: "Call ended",
  error: "Something went wrong",
};
