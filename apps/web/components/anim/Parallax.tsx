"use client";

import { useRef } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

/** Scrub-driven vertical parallax for a block as it passes through the viewport. */
export function Parallax({
  children,
  className,
  style,
  amount = 60,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let revert: (() => void) | null = null;

    const run = async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            { y: amount },
            {
              y: -amount,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }, el);
        revert = () => ctx.revert();
      } catch {
        /* no parallax; the block simply sits still */
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void run();
      },
      { rootMargin: "300px 0px 300px 0px" },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (revert) revert();
    };
  }, [amount]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
