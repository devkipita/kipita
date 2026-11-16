import { bookingAmounts, type FareConfig } from "@kipita/shared";

export type FlagKey =
  | "send"
  | "live_tracking"
  | "road_alerts"
  | "instant_booking"
  | "ride_chat"
  | "web_push"
  | "publish_before_approval";

export type SettingKey =
  | "platform_fee_percent"
  | "hold_minutes"
  | "fuel_cost_per_km"
  | "fare_margin_percent"
  | "fee_on_top"
  | "fee_min_kes"
  | "fee_vat_percent"
  | "fare_wear_per_km"
  | "fare_min_seat_price"
  | "fare_round_step";

export const SETTING_FALLBACKS: Record<SettingKey, number> = {
  platform_fee_percent: 12,
  hold_minutes: 30,
  fuel_cost_per_km: 12.5,
  fare_margin_percent: 15,
  fee_on_top: 1,
  fee_min_kes: 0,
  fee_vat_percent: 16,
  fare_wear_per_km: 3,
  fare_min_seat_price: 100,
  fare_round_step: 10,
};

export type Platform = {
  settings: Record<string, number>;
  flags: Record<string, boolean>;
};

export const EMPTY_PLATFORM: Platform = { settings: {}, flags: {} };

export function settingOf(platform: Platform, key: SettingKey): number {
  const value = platform.settings[key];
  return Number.isFinite(value) ? value : SETTING_FALLBACKS[key];
}

export function flagOf(platform: Platform, key: FlagKey): boolean {
  return platform.flags[key] === true;
}

export type FareBreakdown = {
  total: number;
  fee: number;
  driverEarning: number;
  feePercent: number;
};

export function fareBreakdown(
  total: number,
  feePercent: number,
): FareBreakdown {
  const fee = Math.round(((total * feePercent) / 100) * 100) / 100;
  return {
    total,
    fee,
    driverEarning: Math.round((total - fee) * 100) / 100,
    feePercent,
  };
}

/**
 * What a passenger pays for a booking, shown before they book.
 *
 * Since migration 052 the Kipita fee is added on top of the seat price (fee_on_top = 1) and the
 * driver keeps the full seat subtotal. With fee_on_top = 0 the fee comes out of the driver's share
 * as before. The database computes the real figures when the booking is created (bookings_set_price);
 * this mirrors it for display and uses the same integer rounding as packages/shared/src/fare.ts.
 */
export type BookingBreakdown = {
  subtotal: number;
  fee: number;
  total: number;
  driverEarning: number;
  onTop: boolean;
  feePercent: number;
};

export function bookingBreakdown(
  seatPrice: number,
  seats: number,
  config: FareConfig,
): BookingBreakdown {
  const feePercent = config.feeBps / 100;
  const onTop = config.feeMode === "on_top";
  try {
    const a = bookingAmounts(seatPrice, seats, config);
    return {
      subtotal: a.subtotalKes,
      fee: a.serviceFeeKes,
      total: a.totalKes,
      driverEarning: a.driverEarningKes,
      onTop,
      feePercent,
    };
  } catch {
    // A seat price that is not a whole number of shillings: show the same maths without the integer checks.
    const subtotal = seatPrice * seats;
    const fee = Math.max(Math.round((subtotal * feePercent) / 100), config.minFeeKes);
    return onTop
      ? { subtotal, fee, total: subtotal + fee, driverEarning: subtotal, onTop, feePercent }
      : { subtotal, fee, total: subtotal, driverEarning: subtotal - fee, onTop, feePercent };
  }
}
