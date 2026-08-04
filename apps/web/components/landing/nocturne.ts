import { keyframes } from "styled-components";

/**
 * The landing page is a bespoke, always-dark "nocturne" design — intentionally
 * independent of the app's light/dark theme. These are its local design tokens,
 * shared across the landing's co-located styled components.
 */
export const nocturne = {
  bg: "#0e0e0e",
  cream: "#faf8f4",
  lime: "#c7ee55",
  sage: "#9ec5a2",
  greenDeep: "#14392a",
  green: "#2f6c4f",
  tan: "#d4b896",
  muted: "#b9bbb6",
  muted2: "#8e918b",
  muted3: "#7e817c",
  surface: "#161616",
  surface2: "#121412",
  line: "#2e2e2e",
  line2: "#232823",
} as const;

export const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.35); }
`;

export const dash = keyframes`
  to { stroke-dashoffset: -40; }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
`;
