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
  | "fare_margin_percent";

export const SETTING_FALLBACKS: Record<SettingKey, number> = {
  platform_fee_percent: 12,
  hold_minutes: 30,
  fuel_cost_per_km: 12.5,
  fare_margin_percent: 15,
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
