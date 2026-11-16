/**
 * Kipita fare and fee calculator (cost-sharing model).
 *
 * Pure TypeScript, no dependencies. Lives in packages/shared next to escrow.ts.
 * Settings come from public.platform_settings (see fareConfigFromSettings), fuel prices from
 * public.fuel_prices and vehicle classes from public.vehicle_classes (migration 052).
 *
 * Conventions
 *  - Every money amount in and out is an integer number of KES.
 *  - Every rate is in basis points (1 bps = 0.01%), so 12% = 1200.
 *  - Fuel prices are KES per litre and may have decimals (EPRA publishes e.g. 226.96).
 *  - Dates are ISO 'YYYY-MM-DD'. EPRA price periods start at midnight East Africa Time,
 *    so "today" is always evaluated in UTC+3.
 *
 * How a seat price is built
 *   tripCost  = (distanceKm / kmPerLitre) * fuelPricePerLitre   fuel
 *             + distanceKm * wearPerKm                           tyres, servicing
 *             + tolls                                            optional
 *   perSeat   = tripCost / (seatsOffered + 1)                    the driver carries one share
 *   suggested = perSeat rounded to the nearest rounding step
 *   cap       = perSeat * capMultiplier, rounded DOWN to the step   (driver cannot profit)
 *   the driver may choose any price between the floor and the cap.
 *
 * The result of quoteSeat() carries a full snapshot of its inputs. Store it on the trip
 * (trips.fare_quote jsonb). When the next EPRA review changes the fuel price, trips and
 * bookings that already hold a quote keep their price. Only new trips use the new price.
 */

export const FARE_MODEL_VERSION = 'fare-v1';

// ───────────────────────────── types ─────────────────────────────

export type FuelType = 'petrol' | 'diesel';

export interface FuelPriceRow {
  fuelType: FuelType;
  /** lower-case town key as published by EPRA, e.g. 'nairobi', 'mombasa' */
  region: string;
  /** KES per litre (EPRA maximum pump price) */
  priceKes: number;
  /** inclusive, 'YYYY-MM-DD' */
  effectiveFrom: string;
  /** inclusive, 'YYYY-MM-DD' */
  effectiveTo: string;
}

export interface ResolvedFuelPrice {
  fuelType: FuelType;
  region: string;
  priceKes: number;
  effectiveFrom: string;
  effectiveTo: string;
  /**
   * true when no price period covers today and the last known price was used.
   * Surface this in the admin portal: it means the next EPRA review has not been entered yet.
   */
  stale: boolean;
}

export interface VehicleClass {
  code: string;
  label: string;
  /** real-world mixed driving, km per litre */
  kmPerLitre: number;
  fuelType: FuelType;
}

export type FeeMode = 'on_top' | 'deducted';

export interface FareConfig {
  /** platform fee as a share of the seat price. 1200 = 12% */
  feeBps: number;
  /**
   * 'on_top'   : passenger pays seatPrice + fee, driver receives the full seatPrice.
   * 'deducted' : passenger pays seatPrice, driver receives seatPrice - fee.
   */
  feeMode: FeeMode;
  /** VAT rate used only to split the fee into net and VAT for the ledger. The fee is treated as VAT-inclusive. */
  vatBps: number;
  /** smallest platform fee per seat, in KES. Protects short rides from flat payout costs. 0 = off */
  minFeeKes: number;
  /** tyres, servicing, depreciation per km. Set to 0 for a strict fuel-and-tolls model. */
  wearPerKmKes: number;
  /** highest price a driver may ask, as a share of the cost-share. 11500 = 115% */
  capMultiplierBps: number;
  /** lowest seat price Kipita will list */
  minSeatPriceKes: number;
  /** prices snap to this step. 10 = nearest KES 10 */
  roundingStepKes: number;
  /** true: the driver counts as one of the people sharing the cost (seatsOffered + 1 shares) */
  driverSharesCost: boolean;
}

