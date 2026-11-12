/**
 * Kenyan number plates.
 *
 * One rule, shared by both publish surfaces: the phone used to accept any four
 * characters while the desktop demanded `KDA 456B`, so the same driver could
 * save a plate on one and be rejected on the other — and nonsense reached
 * `vehicles.plate_number`, which is what a passenger looks for at pickup.
 *
 * Civilian series is `K` + two letters + three digits + a letter. Government
 * cars carry `GK` + a letter and the same tail, and drivers do carpool in them.
 */

const CIVILIAN = /^K[A-Z]{2} \d{3}[A-Z]$/;
const GOVERNMENT = /^GK[A-Z] \d{3}[A-Z]$/;

export const PLATE_EXAMPLE = "KDA 456B";
export const PLATE_ERROR = `Enter a Kenyan plate, like ${PLATE_EXAMPLE}.`;

/**
 * Tidy what has been typed so far: upper-case, no punctuation, and a single
 * space after the letter group. Safe to run on every keystroke — it never
 * drops a character the driver still has to finish typing.
 */
export function formatPlate(raw: string): string {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (v.length <= 3) return v;
  return `${v.slice(0, 3)} ${v.slice(3)}`;
}

export function isPlate(value: string): boolean {
  const v = value.trim().toUpperCase();
  return CIVILIAN.test(v) || GOVERNMENT.test(v);
}
