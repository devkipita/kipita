"use client";

import { ThinkingOrb, type OrbSize, type OrbState } from "thinking-orbs";

export function ButtonOrb({
  state = "working",
  size = 20,
  on = "dark",
}: {
  state?: OrbState;
  size?: OrbSize;
  on?: "dark" | "light" | "auto";
}) {
  return (
    <ThinkingOrb
      state={state}
      size={size}
      theme={on}
      style={{ flex: "none" }}
      aria-hidden
    />
  );
}
