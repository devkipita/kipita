"use client";

import styled from "styled-components";
import { dur, ease, nocturne, pulse } from "@/lib/nocturne";

const Dot = styled.span<{ $ring: string }>`
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 1;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${nocturne.signal};
  box-shadow: 0 0 0 2px ${({ $ring }) => $ring};
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    z-index: -1;
    border-radius: 50%;
    background: color-mix(in oklab, ${nocturne.signal} 55%, transparent);
    animation: ${pulse} calc(${dur.max} * 4) ${ease.standard} infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
      opacity: 0.5;
    }
  }

  @media (forced-colors: active) {
    outline: 1px solid CanvasText;
  }
`;

export function NewDot({ ring, label }: { ring: string; label: string }) {
  return label ? (
    <Dot $ring={ring} role="img" aria-label={label} />
  ) : (
    <Dot $ring={ring} aria-hidden="true" />
  );
}
