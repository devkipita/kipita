"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * Reveals its direct children on scroll — a soft rise + fade with stagger.
 * Wrap a group (e.g. a card grid) or a single element.
 */
export function Reveal({
  children,
  className,
  style,
  y = 28,
  stagger = 0.09,
  delay = 0,
  start = "top 84%",
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  y?: number;
  stagger?: number;
  delay?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = el.children.length ? Array.from(el.children) : [el];
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.8,
        ease: "power3.out",
        stagger,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [y, stagger, delay, start]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
