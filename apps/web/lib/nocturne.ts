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
  surface3: "var(--n-surface-3)",
  line: "var(--n-line)",
  line2: "var(--n-line-2)",
  accent: "var(--n-accent)",
  ink: "var(--n-ink)",
  inkSoft: "var(--n-ink-soft)",
  inkHover: "var(--n-ink-hover)",
  ctaBg: "var(--n-cta-bg)",
  ctaFg: "var(--n-cta-fg)",
  panelShadow: "var(--n-panel-shadow)",
  onGreen: "var(--n-on-green)",
  onGreenMuted: "var(--n-on-green-muted)",
  cardShadow: "var(--n-card-shadow)",
  cardBorder: "var(--n-card-border)",
  ring: "var(--n-ring)",
  star: "var(--n-star)",
} as const;

export const nocturneDark = {
  "--n-bg": "#0C0F0D",
  "--n-cream": "#faf8f4",
  "--n-lime": "#e5ffc3",
  "--n-sage": "#9ec5a2",
  "--n-green-deep": "#14392a",
  "--n-green": "#2f6c4f",
  "--n-tan": "#d4b896",
  "--n-muted": "#C4C8C4",
  "--n-muted-2": "#A0A6A1",
  "--n-muted-3": "#878D88",
  "--n-surface": "#1D201E",
  "--n-surface-2": "#191C1A",
  "--n-surface-3": "#272B28",
  "--n-line": "#404943",
  "--n-line-2": "#323633",
  "--n-accent": "#9ec5a2",
  "--n-ink": "#9ec5a2",
  "--n-ink-soft": "#C4C8C4",
  "--n-ink-hover": "#bcd5bd",
  "--n-cta-bg": "#e5ffc3",
  "--n-cta-fg": "#14392a",
  "--n-panel-shadow": "0 18px 50px rgba(0, 0, 0, 0.55)",
  "--n-on-green": "#faf8f4",
  "--n-on-green-muted": "rgba(250, 248, 244, 0.7)",
  "--n-card-shadow": "none",
  "--n-card-border": "#404943",
  "--n-ring": "rgba(158, 197, 162, 0.26)",
  "--n-star": "#e8b951",
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
  "--n-muted-2": "#5f6e66",
  "--n-muted-3": "#637269",
  "--n-surface": "#fffefb",
  "--n-surface-2": "#eaf3e7",
  "--n-surface-3": "#f1f5ee",
  "--n-line": "#dce4dc",
  "--n-line-2": "#e4ebe3",
  "--n-accent": "#174d3b",
  "--n-ink": "#0d1110",
  "--n-ink-soft": "#39413d",
  "--n-ink-hover": "#434b47",
  "--n-cta-bg": "#ea7747",
  "--n-cta-fg": "#14301f",
  "--n-panel-shadow": "0 26px 70px rgba(5, 34, 24, 0.28)",
  "--n-on-green": "#ffffff",
  "--n-on-green-muted": "rgba(255, 255, 255, 0.72)",
  "--n-card-shadow": "0 7px 24px rgba(23, 77, 59, 0.1)",
  "--n-card-border": "#dce4dc",
  "--n-ring": "rgba(23, 77, 59, 0.16)",
  "--n-star": "#9a6b12",
} as const;

export function nocturneVars(set: Record<string, string>): string {
  return Object.entries(set)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n");
}

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
