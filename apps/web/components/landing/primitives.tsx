import styled from "styled-components";
import { nocturne, pulse } from "./nocturne";

/**
 * Styled primitives shared across the landing sections. Keeping them in one
 * place lets each section file stay focused on its own markup + local styles.
 */

/** Landing root — sets the nocturne dark theme for the whole subtree. */
export const Root = styled.div`
  position: relative;
  min-height: 100vh;
  background: ${nocturne.bg};
  color: ${nocturne.cream};
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  overflow-x: hidden;

  ::selection {
    background: ${nocturne.green};
    color: ${nocturne.cream};
  }

  :focus-visible {
    outline: 2px solid ${nocturne.sage};
    outline-offset: 3px;
  }
`;

export const Eyebrow = styled.span<{ $tone?: "green" | "tan" | "lime" }>`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ $tone }) =>
    $tone === "green"
      ? nocturne.green
      : $tone === "tan"
        ? nocturne.tan
        : $tone === "lime"
          ? nocturne.lime
          : "inherit"};
`;

export const Section = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 160px) clamp(20px, 5vw, 72px);
  background: ${nocturne.bg};
`;

export const Wrap = styled.div`
  max-width: 1360px;
  margin: 0 auto;
`;

export const H2 = styled.h2`
  margin: 0;
  font-weight: 700;
  font-size: clamp(40px, 5.4vw, 88px);
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
`;

export const H3 = styled.h3`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: ${nocturne.cream};
`;

/** Soft breathing dot used by "live" pills. */
export const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${nocturne.sage};
  animation: ${pulse} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
