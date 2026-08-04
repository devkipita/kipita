/**
 * Kipita's ride-payment escrow business rules — the single source of truth for
 * the platform fee, shared by the mobile app, the web admin, and mirrored by
 * the Supabase edge functions (`KIPITA_FEE_PERCENT` env, same default).
 */

/** Kipita's platform commission, as a percentage of the fare. */
export const KIPITA_FEE_PERCENT = 12;

/** Round to 2 decimal places (KES cents). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a fare into Kipita's fee and the driver's take-home earning. */
export function computeEscrowSplit(amount: number): {
  fee: number;
  driverEarning: number;
} {
  const fee = round2((amount * KIPITA_FEE_PERCENT) / 100);
  return { fee, driverEarning: round2(amount - fee) };
}

/** Format a KES amount for display (e.g. "KES 1,200"). */
export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}
