// Run with:  npx tsx --test fare.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingAmounts,
  fareConfigFromSettings,
  DEFAULT_FARE_CONFIG,
  DEFAULT_VEHICLE_CLASSES,
  FareError,
  mulBps,
  nairobiDate,
  previewFuelChange,
  quoteSeat,
  resolveFuelPrice,
  splitFee,
  type FareConfig,
  type FuelPriceRow,
} from './fare.ts';


// EPRA maximum pump prices, Nairobi. Source: epra.go.ke/pump-prices
const FUEL: FuelPriceRow[] = [
  { fuelType: 'petrol', region: 'nairobi', priceKes: 214.03, effectiveFrom: '2026-09-15', effectiveTo: '2026-10-14' },
  { fuelType: 'petrol', region: 'nairobi', priceKes: 226.96, effectiveFrom: '2026-10-15', effectiveTo: '2026-11-14' },
  { fuelType: 'diesel', region: 'nairobi', priceKes: 227.76, effectiveFrom: '2026-10-15', effectiveTo: '2026-11-14' },
  { fuelType: 'petrol', region: 'mombasa', priceKes: 223.81, effectiveFrom: '2026-10-15', effectiveTo: '2026-11-14' },
];
const NOW = new Date('2026-11-12T10:00:00Z');
const sedan = DEFAULT_VEHICLE_CLASSES.sedan;
const cfg = (over: Partial<FareConfig> = {}): FareConfig => ({ ...DEFAULT_FARE_CONFIG, ...over });

// ───────────────────────────── platform fee ─────────────────────────────

test('12% fee: KES 1,200 fare gives KES 144 fee and KES 1,056 payout (deducted mode)', () => {
  const s = splitFee(1200, cfg({ feeMode: 'deducted' }));
  assert.equal(s.platformFeeKes, 144);
  assert.equal(s.driverPayoutKes, 1056);
  assert.equal(s.passengerTotalKes, 1200);
});

test('on_top mode: passenger pays fare plus fee, driver keeps the full fare', () => {
  const s = splitFee(1200, cfg({ feeMode: 'on_top' }));
  assert.equal(s.platformFeeKes, 144);
  assert.equal(s.passengerTotalKes, 1344);
  assert.equal(s.driverPayoutKes, 1200);
});

test('fee is split into net and VAT parts that add back up', () => {
  const s = splitFee(1200, cfg());
  assert.equal(s.platformFeeNetKes, 124);
  assert.equal(s.platformFeeVatKes, 20);
  assert.equal(s.platformFeeNetKes + s.platformFeeVatKes, s.platformFeeKes);
});

test('mulBps rounds half up and handles zero', () => {
  assert.equal(mulBps(1200, 1200), 144);
  assert.equal(mulBps(105, 1200), 13); // 12.6
  assert.equal(mulBps(104, 1200), 12); // 12.48
  assert.equal(mulBps(1000, 0), 0);
});

test('minimum fee applies to short rides', () => {
  assert.equal(splitFee(150, cfg({ minFeeKes: 25 })).platformFeeKes, 25);
  assert.equal(splitFee(150, cfg({ minFeeKes: 0 })).platformFeeKes, 18);
});

test('deducted mode never takes more than the seat price', () => {
  const s = splitFee(20, cfg({ feeMode: 'deducted', minFeeKes: 50 }));
  assert.equal(s.platformFeeKes, 20);
  assert.equal(s.driverPayoutKes, 0);
});

test('money always balances in both modes (randomised)', () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < 2000; i++) {
    const price = 10 + Math.floor(rnd() * 8000);
    for (const feeMode of ['on_top', 'deducted'] as const) {
      const s = splitFee(price, cfg({ feeMode, feeBps: Math.floor(rnd() * 2500), minFeeKes: Math.floor(rnd() * 40) }));
      assert.equal(s.driverPayoutKes + s.platformFeeKes, s.passengerTotalKes, `${feeMode} ${price}`);
      assert.ok(s.driverPayoutKes >= 0);
      assert.ok(s.platformFeeNetKes + s.platformFeeVatKes === s.platformFeeKes);
    }
  }
});

// ───────────────────────────── fuel price lookup ─────────────────────────────

test('picks the EPRA period that covers today', () => {
  const f = resolveFuelPrice(FUEL, 'petrol', 'nairobi', NOW);
  assert.equal(f.priceKes, 226.96);
  assert.equal(f.stale, false);
});

test('period boundaries are inclusive and evaluated in Nairobi time', () => {
  // 14 Nov 20:59 UTC is 23:59 in Nairobi: still the old period
  assert.equal(nairobiDate(new Date('2026-11-14T20:59:00Z')), '2026-11-14');
  // 14 Nov 21:00 UTC is midnight in Nairobi, so the 15th has started
  assert.equal(nairobiDate(new Date('2026-11-14T21:00:00Z')), '2026-11-15');

  const lastDay = resolveFuelPrice(FUEL, 'petrol', 'nairobi', new Date('2026-11-14T20:59:00Z'));
  assert.equal(lastDay.priceKes, 226.96);
  assert.equal(lastDay.stale, false);
});

