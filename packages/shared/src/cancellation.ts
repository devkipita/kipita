/**
 * Kipita cancellation rule.
 *
 * Pure TypeScript, no dependencies. This file is the specification: the database function
 * public.cancellation_terms() (migration 063) must give the same answers, and cancellation.test.ts
 * pins them down. Settings come from public.platform_settings (see cancellationConfigFromSettings).
 *
 * Conventions: money is whole KES, times are JavaScript Dates.
 *
 * Passenger cancels
 *   No money held yet (request not accepted, or accepted but unpaid)  nothing is charged.
 *   Free window: from paying until the LATER of
 *       graceMinutes after paying,  and  freeHours before departure.
 *     The passenger gets everything back, including the fee. Kipita absorbs the M-PESA cost.
 *   After the free window, up to departure (the "late" tier)
 *     The passenger gets latePercent of the seat price back. The driver keeps the rest.
 *     Kipita keeps its fee in full.
 *   No-show (the driver marks it after departure + noShowWaitMinutes, and the passenger does not
 *     dispute it within noShowDisputeHours)
 *     The passenger gets nothing. The driver gets the whole seat price. Kipita keeps its fee.
 *
 * Driver cancels
 *   The passenger always gets everything back, including the fee. If someone had paid and the
 *   cancellation came inside the free window it is recorded as a late driver cancellation.
 */

export type CancellationConfig = {
  /** Free cancellation closes this many hours before departure. */
  freeHours: number;
  /** Whatever the lead time, a paid booking can be cancelled free for this long after paying. */
  graceMinutes: number;
  /** Share of the seat price (not the fee) returned when cancelling after the free window. 0–100. */
  latePercent: number;
  /** A driver may mark a no-show this long after the departure time. */
  noShowWaitMinutes: number;
  /** How long a passenger has to dispute a no-show before the driver is paid. */
  noShowDisputeHours: number;
};

export const DEFAULT_CANCELLATION_CONFIG: CancellationConfig = {
  freeHours: 12,
  graceMinutes: 30,
  latePercent: 50,
  noShowWaitMinutes: 15,
  noShowDisputeHours: 24,
};

/** platform_settings keys, in the same order as CancellationConfig. */
export const CANCELLATION_SETTING_KEYS = {
  freeHours: "cancel_free_hours",
  graceMinutes: "cancel_grace_minutes",
  latePercent: "cancel_late_refund_percent",
  noShowWaitMinutes: "no_show_wait_minutes",
  noShowDisputeHours: "no_show_dispute_hours",
} as const satisfies Record<keyof CancellationConfig, string>;

const LIMITS: Record<keyof CancellationConfig, { min: number; max: number }> = {
  freeHours: { min: 0, max: 168 },
  graceMinutes: { min: 0, max: 1440 },
  latePercent: { min: 0, max: 100 },
  noShowWaitMinutes: { min: 0, max: 240 },
  noShowDisputeHours: { min: 1, max: 168 },
};

/** Reads the five settings out of a settings map. Missing, non-numeric or out-of-range values fall back to the default. */
export function cancellationConfigFromSettings(settings: Record<string, unknown>): CancellationConfig {
  const out = { ...DEFAULT_CANCELLATION_CONFIG };
  for (const field of Object.keys(CANCELLATION_SETTING_KEYS) as (keyof CancellationConfig)[]) {
    const raw = settings[CANCELLATION_SETTING_KEYS[field]];
    const value = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    const { min, max } = LIMITS[field];
    if (Number.isFinite(value) && value >= min && value <= max) out[field] = value;
  }
  return out;
}

export type CancelMode = "passenger" | "driver" | "no_show";

export type CancellationTier =
  /** No money was held, so nothing moves. */
  | "nothing_held"
  /** Inside the free window. Everything goes back. */
  | "free"
  /** After the free window. Part goes back, the driver is compensated. */
  | "late"
  /** The passenger did not turn up. */
  | "no_show"
  /** The driver cancelled. Everything goes back. */
  | "driver";

export type CancellationInput = {
  mode: CancelMode;
  now: Date;
  departsAt: Date;
  /** Whether the fare is held in escrow. */
  held: boolean;
  /** When the passenger paid. Required when held. */
  paidAt: Date | null;
  /** Seat price times seats: what the driver earns on a normal trip. payments.driver_earning. */
  seatKes: number;
  /** Kipita's fee on this booking. payments.platform_fee. */
  feeKes: number;
};

