"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useIsoLayoutEffect } from "../anim/useIsoLayoutEffect";

/**
 * Renders an <h1> and forwards `className` to it, so callers can style it via
 * `styled(TrickleHeading)`. Each word rides up out of its own clipping mask.
 */

type Part = { text: string; className?: string };

export function TrickleHeading({
  parts,
  className,
  speed = 0.075,
}: {
  parts: Part[];
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>(".tk-word");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(words, { yPercent: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 118, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.15,
          ease: "expo.out",
          stagger: speed,
          delay: 0.12,
        },
      );
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return (
    <h1 ref={ref} className={className}>
      {parts.map((part, pi) => (
        <span key={pi} className={part.className}>
          {part.text.split(" ").map((word, wi) => (
            <span
              key={wi}
              className="tk-mask"
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "bottom",
                paddingBottom: "0.06em",
              }}
            >
              <span
                className="tk-word"
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  willChange: "transform, opacity",
                }}
              >
                {word}
                {wi < part.text.split(" ").length - 1 ? " " : null}
              </span>
            </span>
          ))}
          {pi < parts.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}
