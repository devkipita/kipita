/**
 * Kipita's ride-payment escrow business rules — the single source of truth for
 * the platform fee, shared by the mobile app, the web admin, and mirrored by
 * the Supabase edge functions (`KIPITA_FEE_PERCENT` env, same default).
 */

/**
 * Kipita's platform commission, as a percentage of the seat price. Since migration 052 it is charged on
 * top of the seat price at booking (bookings.service_fee), so the driver receives the full seat price.
 * The live rate is platform_settings.platform_fee_percent. This is only the fallback.
 */
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

/**
 * Split what a passenger paid into Kipita's fee and the driver's earning.
 *
 * `serviceFee` is bookings.service_fee. When it is present the fee was added on top at booking time,
 * so the driver earns the total minus that fee. When it is null (bookings made before migration 052,
 * or while fee_on_top = 0) the fee is deducted from the total at `percent`, as before.
 */
export function splitPaidTotal(
  total: number,
  serviceFee: number | null | undefined,
  percent: number = KIPITA_FEE_PERCENT,
): { fee: number; driverEarning: number; onTop: boolean } {
  if (serviceFee !== null && serviceFee !== undefined && Number.isFinite(serviceFee)) {
    const fee = round2(serviceFee);
    return { fee, driverEarning: round2(total - fee), onTop: true };
  }
  const fee = round2((total * percent) / 100);
  return { fee, driverEarning: round2(total - fee), onTop: false };
}

/** Format a KES amount for display (e.g. "KES 1,200"). */
export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}
