"use client";

import { createGlobalStyle } from "styled-components";

/**
 * Document-level resets and base typography. Theme-driven values come from the
 * active styled-components theme; the `@media (prefers-color-scheme)` block is a
 * flash-guard so the page background is already correct for dark users before
 * the JS theme settles on mount.
 */
export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light dark;
  }

  * {
    box-sizing: border-box;
  }

  html {
    overflow-x: hidden;
    scroll-behavior: smooth;
    scroll-padding-top: 90px;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.font};
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.bg};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    line-height: 1.5;
    transition: background 0.3s ease, color 0.3s ease;
  }

  /* Flash-guard: correct page chrome for dark users before hydration. */
  @media (prefers-color-scheme: dark) {
    body {
      background: #111412;
      color: #e1e3df;
    }
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  /* Structural hooks for the GSAP word-mask heading (AnimatedHeading). */
  .ah-line {
    display: block;
  }
  .ah-mask {
    display: inline-flex;
    overflow: hidden;
    vertical-align: top;
    padding-bottom: 0.14em;
    margin-right: 0.26em;
  }
  .ah-word {
    display: inline-block;
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
`;
