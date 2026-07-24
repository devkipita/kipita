/**
 * Maps a vehicle's human colour name (e.g. "Silver", "Deep Blue") to a
 * pleasant, saturated display hex, and provides contrast helpers so cards
 * can pick readable text/pill colours over any base.
 */

const CAR_COLOR_MAP: Record<string, string> = {
  white: '#E7E9EC',
  offwhite: '#EDE9E1',
  pearl: '#EDE9E1',
  silver: '#C2C8D0',
  grey: '#9AA1AC',
  gray: '#9AA1AC',
  gunmetal: '#5A616B',
  charcoal: '#3B3F47',
  black: '#31313A',
  blue: '#3B82C4',
  navy: '#2E4A7D',
  teal: '#2E9C97',
  green: '#3E9C6B',
  lime: '#7FB23C',
  red: '#D64545',
  maroon: '#8E3B4E',
  burgundy: '#7A2E3E',
  orange: '#E0813C',
  yellow: '#E3B23C',
  gold: '#D9A441',
  beige: '#CDBBA0',
  brown: '#8B5E3C',
  bronze: '#A9773F',
  purple: '#7E57C2',
  pink: '#D96BA0',
};

/** Resolve a colour name to a display hex, falling back to `fallback`. */
export function resolveCarColor(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  const key = name.trim().toLowerCase().replace(/[\s-]/g, '');
  // Match on any known word contained in the name (e.g. "metallic blue").
  if (CAR_COLOR_MAP[key]) return CAR_COLOR_MAP[key];
  for (const word of Object.keys(CAR_COLOR_MAP)) {
    if (key.includes(word)) return CAR_COLOR_MAP[word];
  }
  return fallback;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
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
  return isLightColor(hex) ? '#1A1A1F' : '#FFFFFF';
}

/** Mix a hex toward another hex by ratio t (0..1). */
export function mixHex(hex: string, toward: string, t: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(toward);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
