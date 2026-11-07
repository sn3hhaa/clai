"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Clai's Aura: an original organic visualiser (canvas 2D). It is not LiveKit's Agents UI
 * component. In a live call its state comes from the agent's LiveKit state and its motion
 * from real input/output audio levels (`getLevel`).
 */
export type AuraState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "ending"
  | "ended"
  | "error";

interface Profile {
  amp: number; // base contour amplitude
  levelAmp: number; // extra amplitude per unit of audio level
  speed: number; // phase speed
  swirl: number; // rotation speed of the inner core
  pulse: number; // breathing amplitude
  palette: [string, string, string]; // halo, body, core
}

const SEAFOAM: Profile["palette"] = ["rgba(127,224,196,0.22)", "#a9ead7", "#3fb59a"];
const PROFILES: Record<AuraState, Profile> = {
  idle: { amp: 0.03, levelAmp: 0, speed: 0.25, swirl: 0.05, pulse: 0.02, palette: SEAFOAM },
  connecting: { amp: 0.02, levelAmp: 0, speed: 0.5, swirl: 0.2, pulse: 0.06, palette: SEAFOAM },
  listening: { amp: 0.035, levelAmp: 0.22, speed: 0.6, swirl: 0.1, pulse: 0.015, palette: SEAFOAM },
  thinking: { amp: 0.05, levelAmp: 0, speed: 1.3, swirl: 0.9, pulse: 0.025, palette: ["rgba(127,224,196,0.26)", "#b9eedf", "#2e9e85"] },
  speaking: { amp: 0.045, levelAmp: 0.3, speed: 0.95, swirl: 0.25, pulse: 0.01, palette: ["rgba(127,224,196,0.3)", "#9fe6d1", "#2e9e85"] },
  muted: { amp: 0.015, levelAmp: 0, speed: 0.15, swirl: 0.03, pulse: 0.01, palette: ["rgba(160,170,165,0.18)", "#d5dcd8", "#9aa6a0"] },
  ending: { amp: 0.02, levelAmp: 0, speed: 0.3, swirl: 0.05, pulse: 0.03, palette: SEAFOAM },
  ended: { amp: 0.015, levelAmp: 0, speed: 0.12, swirl: 0.02, pulse: 0.01, palette: ["rgba(160,170,165,0.16)", "#dfe5e2", "#aab5af"] },
  error: { amp: 0.025, levelAmp: 0, speed: 0.4, swirl: 0.05, pulse: 0.03, palette: ["rgba(180,55,47,0.14)", "#f2c9c5", "#b4372f"] },
};

const HARMONICS = [
  { k: 2, w: 1.0, p: 0.0 },
  { k: 3, w: 0.7, p: 1.7 },
  { k: 5, w: 0.45, p: 3.1 },
  { k: 7, w: 0.25, p: 4.4 },
];

function contour(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, amp: number, t: number, seed: number) {
  const n = 120;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    let offset = 0;
    for (const h of HARMONICS) offset += h.w * Math.sin(h.k * a + h.p + seed + t * (0.6 + h.k * 0.13));
    const rr = r * (1 + amp * offset);
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

export interface AuraProps {
  state: AuraState;
  /** Returns the current audio level in [0, 1]; read every frame without re-rendering. */
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
    let amp = PROFILES[stateRef.current].amp;

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
      const profile = PROFILES[stateRef.current];
      const target = Math.max(0, Math.min(1, levelRef.current?.() ?? 0));
      level += (target - level) * (target > level ? 0.35 : 0.08); // fast attack, slow release
      amp += (profile.amp + profile.levelAmp * level - amp) * 0.12;
      if (!reduced) t += dt * profile.speed;

      const { width, height } = canvas.getBoundingClientRect();
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) * 0.3;
      const breathe = reduced ? 0 : profile.pulse * Math.sin(t * 2.2);
      const [halo, body, core] = profile.palette;

      ctx.clearRect(0, 0, width, height);

      const haloGrad = ctx.createRadialGradient(cx, cy, base * 0.4, cx, cy, base * 1.6);
      haloGrad.addColorStop(0, halo);
      haloGrad.addColorStop(1, "rgba(250,250,247,0)");
      ctx.fillStyle = haloGrad;
      contour(ctx, cx, cy, base * (1.38 + breathe + level * 0.12), amp * 1.4, t * 0.8, 0.9);
      ctx.fill();

      const bodyGrad = ctx.createRadialGradient(cx - base * 0.3, cy - base * 0.35, base * 0.1, cx, cy, base * 1.15);
      bodyGrad.addColorStop(0, "#effaf6");
      bodyGrad.addColorStop(1, body);
      ctx.fillStyle = bodyGrad;
      contour(ctx, cx, cy, base * (1 + breathe + level * 0.08), amp, t, 0);
      ctx.fill();

      const swirl = t * profile.swirl * 6;
      const ox = Math.cos(swirl) * base * 0.12;
      const oy = Math.sin(swirl * 0.8) * base * 0.1;
      const coreGrad = ctx.createRadialGradient(cx + ox, cy + oy, base * 0.05, cx + ox, cy + oy, base * 0.7);
      coreGrad.addColorStop(0, core);
      coreGrad.addColorStop(1, "rgba(63,181,154,0)");
      ctx.globalAlpha = 0.55 + level * 0.35;
      ctx.fillStyle = coreGrad;
      contour(ctx, cx + ox, cy + oy, base * (0.62 + level * 0.12), amp * 1.6, t * 1.3, 2.3);
      ctx.fill();
      ctx.globalAlpha = 1;

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label ?? `Clai voice: ${state}`}
      data-state={state}
      className={cn("block aspect-square w-full", className)}
    />
  );
}
