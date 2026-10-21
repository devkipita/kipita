"use client";

import { useTheme } from "styled-components";
import { ThinkingOrb, type OrbSize } from "thinking-orbs";

type Job = "fetching" | "committing";

const JOB_STATE = {
  fetching: "searching",
  committing: "solving",
} as const;

const INK = {
  onGreen: "#e5ffc3",
  onSurfaceLight: "#174d3b",
  onSurfaceDark: "#9ec5a2",
};

export function ButtonOrb({
  job = "committing",
  size = 32,
  on = "green",
}: {
  job?: Job;
  size?: OrbSize;
  on?: "green" | "surface";
}) {
  const theme = useTheme();
  const dark = theme?.mode === "dark";

  return (
    <ThinkingOrb
      state={JOB_STATE[job]}
      size={size}
      theme={on === "green" ? "dark" : dark ? "dark" : "light"}
      color={
        on === "green" ? INK.onGreen : dark ? INK.onSurfaceDark : INK.onSurfaceLight
      }
      style={{ flex: "none" }}
      aria-hidden
    />
  );
}
