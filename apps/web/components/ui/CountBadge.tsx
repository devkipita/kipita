"use client";

import styled from "styled-components";
import { m } from "motion/react";
import { nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";

const Badge = styled(m.span)<{ $ring: string }>`
  position: absolute;
  top: -11px;
  left: calc(100% - 12px);
  z-index: 1;
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 2px;
  border-radius: 999px;
  background: ${nocturne.signal};
  color: ${nocturne.onSignal};
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  box-shadow: 0 0 0 2px ${({ $ring }) => $ring};

  [aria-expanded="true"] & {
    box-shadow: 0 0 0 2px ${nocturne.greenDeep};
  }

  @media (forced-colors: active) {
    outline: 1px solid CanvasText;
  }
`;

export function CountBadge({
  count,
  ring,
  max = 99,
  leaving = false,
}: {
  count: number;
  ring: string;
  max?: number;
  leaving?: boolean;
}) {
  return (
    <Badge
      key={count}
      $ring={ring}
      aria-hidden="true"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={leaving ? { scale: 0.6, opacity: 0 } : { scale: 1, opacity: 1 }}
      transition={spring.success}
    >
      {count > max ? `${max}+` : count}
    </Badge>
  );
}
