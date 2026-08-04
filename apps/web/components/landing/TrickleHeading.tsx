"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useIsoLayoutEffect } from "../anim/useIsoLayoutEffect";

/**
 * Renders an <h1> and forwards `className` to it, so callers can style it via
 * `styled(TrickleHeading)`. The animation targets `.tk-char` glyphs inside.
 */

type Part = { text: string; className?: string };

/**
 * Hero headline with a per-character "trickle" reveal — each glyph rises,
 * un-rotates and un-blurs into place. Mirrors the design's `data-trickle`.
 */
export function TrickleHeading({
  parts,
  className,
  speed = 0.032,
}: {
  parts: Part[];
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chars = el.querySelectorAll<HTMLElement>(".tk-char");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(chars, { yPercent: 0, opacity: 1, rotateX: 0, filter: "none" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from(chars, {
        yPercent: 120,
        opacity: 0,
        rotateX: -75,
        filter: "blur(8px)",
        duration: 0.9,
        ease: "power3.out",
        stagger: speed,
        delay: 0.15,
      });
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return (
    <h1 ref={ref} className={className} style={{ perspective: 600 }}>
      {parts.map((part, pi) => (
        <span
          key={pi}
          className={part.className}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {[...part.text].map((ch, ci) => (
            <span
              key={ci}
              className="tk-char"
              style={{ display: "inline-block", willChange: "transform,opacity,filter" }}
            >
              {ch}
            </span>
          ))}
          {pi < parts.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}
