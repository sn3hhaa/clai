"use client";

import { Mic, MicOff, PhoneOff, Square, Volume2, VolumeX } from "lucide-react";
import { Aura } from "@/components/voice/aura";
import type { BrowserVoice } from "@/lib/voice/browser-voice";
import { AURA_LABELS } from "@/lib/voice-state";
import { cn } from "@/lib/utils";

/** Voice controls for the browser engine (Web Speech API). */
export function BrowserVoiceDock({ voice }: { voice: BrowserVoice }) {
  const muted = voice.state === "muted";
  return (
    <div className="flex flex-col items-center border-b border-line pb-6 pt-2">
      <div className="w-full max-w-[220px]">
        <Aura state={voice.state} getLevel={voice.getLevel} />
      </div>
      <p className="mt-1 font-mono text-[0.78rem] text-ink-2" aria-live="polite">
        {AURA_LABELS[voice.state]}
      </p>
      <p className="mt-2 min-h-[1.6em] max-w-md text-center text-ink" aria-live="polite">
        {voice.interim}
      </p>
      {voice.error && (
        <p role="alert" className="mt-2 max-w-md text-center text-[0.9rem] text-danger">
          {voice.error}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {voice.state === "speaking" && (
          <button type="button" onClick={voice.interrupt} className="inline-flex h-10 items-center gap-2 border border-line-strong px-3.5 text-[0.88rem] text-ink hover:border-ink">
            <Square aria-hidden className="h-3.5 w-3.5" /> Interrupt
          </button>
        )}
        <button
          type="button"
          onClick={muted ? voice.unmute : voice.mute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          className={cn("grid h-10 w-10 place-items-center border", muted ? "border-ink bg-ink text-bg" : "border-line-strong text-ink hover:border-ink")}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => voice.setSpeakAnswers(!voice.speakAnswers)}
          aria-pressed={voice.speakAnswers}
          aria-label={voice.speakAnswers ? "Stop reading answers aloud" : "Read answers aloud"}
          className="grid h-10 w-10 place-items-center border border-line-strong text-ink hover:border-ink"
        >
          {voice.speakAnswers ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button type="button" onClick={voice.stop} className="inline-flex h-10 items-center gap-2 bg-danger px-4 text-[0.88rem] font-medium text-bg hover:opacity-90">
          <PhoneOff aria-hidden className="h-4 w-4" /> End voice
        </button>
      </div>
      <p className="mt-3 max-w-sm text-center text-[0.75rem] text-ink-3">
        Your browser turns speech into text; Clai never hears audio. The mic pauses while answers are read aloud.
      </p>
    </div>
  );
}
