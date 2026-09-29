export const RAIL_COOKIE = "kipita-rail";

export const RAIL_MAX_AGE = 60 * 60 * 24 * 365;

export const RAIL_BREAKPOINT = 900;
export const RAIL_COMPACT_MAX = 1200;
export const RAIL_W_EXPANDED = 258;
export const RAIL_W_COLLAPSED = 80;
export const ASIDE_W = 300;
export const TOPBAR_H = 56;
export const BOTTOM_BAR_SPACE = 96;

export function parseRail(value: string | undefined | null): boolean {
  return value === "collapsed";
}
