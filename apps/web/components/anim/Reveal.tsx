"use client";

import { useRef } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = (
      el.children.length ? Array.from(el.children) : [el]
    ) as HTMLElement[];

    const show = () => {
      for (const t of targets) {
        t.style.opacity = "";
        t.style.transform = "";
      }
    };

    for (const t of targets) {
      t.style.opacity = "0";
      t.style.transform = `translateY(${y}px)`;
    }

    let cancelled = false;
    let revert: (() => void) | null = null;

    const run = async () => {
      try {
        const { gsap } = await import("gsap");
        if (cancelled) return;
        const ctx = gsap.context(() => {
          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger,
            delay,
            clearProps: "opacity,transform",
          });
        }, el);
        revert = () => ctx.revert();
      } catch {
        show();
      }
    };

    const threshold = thresholdFromStart(start);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void run();
      },
      { rootMargin: `0px 0px -${threshold}% 0px` },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (revert) revert();
      else show();
    };
  }, [y, stagger, delay, start]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

function thresholdFromStart(start: string): number {
  const match = /(\d+(?:\.\d+)?)%/.exec(start);
  const pct = match ? Number(match[1]) : 84;
  return Math.max(0, Math.min(90, 100 - pct));
}
