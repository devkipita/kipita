"use client";

import styled from "styled-components";
import { m } from "motion/react";
import { nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";

type Tone = "pill" | "chip" | "underline";

const Fill = styled(m.span)<{ $tone: Tone }>`
  position: absolute;
  z-index: 0;
  pointer-events: none;
  ${({ $tone }) =>
    $tone === "underline"
      ? `left: 12px; right: 12px; bottom: 0; height: 3px; border-radius: 3px; background: ${nocturne.accent};`
      : `inset: 0; border-radius: ${$tone === "chip" ? "12px" : "999px"}; background: ${nocturne.green};`}
`;

export function TabIndicator({ group, tone = "pill" }: { group: string; tone?: Tone }) {
  return <Fill layoutId={`tab-indicator-${group}`} $tone={tone} transition={spring.morph} aria-hidden="true" />;
}
