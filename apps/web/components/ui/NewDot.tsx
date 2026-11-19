"use client";

import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

const Dot = styled.span<{ $ring: string }>`
  position: absolute;
  top: -5px;
  right: -6px;
  z-index: 1;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: ${nocturne.signal};
  box-shadow: 0 0 0 2.5px ${({ $ring }) => $ring};
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    inset: 5.5px;
    border-radius: 50%;
    background: ${({ $ring }) => $ring};
  }

  @media (forced-colors: active) {
    outline: 1px solid CanvasText;
  }
`;

export function NewDot({ ring, label }: { ring: string; label: string }) {
  return <Dot $ring={ring} role="img" aria-label={label} />;
}
