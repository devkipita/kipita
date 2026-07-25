import {
  TonalPalette,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

/**
 * Maps a vehicle's human colour name (e.g. "Silver", "Deep Blue") to a
 * pleasant, saturated display hex, and provides contrast helpers so cards
 * can pick readable text/pill colours over any base.
 */

const CAR_COLOR_MAP: Record<string, string> = {
  white: "#F2E7C9",
  offwhite: "#E9D8B4",
  pearl: "#E6D0A8",
  silver: "#8E99A8",
  grey: "#68707E",
  gray: "#68707E",
  gunmetal: "#404854",
  charcoal: "#24272F",
  black: "#111114",
  blue: "#1167D8",
  navy: "#163A8C",
  teal: "#00786B",
  green: "#1D7A4A",
  lime: "#96C93D",
  red: "#C9342C",
  maroon: "#7A2236",
  burgundy: "#682033",
  orange: "#D96704",
  yellow: "#DDAE16",
  gold: "#B88912",
  beige: "#B99767",
  brown: "#6B4123",
  bronze: "#8C5A2B",
  purple: "#6C3DD1",
  pink: "#D94B8C",
};

/** Resolve a colour name to a display hex, falling back to `fallback`. */
export function resolveCarColor(
  name: string | null | undefined,
  fallback: string,
): string {
  if (!name) return fallback;
  const key = name.trim().toLowerCase().replace(/[\s-]/g, "");
  // Match on any known word contained in the name (e.g. "metallic blue").
  if (CAR_COLOR_MAP[key]) return CAR_COLOR_MAP[key];
  for (const word of Object.keys(CAR_COLOR_MAP)) {
    if (key.includes(word)) return CAR_COLOR_MAP[word];
  }
  return fallback;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.substring(0, 2), 16),
    parseInt(full.substring(2, 4), 16),
    parseInt(full.substring(4, 6), 16),
  ];
}

/** Perceived-brightness test (YIQ) — true if a colour is light. */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

/** Best-contrast text colour (near-black or white) for a given background. */
export function onColor(hex: string): string {
  return isLightColor(hex) ? "#1A1A1F" : "#FFFFFF";
}

export interface TonalCardScheme {
  leftBg: string;
  leftInk: string;
  leftMuted: string;
  leftAccent: string;
  rightBg: string;
  rightInk: string;
  rightAccent: string;
  rightAccentSoft: string;
  pillBg: string;
  pillInk: string;
  outline: string;
}

const REQUEST_COLOR_SOURCES = [
  "#2F6C4F",
  "#8C5A2B",
  "#00786B",
  "#1167D8",
  "#6C3DD1",
  "#C9342C",
  "#B88912",
  "#D94B8C",
  "#1D7A4A",
  "#163A8C",
] as const;

const REQUEST_REGION_GROUPS = [
  {
    keywords: [
      "nairobi",
      "westlands",
      "karen",
      "kilimani",
      "lavington",
      "langata",
      "south b",
      "south c",
      "jkia",
      "kiambu",
      "ruiru",
      "thika",
      "juja",
      "githurai",
      "syokimau",
      "athi river",
      "kitengela",
      "ongata rongai",
      "ngong",
    ],
    sources: ["#8C5A2B", "#B88912", "#6B4123", "#D96704", "#D94B8C"] as const,
  },
  {
    keywords: [
      "mombasa",
      "nyali",
      "bamburi",
      "likoni",
      "diani",
      "ukunda",
      "malindi",
      "kilifi",
      "mariakani",
      "mtwapa",
      "watamu",
      "lamu",
      "kwale",
      "coast",
    ],
    sources: ["#00786B", "#1167D8", "#1D7A4A", "#163A8C", "#8E99A8"] as const,
  },
  {
    keywords: [
      "kisumu",
      "kakamega",
      "bungoma",
      "busia",
      "siaya",
      "migori",
      "homa bay",
      "kisii",
      "nyamira",
      "luanda",
      "mbale",
      "western",
      "lake",
    ],
    sources: ["#2F6C4F", "#00786B", "#96C93D", "#1167D8", "#B88912"] as const,
  },
  {
    keywords: [
      "nakuru",
      "naivasha",
      "eldoret",
      "nanyuki",
      "narok",
      "kajiado",
      "mai mahiu",
      "suswa",
      "longonot",
      "burnt forest",
      "rift",
    ],
    sources: ["#D96704", "#8C5A2B", "#B88912", "#C9342C", "#2F6C4F"] as const,
  },
  {
    keywords: [
      "nyeri",
      "embu",
      "meru",
      "chuka",
      "kerugoya",
      "sagana",
      "murang'a",
      "karatina",
      "naro moru",
      "mt kenya",
    ],
    sources: ["#6C3DD1", "#1D7A4A", "#8E99A8", "#D94B8C", "#1167D8"] as const,
  },
  {
    keywords: [
      "garissa",
      "wajir",
      "mandera",
      "isiolo",
      "marsabit",
      "moyale",
      "lodwar",
      "turkana",
      "north",
    ],
    sources: ["#C9342C", "#B88912", "#8C5A2B", "#D96704", "#6C3DD1"] as const,
  },
] as const;

