"use client";

import styled, { css, type DefaultTheme } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export type ChipTone =
  | "neutral"
  | "primary"
  | "secondary"
  | "tertiary"
  | "success"
  | "warning"
  | "info"
  | "error";

type Pair = { bg: string; ink: string };

function capital(tone: Exclude<ChipTone, "neutral">) {
  return (tone[0].toUpperCase() + tone.slice(1)) as Capitalize<typeof tone>;
}

export function chipColors(theme: DefaultTheme, tone: ChipTone, selected: boolean): Pair {
  if (tone === "neutral") {
    return selected
      ? { bg: nocturne.green, ink: nocturne.onGreen }
      : { bg: nocturne.surface2, ink: nocturne.cream };
  }
  const c = theme.color;
  const name = capital(tone);
  return selected
    ? { bg: c[tone], ink: c[`on${name}`] }
    : { bg: c[`${tone}Container`], ink: c[`on${name}Container`] };
}

export const chipShape = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  max-width: 100%;
  padding: 4px 12px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;

  svg {
    flex: none;
  }
`;

export const Chip = styled.button<{ $tone?: ChipTone; $selected?: boolean }>`
  ${chipShape}
  background-color: ${({ theme, $tone = "neutral", $selected = false }) => chipColors(theme, $tone, $selected).bg};
  --icon-knockout: ${({ theme, $tone = "neutral", $selected = false }) => chipColors(theme, $tone, $selected).bg};
  color: ${({ theme, $tone = "neutral", $selected = false }) => chipColors(theme, $tone, $selected).ink};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -8px 0;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      box-shadow: inset 0 0 0 999px color-mix(in oklab, currentColor 8%, transparent);
    }
  }
  &:active:not(:disabled) {
    box-shadow: inset 0 0 0 999px color-mix(in oklab, currentColor 12%, transparent);
    transform: scale(0.97);
  }
  &:disabled {
    color: ${nocturne.muted2};
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

export const IconAction = styled.button<{ $on?: boolean; $tone?: string }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 40px;
  min-height: 40px;
  padding: 0 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  --icon-knockout: ${nocturne.surface};
  color: ${({ $on, $tone }) => ($on && $tone ? $tone : nocturne.muted)};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
  }
  @media (pointer: coarse) {
    min-width: 44px;
    min-height: 44px;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background-color: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
      color: ${({ $on, $tone }) => ($on && $tone ? $tone : nocturne.cream)};
    }
  }
  &:active:not(:disabled) {
    background-color: color-mix(in oklab, ${nocturne.cream} 12%, transparent);
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;