export interface SeatQuoteInput {
  /** road distance of the passenger's leg, in km */
  distanceKm: number;
  vehicle: VehicleClass;
  seatsOffered: number;
  /** total tolls for the leg, in KES */
  tollsKes?: number;
  fuel: ResolvedFuelPrice;
  config: FareConfig;
  /** what the driver wants to ask per seat. Omit to use the suggested price. */
  driverPriceKes?: number;
  /** pass the time of calculation to keep tests deterministic */
  now?: Date;
}

export interface CostShare {
  fuelCostKes: number;
  wearCostKes: number;
  tollsKes: number;
  tripCostKes: number;
  shares: number;
  perSeatRawKes: number;
  floorKes: number;
  suggestedKes: number;
  capKes: number;
}

export interface FeeSplit {
  /** seat price chosen by the driver */
  seatPriceKes: number;
  /** what the passenger is charged */
  passengerTotalKes: number;
  /** platform fee, VAT included */
  platformFeeKes: number;
  platformFeeNetKes: number;
  platformFeeVatKes: number;
  /** what the driver receives before any payout transaction cost */
  driverPayoutKes: number;
}

export interface FareQuote extends FeeSplit {
  suggestedKes: number;
  capKes: number;
  floorKes: number;
  costShare: CostShare;
  /** everything needed to explain or re-audit this price later. Store as jsonb. */
  snapshot: {
    modelVersion: string;
    calculatedAt: string;
    distanceKm: number;
    seatsOffered: number;
    vehicleCode: string;
    kmPerLitre: number;
    fuelType: FuelType;
    fuelRegion: string;
    fuelPriceKes: number;
    fuelPeriod: { from: string; to: string };
    fuelPriceStale: boolean;
    config: FareConfig;
  };
}

export type FareErrorCode =
  | 'BAD_INPUT'
  | 'NO_FUEL_PRICE'
  | 'PRICE_BELOW_FLOOR'
  | 'PRICE_ABOVE_CAP';

export class FareError extends Error {
  readonly code: FareErrorCode;
  constructor(code: FareErrorCode, message: string) {
    super(message);
    this.name = 'FareError';
    this.code = code;
  }
}

// ──────────────────────────── defaults ────────────────────────────

export const DEFAULT_FARE_CONFIG: FareConfig = {
  feeBps: 1200,
  feeMode: 'on_top',
  vatBps: 1600,
  minFeeKes: 0,
  wearPerKmKes: 3,
  capMultiplierBps: 11500,
  minSeatPriceKes: 100,
  roundingStepKes: 10,
  driverSharesCost: true,
};

/**
 * Starting assumptions, NOT measured data. Calibrate with real driver reports and keep
 * these editable in the admin portal (vehicle_classes table).
 */
export const DEFAULT_VEHICLE_CLASSES: Record<string, VehicleClass> = {
  hatch: { code: 'hatch', label: 'Small car (Vitz, Passo, Demio)', kmPerLitre: 15, fuelType: 'petrol' },
  sedan: { code: 'sedan', label: 'Sedan or wagon (Axio, Premio, Fielder)', kmPerLitre: 13, fuelType: 'petrol' },
  suv_petrol: { code: 'suv_petrol', label: 'SUV, petrol (CX-5, Forester, Harrier)', kmPerLitre: 10, fuelType: 'petrol' },
  suv_diesel: { code: 'suv_diesel', label: 'SUV, diesel (Prado, Fortuner)', kmPerLitre: 9, fuelType: 'diesel' },
  minivan: { code: 'minivan', label: 'Minivan (Noah, Voxy)', kmPerLitre: 9, fuelType: 'petrol' },
};