function toneHex(palette: TonalPalette, tone: number): string {
  return hexFromArgb(palette.tone(tone));
}

/**
 * Generates a Material-like custom component scheme from one source hue by
 * pairing lighter container tones with deeper accent tones from the same
 * tonal palette.
 */
export function createTonalCardScheme(
  sourceHex: string,
  isDark: boolean,
  variant: "ride" | "request" = "ride",
): TonalCardScheme {
  const tonalPalette = TonalPalette.fromInt(argbFromHex(sourceHex));

  if (isDark) {
    if (variant === "request") {
      return {
        leftBg: toneHex(tonalPalette, 82),
        leftInk: toneHex(tonalPalette, 14),
        leftMuted: toneHex(tonalPalette, 34),
        leftAccent: toneHex(tonalPalette, 26),
        rightBg: toneHex(tonalPalette, 24),
        rightInk: toneHex(tonalPalette, 94),
        rightAccent: toneHex(tonalPalette, 84),
        rightAccentSoft: toneHex(tonalPalette, 36),
        pillBg: toneHex(tonalPalette, 28),
        pillInk: toneHex(tonalPalette, 94),
        outline: toneHex(tonalPalette, 42),
      };
    }

    return {
      leftBg: toneHex(tonalPalette, 24),
      leftInk: toneHex(tonalPalette, 96),
      leftMuted: toneHex(tonalPalette, 82),
      leftAccent: toneHex(tonalPalette, 86),
      rightBg: toneHex(tonalPalette, 82),
      rightInk: toneHex(tonalPalette, 8),
      rightAccent: toneHex(tonalPalette, 18),
      rightAccentSoft: toneHex(tonalPalette, 66),
      pillBg: toneHex(tonalPalette, 92),
      pillInk: toneHex(tonalPalette, 16),
      outline: toneHex(tonalPalette, 42),
    };
  }

  if (variant === "request") {
    return {
      leftBg: toneHex(tonalPalette, 96),
      leftInk: toneHex(tonalPalette, 18),
      leftMuted: toneHex(tonalPalette, 40),
      leftAccent: toneHex(tonalPalette, 30),
      rightBg: toneHex(tonalPalette, 30),
      rightInk: toneHex(tonalPalette, 96),
      rightAccent: toneHex(tonalPalette, 88),
      rightAccentSoft: toneHex(tonalPalette, 42),
      pillBg: toneHex(tonalPalette, 28),
      pillInk: toneHex(tonalPalette, 98),
      outline: toneHex(tonalPalette, 82),
    };
  }

  return {
    leftBg: toneHex(tonalPalette, 32),
    leftInk: toneHex(tonalPalette, 98),
    leftMuted: toneHex(tonalPalette, 88),
    leftAccent: toneHex(tonalPalette, 84),
    rightBg: toneHex(tonalPalette, 84),
    rightInk: toneHex(tonalPalette, 8),
    rightAccent: toneHex(tonalPalette, 18),
    rightAccentSoft: toneHex(tonalPalette, 70),
    pillBg: toneHex(tonalPalette, 96),
    pillInk: toneHex(tonalPalette, 16),
    outline: toneHex(tonalPalette, 64),
  };
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickSeedColor(seed: string, sources: readonly string[]): string {
  return sources[hashSeed(seed) % sources.length];
}

export function resolveRequestColorSource(
  seed: string | null | undefined,
  fallback: string,
): string {
  if (!seed) return fallback;
  const normalized = seed.trim().toLowerCase();
  if (!normalized) return fallback;

  for (const group of REQUEST_REGION_GROUPS) {
    if (group.keywords.some((keyword) => normalized.includes(keyword))) {
      return pickSeedColor(normalized, group.sources);
    }
  }

  return pickSeedColor(normalized, REQUEST_COLOR_SOURCES);
}

/** Mix a hex toward another hex by ratio t (0..1). */
export function mixHex(hex: string, toward: string, t: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(toward);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
