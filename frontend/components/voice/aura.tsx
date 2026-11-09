"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Clai Aura: nested organic contours, like the lines of a page, that breathe, gather and
 * ripple. Original canvas implementation (not LiveKit's Agents UI). In /talk its state and
 * level come from the real voice session; anywhere else it's labelled as a demonstration.
 */
export type AuraState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "muted" | "ending" | "ended" | "error";

interface Profile {
  amp: number; // contour deformation
  levelAmp: number; // extra deformation per unit of audio level
  speed: number;
  spin: number; // rotation of the harmonic field
  gather: number; // contours drawn inward (connecting/thinking)
  color: [number, number, number];
  alpha: number;
}

const SAGE: Profile["color"] = [184, 217, 198];
const PROFILES: Record<AuraState, Profile> = {
  idle: { amp: 0.035, levelAmp: 0, speed: 0.18, spin: 0.02, gather: 0, color: SAGE, alpha: 0.75 },
  connecting: { amp: 0.03, levelAmp: 0, speed: 0.45, spin: 0.12, gather: 0.18, color: SAGE, alpha: 0.85 },
  listening: { amp: 0.04, levelAmp: 0.32, speed: 0.55, spin: 0.05, gather: 0, color: SAGE, alpha: 1 },
  thinking: { amp: 0.05, levelAmp: 0, speed: 0.9, spin: 0.35, gather: 0.12, color: SAGE, alpha: 0.95 },
  speaking: { amp: 0.045, levelAmp: 0.4, speed: 0.8, spin: 0.08, gather: 0, color: [209, 232, 217], alpha: 1 },
  muted: { amp: 0.015, levelAmp: 0, speed: 0.1, spin: 0.01, gather: 0.05, color: [122, 130, 124], alpha: 0.55 },
  ending: { amp: 0.02, levelAmp: 0, speed: 0.25, spin: 0.02, gather: 0.25, color: SAGE, alpha: 0.6 },
  ended: { amp: 0.012, levelAmp: 0, speed: 0.08, spin: 0.01, gather: 0.08, color: [122, 130, 124], alpha: 0.45 },
  error: { amp: 0.025, levelAmp: 0, speed: 0.3, spin: 0.02, gather: 0.05, color: [236, 143, 132], alpha: 0.8 },
};

const RINGS = 9;
const HARMONICS = [
  { k: 2, w: 1.0, p: 0.0 },
  { k: 3, w: 0.62, p: 1.9 },
  { k: 5, w: 0.34, p: 3.7 },
];

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const q = window.matchMedia(REDUCED);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED).matches, () => false);
}

export interface AuraProps {
  state: AuraState;
  /** Current audio level in [0, 1], read every frame without re-rendering. */
  getLevel?: () => number;
  className?: string;
  label?: string;
}

export function Aura({ state, getLevel, className, label }: AuraProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef(state);
  const levelRef = React.useRef(getLevel);
  const reduced = usePrefersReducedMotion();
  React.useLayoutEffect(() => {
    stateRef.current = state;
    levelRef.current = getLevel;
  }, [state, getLevel]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    let t = 0;
    let last = performance.now();
    let level = 0;
    const p0 = PROFILES[stateRef.current];
    const cur = { amp: p0.amp, gather: p0.gather, alpha: p0.alpha, color: [...p0.color] as number[] };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = PROFILES[stateRef.current];
      const target = Math.max(0, Math.min(1, levelRef.current?.() ?? 0));
      level += (target - level) * (target > level ? 0.35 : 0.07);
      const ease = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
      cur.amp += (p.amp + p.levelAmp * level - cur.amp) * ease;
      cur.gather += (p.gather - cur.gather) * ease;
      cur.alpha += (p.alpha - cur.alpha) * ease;
      for (let c = 0; c < 3; c++) cur.color[c] += (p.color[c] - cur.color[c]) * ease;
      if (!reduced) t += dt * p.speed;

      const { width, height } = canvas.getBoundingClientRect();
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) * 0.4;
      const [r, g, b] = cur.color.map(Math.round);
      ctx.clearRect(0, 0, width, height);

      // Soft core light (not a glow): very low alpha.
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.85);
      core.addColorStop(0, `rgba(${r},${g},${b},${0.1 + level * 0.12})`);
      core.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < RINGS; i++) {
        const f = i / (RINGS - 1); // 0 inner → 1 outer
        const radius = base * (0.32 + f * 0.68) * (1 - cur.gather * (1 - f * 0.4));
        const phase = t * (0.6 + f * 0.5) + i * 0.38;
        const spin = t * PROFILES[stateRef.current].spin * 4;
        // Outer contours ripple more with the voice.
        const amp = cur.amp * (0.6 + f * 0.9);
        ctx.beginPath();
        const n = 140;
        for (let s = 0; s <= n; s++) {
          const a = (s / n) * Math.PI * 2;
          let off = 0;
          for (const h of HARMONICS) off += h.w * Math.sin(h.k * (a + spin) + h.p + phase);
          const rr = radius * (1 + amp * off);
          const x = cx + rr * Math.cos(a);
          const y = cy + rr * Math.sin(a);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${r},${g},${b},${cur.alpha * (0.95 - f * 0.75)})`;
        ctx.lineWidth = 1 + (1 - f) * 0.9;
        ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} role="img" aria-label={label ?? `Clai voice: ${state}`} data-state={state} className={cn("block aspect-square w-full", className)} />;
}
