"use client";

import { createGlobalStyle } from "styled-components";
import { nocturneDark, nocturneLight, nocturneVars } from "@/lib/nocturne";

export const GlobalStyle = createGlobalStyle`
  :root {
    ${nocturneVars(nocturneLight)}
    --n-selection-fg: #ffffff;
  }

  html[data-theme="dark"] {
    ${nocturneVars(nocturneDark)}
    --n-selection-fg: ${nocturneDark["--n-cream"]};
    color-scheme: dark;
  }

  :root {
    color-scheme: light;

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

  @supports (-webkit-touch-callout: none) {
    input:not([type="checkbox"]):not([type="radio"]),
    select,
    textarea {
      font-size: max(16px, 1em) !important;
    }
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
    font-family: var(--font-dm), ${({ theme }) => theme.font};
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.bg};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    line-height: 1.5;
    transition: background 0.3s ease, color 0.3s ease;
  }

  @media (prefers-color-scheme: dark) {
    html[data-theme="dark"] body {
      background: #111412;
      color: #e1e3df;
    }
  }

  :where(h1, h2, h3, h4, h5, h6) {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
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
