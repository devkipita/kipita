import { keyframes } from "styled-components";

export const nocturne = {
  bg: "var(--n-bg)",
  cream: "var(--n-cream)",
  lime: "var(--n-lime)",
  sage: "var(--n-sage)",
  greenDeep: "var(--n-green-deep)",
  green: "var(--n-green)",
  tan: "var(--n-tan)",
  muted: "var(--n-muted)",
  muted2: "var(--n-muted-2)",
  muted3: "var(--n-muted-3)",
  surface: "var(--n-surface)",
  surface2: "var(--n-surface-2)",
  line: "var(--n-line)",
  line2: "var(--n-line-2)",
  accent: "var(--n-accent)",
  ctaBg: "var(--n-cta-bg)",
  ctaFg: "var(--n-cta-fg)",
  panelShadow: "var(--n-panel-shadow)",
  onGreen: "var(--n-on-green)",
  onGreenMuted: "var(--n-on-green-muted)",
  cardShadow: "var(--n-card-shadow)",
} as const;

export const nocturneDark = {
  "--n-bg": "#0e0e0e",
  "--n-cream": "#faf8f4",
  "--n-lime": "#e5ffc3",
  "--n-sage": "#9ec5a2",
  "--n-green-deep": "#14392a",
  "--n-green": "#2f6c4f",
  "--n-tan": "#d4b896",
  "--n-muted": "#b9bbb6",
  "--n-muted-2": "#8e918b",
  "--n-muted-3": "#7e817c",
  "--n-surface": "#161616",
  "--n-surface-2": "#121412",
  "--n-line": "#2e2e2e",
  "--n-line-2": "#232823",
  "--n-accent": "#9ec5a2",
  "--n-cta-bg": "#e5ffc3",
  "--n-cta-fg": "#14392a",
  "--n-panel-shadow": "0 18px 50px rgba(0, 0, 0, 0.4)",
  "--n-on-green": "#faf8f4",
  "--n-on-green-muted": "rgba(250, 248, 244, 0.7)",
  "--n-card-shadow": "0 7px 24px rgba(0, 0, 0, 0.35)",
} as const;

export const nocturneLight = {
  "--n-bg": "#f8f6ef",
  "--n-cream": "#112b22",
  "--n-lime": "#d8ed85",
  "--n-sage": "#b7d9b7",
  "--n-green-deep": "#0e382b",
  "--n-green": "#174d3b",
  "--n-tan": "#ea7747",
  "--n-muted": "#40564e",
  "--n-muted-2": "#718078",
  "--n-muted-3": "#87948c",
  "--n-surface": "#fffefb",
  "--n-surface-2": "#eaf3e7",
  "--n-line": "#dce4dc",
  "--n-line-2": "#e4ebe3",
  "--n-accent": "#174d3b",
  "--n-cta-bg": "#ea7747",
  "--n-cta-fg": "#ffffff",
  "--n-panel-shadow": "0 26px 70px rgba(5, 34, 24, 0.28)",
  "--n-on-green": "#ffffff",
  "--n-on-green-muted": "rgba(255, 255, 255, 0.72)",
  "--n-card-shadow": "0 7px 24px rgba(23, 77, 59, 0.1)",
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