test('after a period ends with no new prices entered, last known price is used and flagged stale', () => {
  const f = resolveFuelPrice(FUEL, 'petrol', 'nairobi', new Date('2026-11-15T09:00:00Z'));
  assert.equal(f.priceKes, 226.96);
  assert.equal(f.stale, true);
});

test('falls back to Nairobi when a town has no price', () => {
  const f = resolveFuelPrice(FUEL, 'petrol', 'kisumu', NOW);
  assert.equal(f.region, 'nairobi');
  assert.equal(resolveFuelPrice(FUEL, 'petrol', 'Mombasa ', NOW).priceKes, 223.81);
});

test('diesel and petrol are separate', () => {
  assert.equal(resolveFuelPrice(FUEL, 'diesel', 'nairobi', NOW).priceKes, 227.76);
});

test('no price on file is an error, not a silent zero', () => {
  assert.throws(() => resolveFuelPrice([], 'petrol', 'nairobi', NOW), (e: any) => e instanceof FareError && e.code === 'NO_FUEL_PRICE');
});

// ───────────────────────────── seat quote ─────────────────────────────

const fuelNow = () => resolveFuelPrice(FUEL, 'petrol', 'nairobi', NOW);
const nakuru = (over = {}) => ({
  distanceKm: 157, vehicle: sedan, seatsOffered: 3, fuel: fuelNow(), config: cfg(), now: NOW, ...over,
});

test('Nairobi to Nakuru, sedan, 3 seats: worked example', () => {
  // fuel 157 / 13 * 226.96 = 2740.98, wear 157 * 3 = 471, total 3211.98, split 4 ways = 802.99
  const q = quoteSeat(nakuru());
  assert.equal(Math.round(q.costShare.tripCostKes), 3212);
  assert.equal(q.costShare.shares, 4);
  assert.equal(q.suggestedKes, 800);
  assert.equal(q.capKes, 920); // floor(802.99 * 1.15 = 923.4) to the nearest 10 below
  assert.equal(q.platformFeeKes, 96);
  assert.equal(q.passengerTotalKes, 896);
  assert.equal(q.driverPayoutKes, 800);
});

test('deducted mode leaves the driver short of their cost share: the reason on_top is the default', () => {
  const q = quoteSeat(nakuru({ config: cfg({ feeMode: 'deducted' }) }));
  assert.equal(q.driverPayoutKes, 704);
  assert.ok(q.driverPayoutKes < q.costShare.perSeatRawKes);
});

test('a higher fuel price raises the suggested price, and the quote keeps its own snapshot', () => {
  const before = quoteSeat(nakuru());
  const higher = quoteSeat(nakuru({ fuel: { ...fuelNow(), priceKes: 240 } }));
  assert.ok(higher.suggestedKes > before.suggestedKes);
  // the earlier quote is untouched: later fuel changes never reprice it
  assert.equal(before.snapshot.fuelPriceKes, 226.96);
  assert.equal(before.suggestedKes, 800);
  assert.equal(before.snapshot.modelVersion, 'fare-v1');
});

test('previewFuelChange shows the impact of a proposed EPRA price', () => {
  const p = previewFuelChange({ distanceKm: 157, vehicle: sedan, seatsOffered: 3, fuel: fuelNow(), config: cfg(), now: NOW }, 240);
  assert.equal(p.before.suggestedKes, 800);
  assert.equal(p.after.suggestedKes, 840);
  assert.equal(p.deltaKes, 40);
  assert.equal(p.deltaPct, 5);
});

test('more seats means a lower price per seat, and tolls are shared too', () => {
  const two = quoteSeat(nakuru({ seatsOffered: 2 })).suggestedKes;
  const three = quoteSeat(nakuru({ seatsOffered: 3 })).suggestedKes;
  assert.ok(two > three);
  const withToll = quoteSeat(nakuru({ tollsKes: 400 }));
  assert.equal(withToll.costShare.tripCostKes - quoteSeat(nakuru()).costShare.tripCostKes, 400);
});

test('thirstier vehicle costs more', () => {
  const hatch = quoteSeat(nakuru({ vehicle: DEFAULT_VEHICLE_CLASSES.hatch })).suggestedKes;
  const suv = quoteSeat(nakuru({ vehicle: DEFAULT_VEHICLE_CLASSES.suv_petrol })).suggestedKes;
  assert.ok(hatch < 800 && 800 < suv);
});

test('very short trips are lifted to the minimum seat price', () => {
  const q = quoteSeat(nakuru({ distanceKm: 4 }));
  assert.equal(q.suggestedKes, 100);
  assert.ok(q.capKes >= q.suggestedKes);
});

