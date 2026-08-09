/**
 * Kenyan phone helpers. The UI pre-fills the +254 prefix, so the user only
 * types the 9 national digits (7XXXXXXXX or 1XXXXXXXX). We normalise to E.164
 * for Supabase, which is the source of truth.
 */

export const KE_DIAL_CODE = "+254";

/** Keep only digits, drop a leading 0 or 254 the user might paste. */
export function normalizeKeLocal(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/** True for a valid 9-digit national number (Safaricom/Airtel/Telkom ranges). */
export function isValidKeLocal(local: string): boolean {
  return /^(7|1)\d{8}$/.test(local);
}

/** National digits → +2547XXXXXXXX. Assumes a validated local number. */
export function toE164(local: string): string {
  return `${KE_DIAL_CODE}${normalizeKeLocal(local)}`;
}

/** Pretty grouping for display: 712 345 678. */
export function formatKeLocal(local: string): string {
  const d = normalizeKeLocal(local);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  return parts.join(" ");
}
