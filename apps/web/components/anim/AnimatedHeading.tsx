"use client";

import { createElement, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * Heading with a word-by-word mask reveal (words slide up from behind a clip).
 * Newlines in `text` become line breaks. `immediate` plays on load (hero);
 * otherwise it triggers when scrolled into view.
 */
export function AnimatedHeading({
  text,
  className,
  style,
  as = "h2",
  immediate = false,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2" | "h3";
  immediate?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>(".ah-word");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(words, { yPercent: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from(words, {
        yPercent: 118,
        opacity: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.055,
        ...(immediate
          ? { delay: 0.15 }
          : { scrollTrigger: { trigger: el, start: "top 85%", once: true } }),
      });
    }, el);

    return () => ctx.revert();
  }, [immediate, text]);

  const lines = text.split("\n");
  const content = lines.map((line, li) => (
    <span className="ah-line" key={li}>
      {line.split(" ").map((word, wi) => (
        <span className="ah-mask" key={wi}>
          <span className="ah-word">{word}</span>
        </span>
      ))}
    </span>
  ));

  return createElement(as, { ref, className, style }, content);
}
