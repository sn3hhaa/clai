"use client";

import * as React from "react";

/**
 * Draws the line that connects an answer to its source clause once the section is in view.
 * GSAP + ScrollTrigger, played once, with no scrubbing or pinning. Skipped under reduced motion.
 */
export function EvidenceLink({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const path = el.querySelector<SVGPathElement>("[data-link-path]");
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 70%", once: true } });
        tl.from("[data-q]", { opacity: 0, y: 12, duration: 0.6, ease: "power2.out" })
          .from("[data-a]", { opacity: 0, y: 12, duration: 0.6, ease: "power2.out" }, "-=0.25");
        if (path) {
          const len = path.getTotalLength();
          tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, "-=0.1");
        }
        tl.from("[data-hl]", { backgroundSize: "0% 100%", duration: 0.7, ease: "power2.out" }, "-=0.35");
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  );
}
