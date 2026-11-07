"use client";

import * as React from "react";

/**
 * Fades children up as they enter the viewport (GSAP ScrollTrigger). Elements marked
 * `data-reveal` inside the wrapper stagger in. Does nothing when reduced motion is preferred.
 */
export function Reveal({ children, className, stagger = 0.08 }: { children: React.ReactNode; className?: string; stagger?: number }) {
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
        const targets = el.querySelectorAll("[data-reveal]");
        gsap.from(targets.length ? targets : el, {
          y: 18,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
