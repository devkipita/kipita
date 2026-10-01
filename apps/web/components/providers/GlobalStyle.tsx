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

    --r-xxs: 6px;
    --r-xs: 8px;
    --r-sm: 10px;
    --r-md: 12px;
    --r-lg: 16px;
    --r-xl: 20px;

    --s-md: 10px;
    --s-lg: 12px;
    --s-xl: 16px;
    --s-xxl: 20px;

    --band-gap: 18px;
    --card-gap: 10px;
  }

  @media (min-width: 560px) {
    :root {
      --r-xxs: 8px;
      --r-xs: 11px;
      --r-sm: 14px;
      --r-md: 22px;
      --r-lg: 30px;
      --r-xl: 36px;

      --s-md: 12px;
      --s-lg: 16px;
      --s-xl: 20px;
      --s-xxl: 24px;

      --band-gap: 30px;
      --card-gap: 14px;
    }
  }

  * {
    box-sizing: border-box;
  }

  :where(img, video, svg, canvas) {
    max-width: 100%;
    height: auto;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.color.outlineVariant} transparent;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.color.outlineVariant};
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.color.onSurfaceVariant};
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  html {
    overflow-x: clip;
    scroll-behavior: smooth;
    scroll-padding-top: var(--sticky-top, 0px);
    -webkit-text-size-adjust: 100%;
  }

  @media (max-width: 600px) {
    input:not([type="checkbox"]):not([type="radio"]),
    select,
    textarea {
      font-size: max(16px, 1em) !important;
    }
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

  /*
   * Headings speak in the display face, body copy in the text face. Set once
   * here rather than per component, so a heading anywhere in the app is already
   * right and nothing has to remember. :where() keeps specificity at zero, so
   * any component can still override it.
   */
  :where(h1, h2, h3, h4, h5, h6) {
    font-family: ${({ theme }) => theme.fontHeading};
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-wrap: balance;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
    border-radius: 6px;
  }

  :where(a, button):focus:not(:focus-visible) {
    outline: none;
  }

  @media (forced-colors: active) {
    [data-active="true"] {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
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
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
