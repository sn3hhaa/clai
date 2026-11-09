"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { asset } from "@/lib/utils";

/**
 * The homepage walkthrough: a screen recording of the real browser app working through a
 * fictional agreement. Muted (there's no narration); captions describe each step.
 * Plays inline when visible; reduced-motion visitors get the poster and a play button.
 */
export function ProductFilm() {
  const video = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <figure id="walkthrough" className="scroll-mt-24">
      <div className="relative overflow-hidden border border-line bg-surface">
        <video
          ref={video}
          className="block aspect-[16/10] w-full bg-surface object-cover"
          poster={asset("/media/walkthrough-poster.jpg")}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Walkthrough: adding a fictional agreement to Clai, asking whether it can be ended early, and seeing the answer traced to clause 8.1 on page 2"
        >
          <source src={asset("/media/walkthrough.webm")} type="video/webm" />
          <source src={asset("/media/walkthrough.mp4")} type="video/mp4" />
          <track kind="captions" src={asset("/media/walkthrough.en.vtt")} srcLang="en" label="English" default />
        </video>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
          className="absolute bottom-4 left-4 inline-flex items-center gap-2 bg-bg/85 px-3.5 py-2 text-[0.82rem] text-ink backdrop-blur transition-colors hover:bg-bg"
        >
          {playing ? <Pause aria-hidden className="h-3.5 w-3.5" /> : <Play aria-hidden className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play walkthrough"}
        </button>
      </div>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-[0.8rem] text-ink-3">
        <span>Screen recording of the public version of Clai.</span>
        <span>Product demonstration · fictional agreement · no sound</span>
      </figcaption>
    </figure>
  );
}
