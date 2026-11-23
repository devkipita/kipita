/**
 * The name other people see on a public surface such as a road alert: the first
 * name and the first letter of the last one ("Olive Mahinda" shows as "Olive M.").
 * A single name is kept as it is. A missing or blank name gives `fallback`.
 *
 * Display only. The full name is still stored, and still read by the app where
 * people need it (rides, bookings, the person's own profile).
 */
export function shortName(
  fullName: string | null | undefined,
  fallback = "Kipita user",
): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];
  const last = Array.from(parts[parts.length - 1])[0];
  return `${parts[0]} ${last.toUpperCase()}.`;
}
