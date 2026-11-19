// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FARE_CONFIG,
  DEFAULT_VEHICLE_CLASSES,
  FareError,
  fareConfigFromSettings,
  fillOutcomes,
  judgePrice,
  priceBySeatCount,
  resolveFuelPrice,
  seatPriceRange,
  type FareConfig,
  type FuelPriceRow,
} from "./fare.ts";

const FUEL: FuelPriceRow[] = [
  { fuelType: "petrol", region: "nairobi", priceKes: 226.96, effectiveFrom: "2026-10-15", effectiveTo: "2026-11-14" },
];
const NOW = new Date("2026-11-12T10:00:00Z");
const cfg = (over: Partial<FareConfig> = {}): FareConfig => ({ ...DEFAULT_FARE_CONFIG, ...over });
const trip = (over = {}) => ({
  distanceKm: 157,
  vehicle: DEFAULT_VEHICLE_CLASSES.sedan,
  seatsOffered: 3,
  fuel: resolveFuelPrice(FUEL, "petrol", "nairobi", NOW),
  config: cfg(),
  ...over,
});

// Nairobi to Nakuru, sedan, 3 seats: trip cost about KES 3,212 shared four ways.

test("recommended price is the even split including the driver; cap stays at 115%, floor is 70%", () => {
  const r = seatPriceRange(trip());
  assert.equal(Math.round(r.tripCostKes), 3212);
  assert.equal(r.recommendedKes, 800);
  assert.equal(r.capKes, 920);
  assert.equal(r.floorKes, 560);
});

test("quick picks sit inside the range, lowest first", () => {
  const r = seatPriceRange(trip());
  assert.deepEqual(r.choices, [
    { key: "lower", kes: 680 },
    { key: "recommended", kes: 800 },
    { key: "higher", kes: 860 },
    { key: "highest", kes: 920 },
  ]);
});

test("offering fewer seats raises the recommended price per seat", () => {
  const two = seatPriceRange(trip({ seatsOffered: 2 }));
  assert.equal(two.recommendedKes, 1070);
  assert.equal(two.floorKes, 750);
  assert.equal(two.capKes, 1230);
  assert.ok(two.recommendedKes > seatPriceRange(trip()).recommendedKes);
});

test("price by seat count falls as more seats share the cost", () => {
  const rows = priceBySeatCount(
    { distanceKm: 157, vehicle: DEFAULT_VEHICLE_CLASSES.sedan, fuel: trip().fuel, config: cfg() },
    4,
  );
  assert.deepEqual(rows.map((r) => r.recommendedKes), [1610, 1070, 800, 640]);
  assert.deepEqual(rows.map((r) => r.seats), [1, 2, 3, 4]);
});

test("a very short trip collapses to one price, the minimum", () => {
  const r = seatPriceRange(trip({ distanceKm: 4 }));
  assert.equal(r.recommendedKes, 100);
  assert.equal(r.floorKes, 100);
  assert.equal(r.capKes, 100);
  assert.deepEqual(r.choices, [{ key: "recommended", kes: 100 }]);
});

test("the floor never drops below the minimum seat price, and never rises above the recommended price", () => {
  const low = seatPriceRange(trip({ distanceKm: 80, config: cfg({ minSeatPriceKes: 300 }) }));
  assert.equal(low.recommendedKes, 410);
  assert.equal(low.floorKes, 300);

  const strict = seatPriceRange(trip({ config: cfg({ floorBps: 10000 }) }));
  assert.equal(strict.floorKes, strict.recommendedKes);

  const none = seatPriceRange(trip({ config: cfg({ floorBps: 0 }) }));
  assert.equal(none.floorKes, 100);
});

test("the floor is rounded up to the price step", () => {
  // 850 * 70% = 595, which rounds up to 600 so the floor is never under 70%
  const r = seatPriceRange(trip({ distanceKm: 170 }));
  assert.equal(r.recommendedKes % 10, 0);
  assert.equal(r.floorKes % 10, 0);
  assert.ok(r.floorKes >= (r.recommendedKes * 7000) / 10000);
});

test("up to eight seats can be priced; nine cannot", () => {
  assert.doesNotThrow(() => seatPriceRange(trip({ seatsOffered: 8 })));
  assert.throws(() => seatPriceRange(trip({ seatsOffered: 9 })), (e: unknown) => e instanceof FareError);
});

test("judging a price against the range", () => {
  const range = { floorKes: 560, recommendedKes: 800, capKes: 920 };
  assert.equal(judgePrice(40, range), "below_floor");
  assert.equal(judgePrice(559, range), "below_floor");
  assert.equal(judgePrice(560, range), "lower");
  assert.equal(judgePrice(799, range), "lower");
  assert.equal(judgePrice(800, range), "recommended");
  assert.equal(judgePrice(801, range), "higher");
  assert.equal(judgePrice(920, range), "higher");
  assert.equal(judgePrice(921, range), "above_cap");
  assert.equal(judgePrice(0, range), "invalid");
  assert.equal(judgePrice(Number.NaN, range), "invalid");
});

test("what a driver recovers at KES 800 with 4 seats and a KES 4,000 trip", () => {
  const out = fillOutcomes(800, 4, 4000, cfg());
  assert.deepEqual(out.map((o) => o.recoveredKes), [800, 1600, 2400, 3200]);
  assert.deepEqual(out.map((o) => o.shareOfCostPct), [20, 40, 60, 80]);
  assert.ok(out.every((o) => o.passengerPaysKes === 896));
});

test("at KES 1,000 a full car covers the whole trip cost", () => {
  const out = fillOutcomes(1000, 4, 4000, cfg());
  assert.deepEqual(out.map((o) => o.shareOfCostPct), [25, 50, 75, 100]);
});

test("when the fee is deducted, the driver recovers less and the passenger pays the seat price", () => {
  const out = fillOutcomes(800, 2, 4000, cfg({ feeMode: "deducted" }));
  assert.deepEqual(out.map((o) => o.recoveredKes), [704, 1408]);
  assert.ok(out.every((o) => o.passengerPaysKes === 800));
});

test("the floor percentage comes from the platform setting, and stays within 0 to 100", () => {
  assert.equal(fareConfigFromSettings({}).floorBps, 7000);
  assert.equal(fareConfigFromSettings({ fare_floor_percent: 60 }).floorBps, 6000);
  assert.equal(fareConfigFromSettings({ fare_floor_percent: 150 }).floorBps, 10000);
  assert.equal(fareConfigFromSettings({ fare_floor_percent: -5 }).floorBps, 0);
});
