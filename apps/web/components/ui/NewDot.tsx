"use client";

import styled from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Dot = styled.span<{ $ring: string }>`
  position: absolute;
  top: -6px;
  left: calc(100% - 10px);
  z-index: 1;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${nocturne.signal};
  box-shadow: 0 0 0 2px ${({ $ring }) => $ring};
  pointer-events: none;
  transition:
    transform ${dur.enter} ${ease.enter},
    opacity ${dur.enter} ${ease.enter};

  @starting-style {
    transform: scale(0.6);
    opacity: 0;
  }

  &::after {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${nocturne.onSignal};
  }

  [aria-expanded="true"] & {
    box-shadow: 0 0 0 2px ${nocturne.greenDeep};
  }

  @media (prefers-reduced-motion: reduce) {
    @starting-style {
      transform: none;
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
