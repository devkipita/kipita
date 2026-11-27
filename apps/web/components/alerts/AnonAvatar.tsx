"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import {
  ANON_AVATAR_PALETTES,
  ANON_AVATAR_SHAPES,
  anonAvatarFor,
} from "@kipita/shared";
import type { ToneName } from "@/lib/theme";

/**
 * The picture beside a name on a road alert or a reply. It is drawn from the
 * person's id (see `anonAvatarFor`), never from their photo, so it is the same
 * every time and reveals nothing.
 *
 * Colours are the theme's own tone pairs (`theme.tone`), the same pastels the help
 * and landing cards use, so they read on both the light and the dark card. Red is
 * left out on purpose: it would look like an accident alert.
 */
const TONES: ReadonlyArray<ToneName> = ["green", "blue", "peach", "lav", "tan", "lime"];

const BG = "var(--anon-bg)";
const FG = "var(--anon-fg)";

const SHAPES: ReadonlyArray<() => ReactNode> = [
  // sun over the horizon
  () => (
    <>
      <circle cx="12" cy="10.5" r="4" fill={FG} />
      <rect x="5" y="16" width="14" height="2" rx="1" fill={FG} />
    </>
  ),
  // two hills
  () => <path d="M3 18.5 9 9l4.2 6.5L15.6 12l5.4 6.5Z" fill={FG} />,
  // a road going away
  () => (
    <>
      <path d="M10.2 4.5h3.6l5 15H5.2Z" fill={FG} />
      <rect x="11.4" y="7" width="1.2" height="2" fill={BG} />
      <rect x="11.2" y="11" width="1.6" height="2.6" fill={BG} />
      <rect x="11" y="15.5" width="2" height="3" fill={BG} />
    </>
  ),
  // a leaf
  () => (
    <>
      <path d="M6 18c0-7 4.5-11.5 12-12 0 7.5-4.5 12-12 12Z" fill={FG} />
      <path d="M7 17.2 13.2 11" stroke={BG} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  // a drop
  () => <path d="M12 4.5c3.2 3.8 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 1.8-5.2 5-9Z" fill={FG} />,
  // a four point star
  () => <path d="M12 4l2.2 5.8L20 12l-5.8 2.2L12 20l-2.2-5.8L4 12l5.8-2.2Z" fill={FG} />,
];

if (TONES.length !== ANON_AVATAR_PALETTES || SHAPES.length !== ANON_AVATAR_SHAPES) {
  throw new Error("AnonAvatar tones and shapes must match the counts in @kipita/shared");
}

// The colours travel as custom properties, not `color`, so a parent rule such as
// `.author svg { color: ... }` cannot repaint the shape.
const Svg = styled.svg<{ $tone: ToneName }>`
  display: block;
  flex: none;
  border-radius: 50%;
  --anon-bg: ${({ theme, $tone }) => theme.tone[$tone].bg};
  --anon-fg: ${({ theme, $tone }) => theme.tone[$tone].on};
  background: var(--anon-bg);
`;

export function AnonAvatar({ id, size = 24 }: { id?: string | null; size?: number }) {
  const { palette, shape } = anonAvatarFor(id);
  return (
    <Svg
      $tone={TONES[palette]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[shape]()}
    </Svg>
  );
}
