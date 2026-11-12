const CIVILIAN = /^K[A-Z]{2} \d{3}[A-Z]$/;
const GOVERNMENT = /^GK[A-Z] \d{3}[A-Z]$/;

export const PLATE_EXAMPLE = "KDA 456B";
export const PLATE_ERROR = `Enter a Kenyan plate, like ${PLATE_EXAMPLE}.`;

export function formatPlate(raw: string): string {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (v.length <= 3) return v;
  return `${v.slice(0, 3)} ${v.slice(3)}`;
}

export function isPlate(value: string): boolean {
  const v = value.trim().toUpperCase();
  return CIVILIAN.test(v) || GOVERNMENT.test(v);
}