test('driver can adjust within the band; the price snaps to the rounding step', () => {
  const q = quoteSeat(nakuru({ driverPriceKes: 853 }));
  assert.equal(q.seatPriceKes, 850);
  assert.equal(q.platformFeeKes, 102);
});

test('driver cannot go above the cap or below the floor', () => {
  assert.throws(() => quoteSeat(nakuru({ driverPriceKes: 1500 })), (e: any) => e.code === 'PRICE_ABOVE_CAP' && /920/.test(e.message));
  assert.throws(() => quoteSeat(nakuru({ driverPriceKes: 40 })), (e: any) => e.code === 'PRICE_BELOW_FLOOR');
  assert.equal(quoteSeat(nakuru({ driverPriceKes: 920 })).seatPriceKes, 920);
});

test('bad input is rejected', () => {
  for (const over of [{ distanceKm: 0 }, { distanceKm: NaN }, { seatsOffered: 0 }, { seatsOffered: 9 }, { seatsOffered: 2.5 }, { tollsKes: -1 }]) {
    assert.throws(() => quoteSeat(nakuru(over)), (e: any) => e instanceof FareError && e.code === 'BAD_INPUT');
  }
  assert.throws(() => quoteSeat(nakuru({ config: cfg({ feeBps: 12 * 100 + 0.5 }) })), FareError);
  assert.throws(() => quoteSeat(nakuru({ config: cfg({ feeBps: 9000 }) })), FareError);
  assert.throws(() => quoteSeat(nakuru({ config: cfg({ capMultiplierBps: 9000 }) })), FareError);
});

test('stale fuel price is carried onto the quote for the admin to see', () => {
  const stale = resolveFuelPrice(FUEL, 'petrol', 'nairobi', new Date('2026-11-16T09:00:00Z'));
  assert.equal(quoteSeat(nakuru({ fuel: stale })).snapshot.fuelPriceStale, true);
});

// ───────────────────── settings mapping and booking amounts ─────────────────────


test('settings rows map onto the fare config', () => {
  const c = fareConfigFromSettings({
    platform_fee_percent: 12, fare_margin_percent: 15, fee_on_top: 1, fee_vat_percent: 16,
    fee_min_kes: 20, fare_wear_per_km: 3, fare_min_seat_price: 100, fare_round_step: 10,
  });
  assert.deepEqual(c, { ...DEFAULT_FARE_CONFIG, minFeeKes: 20 });
  assert.equal(fareConfigFromSettings({ fee_on_top: 0 }).feeMode, 'deducted');
  assert.equal(fareConfigFromSettings({ platform_fee_percent: 12.5 }).feeBps, 1250);
  assert.deepEqual(fareConfigFromSettings({}), DEFAULT_FARE_CONFIG);
});

test('booking on top: 2 seats at KES 800 -> subtotal 1600, fee 192, passenger pays 1792, driver 1600', () => {
  const b = bookingAmounts(800, 2, cfg());
  assert.equal(b.subtotalKes, 1600);
  assert.equal(b.serviceFeeKes, 192);
  assert.equal(b.totalKes, 1792);
  assert.equal(b.driverEarningKes, 1600);
  assert.equal(b.platformFeeKes, 192);
});

test('booking deducted: passenger pays the subtotal, fee comes out of the driver', () => {
  const b = bookingAmounts(800, 2, cfg({ feeMode: 'deducted' }));
  assert.equal(b.totalKes, 1600);
  assert.equal(b.serviceFeeKes, 0);
  assert.equal(b.platformFeeKes, 192);
  assert.equal(b.driverEarningKes, 1408);
});

test('booking amounts always balance, and the on-top fee can be recovered from the total', () => {
  for (const feeMode of ['on_top', 'deducted'] as const) {
    for (let price = 100; price <= 3000; price += 10) {
      for (let seats = 1; seats <= 4; seats++) {
        const c = cfg({ feeMode, minFeeKes: 20 });
        const b = bookingAmounts(price, seats, c);
        assert.equal(b.driverEarningKes + b.platformFeeKes, feeMode === 'on_top' ? b.totalKes : b.subtotalKes);
        if (feeMode === 'on_top') {
          // the fee the edge functions would derive from the paid total alone
          const derived = Math.round((b.totalKes * 12) / 112);
          if (b.platformFeeKes === mulBps(b.subtotalKes, 1200)) assert.equal(derived, b.serviceFeeKes, `${price} x ${seats}`);
        }
      }
    }
  }
});

test('booking amounts reject bad input', () => {
  assert.throws(() => bookingAmounts(800, 0, cfg()), FareError);
  assert.throws(() => bookingAmounts(0, 1, cfg()), FareError);
  assert.throws(() => bookingAmounts(80.5, 1, cfg()), FareError);
});
