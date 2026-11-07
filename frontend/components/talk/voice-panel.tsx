"use client";

import * as React from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTextStream,
  useTrackVolume,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { MediaDeviceFailure, type LocalAudioTrack } from "livekit-client";
import { Loader2, Mic, MicOff, PhoneOff, Send } from "lucide-react";
import { Aura, type AuraState } from "@/components/voice/aura";
import { api, ApiError } from "@/lib/api/client";
import type { AnswerOut, SessionSummary, VoiceTokenResponse } from "@/lib/api/types";
import { AURA_LABELS, auraStateFor, type CallPhase } from "@/lib/voice-state";
import { cn } from "@/lib/utils";

interface VoicePanelProps {
  documentId: string;
  conversationId: string | null;
  onConversation: (id: string) => void;
  onAnswer: (answer: AnswerOut) => void;
  onSummary: (summary: SessionSummary) => void;
}

export function VoicePanel({ documentId, conversationId, onConversation, onAnswer, onSummary }: VoicePanelProps) {
  const [phase, setPhase] = React.useState<CallPhase>("idle");
  const [token, setToken] = React.useState<VoiceTokenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const finishing = React.useRef(false); // "End call" and onDisconnected can both fire

  // Hanging up while Clai is mid-sentence cuts its transcript stream, and livekit-client rejects
  // that stream's promise ("Room disconnected in the middle of receiving data"). That's the
  // expected result of hanging up, not a fault, so it's handled here instead of surfacing as an
  // uncaught error. Any other rejection is left alone.
  React.useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | undefined;
      if (reason?.name === "DataStreamError" && /disconnected/i.test(reason.message ?? "")) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  async function start() {
    finishing.current = false;
    setError(null);
    setPhase("requesting");
    try {
      const next = await api.voiceToken(documentId, conversationId);
      onConversation(next.conversation_id);
      setToken(next);
      setPhase("live");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start the call.");
      setPhase("error");
    }
  }

  const finish = React.useCallback(
    async (id: string) => {
      if (finishing.current) return;
      finishing.current = true;
      setPhase("ending");
      setToken(null);
      try {
        onSummary(await api.endConversation(id));
        setPhase("ended");
      } catch {
        setPhase("ended");
      }
    },
    [onSummary],
  );

  const auraIdle: AuraState = phase === "error" ? "error" : phase === "ended" ? "ended" : phase === "ending" ? "ending" : phase === "requesting" ? "connecting" : "idle";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {token && phase === "live" ? (
        <LiveKitRoom
          serverUrl={token.server_url}
          token={token.participant_token}
          connect
          audio
          video={false}
          className="flex min-h-0 flex-1 flex-col"
          onMediaDeviceFailure={(failure) => {
            setError(
              failure === MediaDeviceFailure.PermissionDenied
                ? "Microphone access was blocked. Allow it in your browser's site settings and start the call again."
                : failure === MediaDeviceFailure.NotFound
                  ? "No microphone was found. Connect one and try again."
                  : "Your microphone couldn't be started.",
            );
          }}
          onError={(e) => setError(`Voice connection error: ${e.message}`)}
          onDisconnected={() => void finish(token.conversation_id)}
        >
          <LiveStage onAnswer={onAnswer} onEnd={() => finish(token.conversation_id)} error={error} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-[300px]">
            <Aura state={auraIdle} />
          </div>
          <p className="mt-2 font-mono text-xs text-ink-2" aria-live="polite">{AURA_LABELS[auraIdle]}</p>
          {error && (
            <p role="alert" className="mt-4 max-w-sm rounded-lg border border-danger/20 bg-danger-soft px-4 py-2.5 text-center text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={phase === "requesting" || phase === "ending"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-bg transition-colors hover:bg-ink/85 disabled:opacity-60"
          >
            {phase === "requesting" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Mic aria-hidden className="h-4 w-4" />}
            {phase === "ended" ? "Start a new call" : "Start call"}
          </button>
          <p className="mt-3 max-w-xs text-center text-xs text-ink-3">Your browser will ask for microphone access.</p>
        </div>
      )}

      <TextAsk documentId={documentId} conversationId={conversationId} onConversation={onConversation} onAnswer={onAnswer} />
    </div>
  );
}

function LiveStage({ onAnswer, onEnd, error }: { onAnswer: (a: AnswerOut) => void; onEnd: () => void; error: string | null }) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const { state: agentState, audioTrack, agent } = useVoiceAssistant();
  const { localParticipant, microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const agentVolume = useTrackVolume(audioTrack);
  const micVolume = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);
  const { textStreams } = useTextStream("clai.answer");
  const transcriptions = useTranscriptions();
  const seen = React.useRef(new Set<string>());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const aura = auraStateFor({ phase: error ? "error" : "live", connection, agent: agentState, micEnabled: isMicrophoneEnabled });

  // Volumes are read every animation frame through refs (no re-render per frame).
  const levels = React.useRef({ agent: 0, mic: 0 });
  React.useLayoutEffect(() => {
    levels.current = { agent: agentVolume, mic: micVolume };
  }, [agentVolume, micVolume]);
  const getLevel = React.useCallback(() => {
    const v = aura === "speaking" ? levels.current.agent : aura === "listening" ? levels.current.mic : 0;
    return Math.min(1, v * 2.5);
  }, [aura]);

  React.useEffect(() => {
    for (const stream of textStreams) {
      const id = stream.streamInfo.id;
      if (seen.current.has(id)) continue;
      try {
        const parsed = JSON.parse(stream.text) as AnswerOut & { error?: string };
        seen.current.add(id);
        if (!parsed.error) onAnswer(parsed);
      } catch {
        /* stream still arriving */
      }
    }
  }, [textStreams, onAnswer]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcriptions.length]);

  const reconnecting = connection === "reconnecting";
  return (
    <>
      <div className="flex shrink-0 flex-col items-center px-6 pt-6">
        <div className="w-full max-w-[280px]">
          <Aura state={aura} getLevel={getLevel} />
        </div>
        <p className="mt-1 font-mono text-xs text-ink-2" aria-live="polite">
          {reconnecting ? "Reconnecting…" : !agent && connection === "connected" ? "Waiting for Clai to join…" : AURA_LABELS[aura]}
        </p>
        {error && (
          <p role="alert" className="mt-3 max-w-sm rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-center text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
            aria-pressed={!isMicrophoneEnabled}
            aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border transition-colors",
              isMicrophoneEnabled ? "border-line-strong text-ink hover:border-ink" : "border-ink bg-ink text-bg",
            )}
          >
            {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              onEnd();
              void room.disconnect();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <PhoneOff aria-hidden className="h-4 w-4" />
            End call
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-4" aria-label="Live transcript" aria-live="polite">
        {transcriptions.length === 0 ? (
          <p className="text-center font-mono text-xs text-ink-3">transcript appears here</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {transcriptions.map((t) => {
              const fromAgent = t.participantInfo.identity === agent?.identity;
              return (
                <li key={t.streamInfo.id} className={cn("flex flex-col", fromAgent ? "items-start" : "items-end")}>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{fromAgent ? "Clai" : "You"}</span>
                  <span className={cn("mt-0.5 max-w-[90%] rounded-2xl px-3 py-2", fromAgent ? "bg-surface-2 text-ink" : "bg-ink text-bg")}>{t.text}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function TextAsk({
  documentId,
  conversationId,
  onConversation,
  onAnswer,
}: {
  documentId: string;
  conversationId: string | null;
  onConversation: (id: string) => void;
  onAnswer: (a: AnswerOut) => void;
}) {
  const [question, setQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await api.ask(documentId, q, conversationId);
      onConversation(answer.conversation_id);
      onAnswer(answer);
      setQuestion("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't get an answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-line p-3">
      {error && <p role="alert" className="mb-2 px-1 text-xs text-danger">{error}</p>}
      <label htmlFor="ask" className="sr-only">Ask a question by text</label>
      <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-1 pl-4 pr-1 focus-within:border-ink">
        <input
          id="ask"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Or type a question…"
          maxLength={1000}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-ink-3"
        />
        <button type="submit" disabled={busy || !question.trim()} aria-label="Ask" className="grid h-9 w-9 place-items-center rounded-full bg-ink text-bg disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
