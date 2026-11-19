"use client";

import styled from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const Chip = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 14px;
  border: 0;
  border-radius: 12px;
  background: ${nocturne.surface2};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: color-mix(in oklab, ${nocturne.surface2} 80%, ${nocturne.green});
    }
  }
  &:active:not(:disabled) {
    background: color-mix(in oklab, ${nocturne.surface2} 70%, ${nocturne.green});
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
