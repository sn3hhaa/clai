"use client";

// Browser voice for the public version: Web Speech API recognition + speech synthesis.
//
// Honest notes (also on /docs/voice-experience):
// - Recognition exists in Chromium browsers and Safari, not in Firefox. Chrome sends audio to
//   Google's speech service; Safari uses Apple's. Clai itself receives only the text.
// - The Aura's listening motion is the real microphone level (Web Audio analyser). Its speaking
//   motion follows the synthesiser's real word-boundary events; browsers don't expose the
//   synthesised audio itself.
// - No automatic barge-in: the microphone pauses while Clai speaks (otherwise it would hear
//   itself). Tap "Interrupt" to stop the answer and speak.

import * as React from "react";
import type { AuraState } from "@/components/voice/aura";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function browserVoiceSupport() {
  return {
    recognition: !!recognitionCtor(),
    synthesis: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings, or type your question.",
  "service-not-allowed": "This browser won't run speech recognition here. You can type your question instead.",
  "audio-capture": "No microphone was found. Connect one, or type your question.",
  network: "Speech recognition needs an internet connection in this browser. You can type instead.",
  "language-not-supported": "Speech recognition doesn't support English in this browser.",
};

export interface BrowserVoice {
  state: AuraState;
  interim: string;
  error: string | null;
  active: boolean;
  speakAnswers: boolean;
  setSpeakAnswers(on: boolean): void;
  start(): Promise<void>;
  stop(): void;
  mute(): void;
  unmute(): void;
  interrupt(): void;
  getLevel(): number;
}

/** `onQuestion` must resolve with the text to speak (or null to just keep listening). */
export function useBrowserVoice(onQuestion: (text: string) => Promise<string | null>): BrowserVoice {
  const [state, setState] = React.useState<AuraState>("idle");
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [speakAnswers, setSpeakAnswers] = React.useState(true);
  const recRef = React.useRef<Recognition | null>(null);
  const wantListening = React.useRef(false);
  const levelRef = React.useRef(0);
  const audio = React.useRef<{ ctx: AudioContext; stream: MediaStream; analyser: AnalyserNode; buf: Uint8Array<ArrayBuffer> } | null>(null);
  const onQuestionRef = React.useRef(onQuestion);
  const speakRef = React.useRef(speakAnswers);
  React.useLayoutEffect(() => {
    onQuestionRef.current = onQuestion;
    speakRef.current = speakAnswers;
  }, [onQuestion, speakAnswers]);

  const listen = React.useCallback(() => {
    const rec = recRef.current;
    if (!rec || !wantListening.current) return;
    try {
      rec.start();
      setState("listening");
    } catch {
      /* already started */
    }
  }, []);

  const speak = React.useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!speakRef.current || !("speechSynthesis" in window)) return resolve();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 1.02;
        u.onstart = () => setState("speaking");
        // Each word boundary is a real event from the synthesiser; pulse the level on it.
        u.onboundary = () => {
          levelRef.current = 0.85;
        };
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const start = React.useCallback(async () => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't available in this browser. Chrome, Edge and Safari support it; you can always type.");
      setState("error");
      return;
    }
    setError(null);
    setState("connecting");
    // Microphone level for the Aura. Recognition opens its own stream; this one is only measured.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audio.current = { ctx, stream, analyser, buf: new Uint8Array(new ArrayBuffer(analyser.fftSize)) };
    } catch {
      setError(ERRORS["not-allowed"]);
      setState("error");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        final ||= e.results[i].isFinal;
      }
      setInterim(text);
      if (final && text.trim()) {
        setState("thinking");
        rec.abort();
        void onQuestionRef.current(text.trim()).then(async (reply) => {
          setInterim("");
          if (reply) await speak(reply);
          listen();
        });
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(ERRORS[e.error] ?? `Speech recognition stopped (${e.error}). You can type instead.`);
      wantListening.current = false;
      setState("error");
    };
    rec.onend = () => {
      // Restart after silence while the user is in voice mode and Clai isn't answering.
      setState((s) => {
        if (wantListening.current && s === "listening") setTimeout(listen, 150);
        return s;
      });
    };
    recRef.current = rec;
    wantListening.current = true;
    listen();
  }, [listen, speak]);

  const releaseAudio = () => {
    audio.current?.stream.getTracks().forEach((t) => t.stop());
    void audio.current?.ctx.close();
    audio.current = null;
  };

  const stop = React.useCallback(() => {
    wantListening.current = false;
    recRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    releaseAudio();
    setInterim("");
    setState("ended");
  }, []);

  const mute = React.useCallback(() => {
    wantListening.current = false;
    recRef.current?.abort();
    setState("muted");
  }, []);

  const unmute = React.useCallback(() => {
    wantListening.current = true;
    listen();
  }, [listen]);

  const interrupt = React.useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    wantListening.current = true;
    listen();
  }, [listen]);

  React.useEffect(
    () => () => {
      wantListening.current = false;
      recRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      releaseAudio();
    },
    [],
  );

  const getLevel = React.useCallback(() => {
    if (state === "speaking") {
      levelRef.current *= 0.9; // decays between word boundaries
      return levelRef.current;
    }
    const a = audio.current;
    if (!a || state !== "listening") return 0;
    a.analyser.getByteTimeDomainData(a.buf);
    let sum = 0;
    for (const v of a.buf) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / a.buf.length) * 4);
  }, [state]);

  return {
    state,
    interim,
    error,
    active: state !== "idle" && state !== "ended" && state !== "error",
    speakAnswers,
    setSpeakAnswers,
    start,
    stop,
    mute,
    unmute,
    interrupt,
    getLevel,
  };
}
