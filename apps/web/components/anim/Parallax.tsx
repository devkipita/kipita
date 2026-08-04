"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

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

    return () => ctx.revert();
  }, [amount]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
