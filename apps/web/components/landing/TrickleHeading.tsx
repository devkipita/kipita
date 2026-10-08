"use client";

import styled, { keyframes, css } from "styled-components";

/**
 * Renders an <h1> and forwards `className` to it, so callers can style it via
 * `styled(TrickleHeading)`. Each word rides up out of its own clipping mask.
 */

type Part = { text: string; className?: string };

const rise = keyframes`
  from { transform: translateY(118%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const Heading = styled.h1`
  .tk-mask {
    display: inline-block;
    overflow: hidden;
    vertical-align: bottom;
    padding-bottom: 0.06em;
  }

  .tk-word {
    display: inline-block;
    white-space: pre;
    will-change: transform, opacity;
  }

  ${css`
    @media (prefers-reduced-motion: no-preference) {
      .tk-word {
        opacity: 0;
        animation: ${rise} 1.15s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    }
  `}
`;

export function TrickleHeading({
  parts,
  className,
  speed = 0.075,
}: {
  parts: Part[];
  className?: string;
  speed?: number;
}) {
  let index = 0;

  return (
    <Heading className={className}>
      {parts.map((part, pi) => {
        const words = part.text.split(" ");
        return (
          <span key={pi} className={part.className}>
            {words.map((word, wi) => {
              const delay = 0.12 + index * speed;
              index += 1;
              return (
                <span key={wi} className="tk-mask">
                  <span
                    className="tk-word"
                    style={{ animationDelay: `${delay.toFixed(3)}s` }}
                  >
                    {word}
                    {wi < words.length - 1 ? " " : null}
                  </span>
                </span>
              );
            })}
            {pi < parts.length - 1 ? " " : null}
          </span>
        );
      })}
    </Heading>
  );
}
