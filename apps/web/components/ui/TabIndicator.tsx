"use client";

import styled from "styled-components";
import { m } from "motion/react";
import { nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";

const Fill = styled(m.span)<{ $tone: "pill" | "underline" }>`
  position: absolute;
  z-index: 0;
  pointer-events: none;
  ${({ $tone }) =>
    $tone === "pill"
      ? `inset: 0; border-radius: 999px; background: ${nocturne.green};`
      : `left: 12px; right: 12px; bottom: 0; height: 3px; border-radius: 3px; background: ${nocturne.accent};`}
`;

export function TabIndicator({ group, tone = "pill" }: { group: string; tone?: "pill" | "underline" }) {
  return <Fill layoutId={`tab-indicator-${group}`} $tone={tone} transition={spring.morph} aria-hidden="true" />;
}