export type CancellationQuote = {
  tier: CancellationTier;
  /** Back to the passenger's wallet. */
  passengerGetsKes: number;
  /** To the driver's wallet. */
  driverGetsKes: number;
  /** Kept by Kipita. */
  kipitaKeepsKes: number;
  /**
   * The last moment a passenger can still cancel for free, or null when nothing is held.
   * Only meaningful for a passenger cancelling.
   */
  freeUntil: Date | null;
  /** True when this is a driver cancelling inside the free window while someone had paid. */
  lateForDriver: boolean;
};

export function freeUntil(departsAt: Date, paidAt: Date, config: CancellationConfig): Date {
  const grace = paidAt.getTime() + config.graceMinutes * 60_000;
  const lead = departsAt.getTime() - config.freeHours * 3_600_000;
  return new Date(Math.max(grace, lead));
}

export function quoteCancellation(input: CancellationInput, config: CancellationConfig = DEFAULT_CANCELLATION_CONFIG): CancellationQuote {
  const { mode, now, departsAt, held, paidAt } = input;
  const seat = Math.max(0, Math.round(input.seatKes));
  const fee = Math.max(0, Math.round(input.feeKes));
  const total = seat + fee;

  if (!held || !paidAt) {
    return { tier: "nothing_held", passengerGetsKes: 0, driverGetsKes: 0, kipitaKeepsKes: 0, freeUntil: null, lateForDriver: false };
  }

  const until = freeUntil(departsAt, paidAt, config);
  const insideFreeWindow = now.getTime() <= until.getTime();

  if (mode === "driver") {
    return {
      tier: "driver",
      passengerGetsKes: total,
      driverGetsKes: 0,
      kipitaKeepsKes: 0,
      freeUntil: until,
      lateForDriver: !insideFreeWindow,
    };
  }

  if (mode === "passenger" && insideFreeWindow) {
    return { tier: "free", passengerGetsKes: total, driverGetsKes: 0, kipitaKeepsKes: 0, freeUntil: until, lateForDriver: false };
  }

  if (mode === "no_show") {
    return { tier: "no_show", passengerGetsKes: 0, driverGetsKes: seat, kipitaKeepsKes: fee, freeUntil: until, lateForDriver: false };
  }

  const back = Math.min(seat, Math.round((seat * config.latePercent) / 100));
  return { tier: "late", passengerGetsKes: back, driverGetsKes: seat - back, kipitaKeepsKes: fee, freeUntil: until, lateForDriver: false };
}

/** Earliest moment a driver may mark a passenger as a no-show. */
export function noShowOpensAt(departsAt: Date, config: CancellationConfig): Date {
  return new Date(departsAt.getTime() + config.noShowWaitMinutes * 60_000);
}

// ───────────────────────────── wording ─────────────────────────────

function hoursWord(hours: number): string {
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function minutesWord(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) return hoursWord(minutes / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * The rule in plain words, shown before a passenger pays.
 * Keep every line short: it sits on the payment screen on a phone.
 */
export function cancellationRuleLines(config: CancellationConfig = DEFAULT_CANCELLATION_CONFIG): string[] {
  const lines: string[] = [];
  const grace = config.graceMinutes > 0 ? `, or within ${minutesWord(config.graceMinutes)} of paying` : "";
  lines.push(`Cancel free more than ${hoursWord(config.freeHours)} before the ride${grace}.`);
  if (config.latePercent > 0) {
    lines.push(`After that you get ${config.latePercent}% of the seat price back and the driver keeps the rest. The service fee isn't refunded.`);
  } else {
    lines.push("After that the seat price goes to the driver. The service fee isn't refunded.");
  }
  lines.push("If you don't turn up, nothing is refunded.");
  lines.push("If the driver cancels, you always get everything back.");
  return lines;
}

/** One line for the booking card: when free cancellation ends. */
export function freeUntilLine(until: Date | null, now: Date, formatTime: (d: Date) => string): string | null {
  if (!until) return null;
  return now.getTime() <= until.getTime() ? `Free cancellation until ${formatTime(until)}` : null;
}
