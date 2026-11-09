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
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Aura } from "@/components/voice/aura";
import { api, ApiError } from "@/lib/api/client";
import type { AnswerOut, VoiceTokenResponse } from "@/lib/api/types";
import { AURA_LABELS, auraStateFor } from "@/lib/voice-state";
import { cn } from "@/lib/utils";

/**
 * Real-time voice through a Clai server: LiveKit WebRTC with the agent worker (VAD, Whisper,
 * turn detection, barge-in, Piper). Aura state and motion come from the live session.
 */
export function ServerVoiceDock({
  documentId,
  conversationId,
  onConversation,
  onAnswer,
  onEnd,
}: {
  documentId: string;
  conversationId: string | null;
  onConversation: (id: string) => void;
  onAnswer: (a: AnswerOut) => void;
  onEnd: () => void;
}) {
  const [token, setToken] = React.useState<VoiceTokenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const ended = React.useRef(false);

  React.useEffect(() => {
    let live = true;
    api
      .voiceToken(documentId, conversationId)
      .then((t) => {
        if (!live) return;
        onConversation(t.conversation_id);
        setToken(t);
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "Couldn't start voice."));
    return () => {
      live = false;
    };
    // Token once per dock mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hanging up mid-reply cuts the transcript stream; livekit-client rejects it. Expected, not a fault.
  React.useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | undefined;
      if (reason?.name === "DataStreamError" && /disconnected/i.test(reason.message ?? "")) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    onEnd();
  };

  if (error) {
    return (
      <p role="alert" className="border-b border-line py-6 text-center text-danger">
        {error}
      </p>
    );
  }
  if (!token) {
    return (
      <div className="flex flex-col items-center border-b border-line pb-6 pt-2">
        <div className="w-full max-w-[220px]">
          <Aura state="connecting" />
        </div>
        <p className="font-mono text-[0.78rem] text-ink-2">{AURA_LABELS.connecting}</p>
      </div>
    );
  }
  return (
    <LiveKitRoom
      serverUrl={token.server_url}
      token={token.participant_token}
      connect
      audio
      video={false}
      onMediaDeviceFailure={(f) =>
        setError(
          f === MediaDeviceFailure.PermissionDenied
            ? "Microphone access was blocked. Allow it in your browser's site settings."
            : "Your microphone couldn't be started.",
        )
      }
      onDisconnected={finish}
    >
      <Stage onAnswer={onAnswer} onHangUp={finish} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Stage({ onAnswer, onHangUp }: { onAnswer: (a: AnswerOut) => void; onHangUp: () => void }) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const { state: agentState, audioTrack, agent } = useVoiceAssistant();
  const { localParticipant, microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const agentVolume = useTrackVolume(audioTrack);
  const micVolume = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);
  const { textStreams } = useTextStream("clai.answer");
  const transcriptions = useTranscriptions();
  const seen = React.useRef(new Set<string>());
  const aura = auraStateFor({ phase: "live", connection, agent: agentState, micEnabled: isMicrophoneEnabled });

  const levels = React.useRef({ agent: 0, mic: 0 });
  React.useLayoutEffect(() => {
    levels.current = { agent: agentVolume, mic: micVolume };
  }, [agentVolume, micVolume]);
  const getLevel = React.useCallback(
    () => Math.min(1, (aura === "speaking" ? levels.current.agent : aura === "listening" ? levels.current.mic : 0) * 2.5),
    [aura],
  );

  React.useEffect(() => {
    for (const s of textStreams) {
      if (seen.current.has(s.streamInfo.id)) continue;
      try {
        const parsed = JSON.parse(s.text) as AnswerOut & { error?: string };
        seen.current.add(s.streamInfo.id);
        if (!parsed.error) onAnswer(parsed);
      } catch {
        /* still streaming */
      }
    }
  }, [textStreams, onAnswer]);

  const lastUser = [...transcriptions].reverse().find((t) => t.participantInfo.identity !== agent?.identity);
  return (
    <div className="flex flex-col items-center border-b border-line pb-6 pt-2">
      <div className="w-full max-w-[220px]">
        <Aura state={aura} getLevel={getLevel} />
      </div>
      <p className="mt-1 font-mono text-[0.78rem] text-ink-2" aria-live="polite">
        {connection === "reconnecting" ? "Reconnecting…" : !agent && connection === "connected" ? "Waiting for Clai to join…" : AURA_LABELS[aura]}
      </p>
      <p className="mt-2 min-h-[1.6em] max-w-md text-center text-ink" aria-live="polite">
        {lastUser?.text ?? ""}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          aria-pressed={!isMicrophoneEnabled}
          aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          className={cn("grid h-10 w-10 place-items-center border", isMicrophoneEnabled ? "border-line-strong text-ink hover:border-ink" : "border-ink bg-ink text-bg")}
        >
          {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            onHangUp();
            void room.disconnect();
          }}
          className="inline-flex h-10 items-center gap-2 bg-danger px-4 text-[0.88rem] font-medium text-bg hover:opacity-90"
        >
          <PhoneOff aria-hidden className="h-4 w-4" /> End call
        </button>
      </div>
      <p className="mt-3 text-[0.75rem] text-ink-3">Real-time voice through your Clai server. Speak over Clai to interrupt.</p>
    </div>
  );
}
