"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

/**
 * Heading with a word-by-word mask reveal (words slide up from behind a clip).
 * Newlines in `text` become line breaks. `immediate` plays on load (hero);
 * otherwise it triggers when scrolled into view.
 */

const rise = keyframes`
  from { transform: translateY(118%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const Heading = styled.h2`
  @media (prefers-reduced-motion: no-preference) {
    &[data-play="pending"] .ah-word {
      opacity: 0;
    }

    &[data-play="run"] .ah-word {
      opacity: 0;
      animation: ${rise} 0.9s cubic-bezier(0.165, 0.84, 0.44, 1) both;
    }
  }
`;

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
  const [play, setPlay] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setPlay(true);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate, text]);

  const lines = text.split("\n");
  let index = 0;

  return (
    <Heading
      as={as}
      ref={ref}
      className={className}
      style={style}
      data-play={play ? "run" : "pending"}
    >
      {lines.map((line, li) => (
        <span className="ah-line" key={li}>
          {line.split(" ").map((word, wi) => {
            const delay = (immediate ? 0.15 : 0) + index * 0.055;
            index += 1;
            return (
              <span className="ah-mask" key={wi}>
                <span
                  className="ah-word"
                  style={{ animationDelay: `${delay.toFixed(3)}s` }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </Heading>
  );
}