// ───────────────────────── fuel price lookup ─────────────────────────

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' of the given instant in Nairobi time (UTC+3, no daylight saving). */
export function nairobiDate(at: Date): string {
  return new Date(at.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

const FALLBACK_REGION = 'nairobi';

/**
 * Picks the price that applies at `at`.
 *  1. the period that covers today in the requested region
 *  2. otherwise the same lookup in Nairobi (EPRA's reference town)
 *  3. otherwise the most recent past period, flagged stale
 */
export function resolveFuelPrice(
  rows: readonly FuelPriceRow[],
  fuelType: FuelType,
  region: string,
  at: Date = new Date(),
): ResolvedFuelPrice {
  const today = nairobiDate(at);
  const wanted = region.trim().toLowerCase();
  const ofType = rows.filter((r) => r.fuelType === fuelType && r.priceKes > 0);

  const covering = (reg: string) =>
    ofType.find((r) => r.region === reg && r.effectiveFrom <= today && today <= r.effectiveTo);

  const hit = covering(wanted) ?? covering(FALLBACK_REGION);
  if (hit) return toResolved(hit, false);

  const past = (reg: string) =>
    ofType
      .filter((r) => r.region === reg && r.effectiveTo < today)
      .sort((a, b) => (a.effectiveTo < b.effectiveTo ? 1 : -1))[0];

  const latest = past(wanted) ?? past(FALLBACK_REGION);
  if (latest) return toResolved(latest, true);

  throw new FareError('NO_FUEL_PRICE', `No ${fuelType} price on file for ${wanted} or ${FALLBACK_REGION}`);
}

function toResolved(r: FuelPriceRow, stale: boolean): ResolvedFuelPrice {
  return {
    fuelType: r.fuelType,
    region: r.region,
    priceKes: r.priceKes,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    stale,
  };
}

// ───────────────────────────── maths ─────────────────────────────

/** amount * bps / 10000, rounded half up, integers only */
export function mulBps(amountKes: number, bps: number): number {
  return Math.floor((amountKes * bps + 5000) / 10000);
}

const roundToStep = (n: number, step: number) => Math.round(n / step) * step;
const floorToStep = (n: number, step: number) => Math.floor(n / step) * step;

function assertPositive(name: string, v: number) {
  if (!Number.isFinite(v) || v <= 0) throw new FareError('BAD_INPUT', `${name} must be a positive number, got ${v}`);
}

function validateConfig(c: FareConfig) {
  const ints: Array<[string, number]> = [
    ['feeBps', c.feeBps], ['vatBps', c.vatBps], ['minFeeKes', c.minFeeKes],
    ['capMultiplierBps', c.capMultiplierBps], ['minSeatPriceKes', c.minSeatPriceKes],
    ['roundingStepKes', c.roundingStepKes],
  ];
  for (const [name, v] of ints) {
    if (!Number.isInteger(v) || v < 0) throw new FareError('BAD_INPUT', `${name} must be a non-negative integer`);
  }
  if (c.roundingStepKes < 1) throw new FareError('BAD_INPUT', 'roundingStepKes must be at least 1');
  if (c.feeBps > 5000) throw new FareError('BAD_INPUT', 'feeBps above 50% looks like a typo');
  if (c.capMultiplierBps < 10000) throw new FareError('BAD_INPUT', 'capMultiplierBps must be at least 10000 (100%)');
  if (!Number.isFinite(c.wearPerKmKes) || c.wearPerKmKes < 0) throw new FareError('BAD_INPUT', 'wearPerKmKes must be zero or more');
}

// ─────────────────────────── cost sharing ───────────────────────────

/** Suggested price, floor and cap for one seat. */
export function costShare(input: Omit<SeatQuoteInput, 'driverPriceKes' | 'now'>): CostShare {
  const { distanceKm, vehicle, seatsOffered, fuel, config } = input;
  const tollsKes = input.tollsKes ?? 0;

  assertPositive('distanceKm', distanceKm);
  assertPositive('kmPerLitre', vehicle.kmPerLitre);
  assertPositive('fuel price', fuel.priceKes);
  if (!Number.isInteger(seatsOffered) || seatsOffered < 1 || seatsOffered > 6) {
    throw new FareError('BAD_INPUT', 'seatsOffered must be a whole number from 1 to 6');
  }
  if (!Number.isFinite(tollsKes) || tollsKes < 0) throw new FareError('BAD_INPUT', 'tollsKes must be zero or more');
  validateConfig(config);

  const step = config.roundingStepKes;
  const fuelCostKes = (distanceKm / vehicle.kmPerLitre) * fuel.priceKes;
  const wearCostKes = distanceKm * config.wearPerKmKes;
  const tripCostKes = fuelCostKes + wearCostKes + tollsKes;
  const shares = config.driverSharesCost ? seatsOffered + 1 : seatsOffered;
  const perSeatRawKes = tripCostKes / shares;

  const floorKes = roundToStep(config.minSeatPriceKes, step) || step;
  const suggestedKes = Math.max(floorKes, roundToStep(perSeatRawKes, step));
  const capKes = Math.max(
    suggestedKes,
    floorToStep((perSeatRawKes * config.capMultiplierBps) / 10000, step),
  );

  return { fuelCostKes, wearCostKes, tollsKes, tripCostKes, shares, perSeatRawKes, floorKes, suggestedKes, capKes };
}

// ───────────────────────────── platform fee ─────────────────────────────

/** Splits a seat price into passenger total, platform fee (with VAT breakdown) and driver payout. */
export function splitFee(seatPriceKes: number, config: FareConfig): FeeSplit {
  if (!Number.isInteger(seatPriceKes) || seatPriceKes <= 0) {
    throw new FareError('BAD_INPUT', 'seatPriceKes must be a positive whole number');
  }
  validateConfig(config);

  let platformFeeKes = Math.max(mulBps(seatPriceKes, config.feeBps), config.minFeeKes);
  if (config.feeMode === 'deducted') platformFeeKes = Math.min(platformFeeKes, seatPriceKes);

  const platformFeeNetKes = Math.round((platformFeeKes * 10000) / (10000 + config.vatBps));
  const platformFeeVatKes = platformFeeKes - platformFeeNetKes;

  const passengerTotalKes = config.feeMode === 'on_top' ? seatPriceKes + platformFeeKes : seatPriceKes;
  const driverPayoutKes = config.feeMode === 'on_top' ? seatPriceKes : seatPriceKes - platformFeeKes;

  return { seatPriceKes, passengerTotalKes, platformFeeKes, platformFeeNetKes, platformFeeVatKes, driverPayoutKes };
}

// ───────────────────────────── the quote ─────────────────────────────

/**
 * Full seat quote. Throws FareError('PRICE_ABOVE_CAP' | 'PRICE_BELOW_FLOOR') when the driver
 * asks for a price outside the allowed band, so the UI can show the limit.
 */
export function quoteSeat(input: SeatQuoteInput): FareQuote {
  const cs = costShare(input);
  const { config, vehicle, fuel } = input;

  let seatPriceKes = cs.suggestedKes;
  if (input.driverPriceKes !== undefined) {
    if (!Number.isFinite(input.driverPriceKes)) throw new FareError('BAD_INPUT', 'driverPriceKes must be a number');
    seatPriceKes = roundToStep(input.driverPriceKes, config.roundingStepKes);
    if (seatPriceKes > cs.capKes) {
      throw new FareError('PRICE_ABOVE_CAP', `Maximum for this trip is KES ${cs.capKes}`);
    }
    if (seatPriceKes < cs.floorKes) {
      throw new FareError('PRICE_BELOW_FLOOR', `Minimum for this trip is KES ${cs.floorKes}`);
    }
  }

  const fee = splitFee(seatPriceKes, config);

  return {
    ...fee,
    suggestedKes: cs.suggestedKes,
    capKes: cs.capKes,
    floorKes: cs.floorKes,
    costShare: cs,
    snapshot: {
      modelVersion: FARE_MODEL_VERSION,
      calculatedAt: (input.now ?? new Date()).toISOString(),
      distanceKm: input.distanceKm,
      seatsOffered: input.seatsOffered,
      vehicleCode: vehicle.code,
      kmPerLitre: vehicle.kmPerLitre,
      fuelType: fuel.fuelType,
      fuelRegion: fuel.region,
      fuelPriceKes: fuel.priceKes,
      fuelPeriod: { from: fuel.effectiveFrom, to: fuel.effectiveTo },
      fuelPriceStale: fuel.stale,
      config: { ...config },
    },
  };
}

/**
 * Convenience for the admin "fuel price impact" preview: the same trip priced at the
 * current fuel price and at a proposed one.
 */
export function previewFuelChange(
  input: Omit<SeatQuoteInput, 'driverPriceKes'>,
  proposedPriceKes: number,
): { before: FareQuote; after: FareQuote; deltaKes: number; deltaPct: number } {
  const before = quoteSeat(input);
  const after = quoteSeat({ ...input, fuel: { ...input.fuel, priceKes: proposedPriceKes } });
  const deltaKes = after.suggestedKes - before.suggestedKes;
  return { before, after, deltaKes, deltaPct: Math.round((deltaKes / before.suggestedKes) * 1000) / 10 };
}

// ───────────────────── platform_settings mapping ─────────────────────

/** The numeric keys in public.platform_settings that drive pricing. Missing keys fall back to the defaults. */
export type PlatformSettings = Record<string, number | undefined>;

const num = (v: number | undefined, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Builds a FareConfig from platform_settings rows.
 *   platform_fee_percent  12     -> feeBps 1200
 *   fare_margin_percent   15     -> capMultiplierBps 11500 (headroom above the cost share)
 *   fee_on_top            1 or 0 -> feeMode 'on_top' | 'deducted'
 *   fee_min_kes, fee_vat_percent, fare_wear_per_km, fare_min_seat_price, fare_round_step
 */
export function fareConfigFromSettings(s: PlatformSettings): FareConfig {
  const d = DEFAULT_FARE_CONFIG;
  return {
    feeBps: Math.round(num(s.platform_fee_percent, d.feeBps / 100) * 100),
    feeMode: num(s.fee_on_top, 1) === 1 ? 'on_top' : 'deducted',
    vatBps: Math.round(num(s.fee_vat_percent, d.vatBps / 100) * 100),
    minFeeKes: Math.round(num(s.fee_min_kes, d.minFeeKes)),
    wearPerKmKes: num(s.fare_wear_per_km, d.wearPerKmKes),
    capMultiplierBps: Math.round((100 + num(s.fare_margin_percent, (d.capMultiplierBps - 10000) / 100)) * 100),
    minSeatPriceKes: Math.round(num(s.fare_min_seat_price, d.minSeatPriceKes)),
    roundingStepKes: Math.max(1, Math.round(num(s.fare_round_step, d.roundingStepKes))),
    driverSharesCost: d.driverSharesCost,
  };
}

// ───────────────────────────── booking amounts ─────────────────────────────

export interface BookingAmounts {
  seatPriceKes: number;
  seats: number;
  /** seat price x seats */
  subtotalKes: number;
  /** fee charged on top. 0 in 'deducted' mode */
  serviceFeeKes: number;
  /** what the passenger pays (bookings.total_price) */
  totalKes: number;
  /** what the driver receives */
  driverEarningKes: number;
  /** the whole platform fee, whichever mode */
  platformFeeKes: number;
}

/**
 * Mirrors public.bookings_set_price() in migration 052, which is what the database applies when a
 * booking is created. The fee is charged once, on the seat subtotal of the booking.
 */
export function bookingAmounts(seatPriceKes: number, seats: number, config: FareConfig): BookingAmounts {
  if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
    throw new FareError('BAD_INPUT', 'seats must be a whole number from 1 to 8');
  }
  if (!Number.isInteger(seatPriceKes) || seatPriceKes <= 0) {
    throw new FareError('BAD_INPUT', 'seatPriceKes must be a positive whole number');
  }
  validateConfig(config);

  const subtotalKes = seatPriceKes * seats;
  const rawFee = Math.max(mulBps(subtotalKes, config.feeBps), config.minFeeKes);

  if (config.feeMode === 'on_top') {
    return {
      seatPriceKes, seats, subtotalKes,
      serviceFeeKes: rawFee,
      totalKes: subtotalKes + rawFee,
      driverEarningKes: subtotalKes,
      platformFeeKes: rawFee,
    };
  }
  const fee = Math.min(rawFee, subtotalKes);
  return {
    seatPriceKes, seats, subtotalKes,
    serviceFeeKes: 0,
    totalKes: subtotalKes,
    driverEarningKes: subtotalKes - fee,
    platformFeeKes: fee,
  };
}
