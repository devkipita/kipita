// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CANCELLATION_CONFIG,
  cancellationConfigFromSettings,
  cancellationRuleLines,
  freeUntil,
  noShowOpensAt,
  quoteCancellation,
  type CancellationConfig,
  type CancellationInput,
} from "./cancellation.ts";

const HOUR = 3_600_000;
const MIN = 60_000;

// 25 Nov 2026, 08:00 in Nairobi (UTC+3).
const DEPARTS = new Date("2026-11-25T05:00:00Z");
const at = (msBeforeDeparture: number) => new Date(DEPARTS.getTime() - msBeforeDeparture);

// KES 800 seat, KES 96 fee: the passenger paid 896.
const base = (over: Partial<CancellationInput> = {}): CancellationInput => ({
  mode: "passenger",
  now: at(20 * HOUR),
  departsAt: DEPARTS,
  held: true,
  paidAt: at(48 * HOUR),
  seatKes: 800,
  feeKes: 96,
  ...over,
});

const cfg = (over: Partial<CancellationConfig> = {}): CancellationConfig => ({ ...DEFAULT_CANCELLATION_CONFIG, ...over });

test("defaults match the agreed rule", () => {
  assert.deepEqual(DEFAULT_CANCELLATION_CONFIG, {
    freeHours: 12,
    graceMinutes: 30,
    latePercent: 50,
    noShowWaitMinutes: 15,
    noShowDisputeHours: 24,
  });
});

test("nothing held: nothing moves, whoever cancels", () => {
  for (const mode of ["passenger", "driver", "no_show"] as const) {
    const q = quoteCancellation(base({ mode, held: false, paidAt: null }));
    assert.equal(q.tier, "nothing_held");
    assert.equal(q.passengerGetsKes + q.driverGetsKes + q.kipitaKeepsKes, 0);
    assert.equal(q.freeUntil, null);
  }
});

test("booked two days ahead: free until 12h before departure, then half back", () => {
  const free = quoteCancellation(base({ now: at(13 * HOUR) }));
  assert.equal(free.tier, "free");
  assert.equal(free.passengerGetsKes, 896);
  assert.equal(free.driverGetsKes, 0);
  assert.equal(free.kipitaKeepsKes, 0);

  const boundary = quoteCancellation(base({ now: at(12 * HOUR) }));
  assert.equal(boundary.tier, "free", "exactly 12h before is still free");

  const late = quoteCancellation(base({ now: at(12 * HOUR - MIN) }));
  assert.equal(late.tier, "late");
  assert.equal(late.passengerGetsKes, 400);
  assert.equal(late.driverGetsKes, 400);
  assert.equal(late.kipitaKeepsKes, 96);
});

test("cancelling 3 hours before the ride, or 1 hour, or just before departure, all give half back", () => {
  for (const hours of [3, 1, 0.1]) {
    const q = quoteCancellation(base({ now: at(hours * HOUR) }));
    assert.equal(q.tier, "late", `${hours}h before`);
    assert.deepEqual([q.passengerGetsKes, q.driverGetsKes, q.kipitaKeepsKes], [400, 400, 96]);
  }
});

test("after the departure time a passenger cancel is still the late tier", () => {
  const q = quoteCancellation(base({ now: new Date(DEPARTS.getTime() + 10 * MIN) }));
  assert.equal(q.tier, "late");
  assert.equal(q.passengerGetsKes, 400);
});

test("booked 20 hours ahead: 8 hours of free cancellation", () => {
  const paidAt = at(20 * HOUR);
  assert.equal(quoteCancellation(base({ paidAt, now: at(13 * HOUR) })).tier, "free");
  assert.equal(quoteCancellation(base({ paidAt, now: at(12 * HOUR) })).tier, "free");
  assert.equal(quoteCancellation(base({ paidAt, now: at(11 * HOUR) })).tier, "late");
});

test("booked 10 hours ahead: only the 30 minute grace period is free", () => {
  const paidAt = at(10 * HOUR);
  const inGrace = quoteCancellation(base({ paidAt, now: new Date(paidAt.getTime() + 30 * MIN) }));
  assert.equal(inGrace.tier, "free");
  assert.equal(inGrace.passengerGetsKes, 896);

  const after = quoteCancellation(base({ paidAt, now: new Date(paidAt.getTime() + 31 * MIN) }));
  assert.equal(after.tier, "late");
});

test("freeUntil is the later of the grace end and the lead cutoff", () => {
  const c = DEFAULT_CANCELLATION_CONFIG;
  assert.equal(freeUntil(DEPARTS, at(48 * HOUR), c).getTime(), at(12 * HOUR).getTime());
  const late = at(10 * HOUR);
  assert.equal(freeUntil(DEPARTS, late, c).getTime(), late.getTime() + 30 * MIN);
});

test("driver cancels: the passenger always gets everything back, and lateness is flagged", () => {
  const early = quoteCancellation(base({ mode: "driver", now: at(30 * HOUR) }));
  assert.equal(early.tier, "driver");
  assert.deepEqual([early.passengerGetsKes, early.driverGetsKes, early.kipitaKeepsKes], [896, 0, 0]);
  assert.equal(early.lateForDriver, false);

  const late = quoteCancellation(base({ mode: "driver", now: at(2 * HOUR) }));
  assert.equal(late.passengerGetsKes, 896);
  assert.equal(late.lateForDriver, true);
});

test("no-show: nothing back, the driver gets the seat price, Kipita keeps its fee", () => {
  const q = quoteCancellation(base({ mode: "no_show", now: new Date(DEPARTS.getTime() + 20 * MIN) }));
  assert.equal(q.tier, "no_show");
  assert.deepEqual([q.passengerGetsKes, q.driverGetsKes, q.kipitaKeepsKes], [0, 800, 96]);
});

test("late tier follows the setting, and the fee is never refunded", () => {
  const none = quoteCancellation(base({ now: at(2 * HOUR) }), cfg({ latePercent: 0 }));
  assert.deepEqual([none.passengerGetsKes, none.driverGetsKes, none.kipitaKeepsKes], [0, 800, 96]);

  const all = quoteCancellation(base({ now: at(2 * HOUR) }), cfg({ latePercent: 100 }));
  assert.deepEqual([all.passengerGetsKes, all.driverGetsKes, all.kipitaKeepsKes], [800, 0, 96]);
});

test("free window follows the settings", () => {
  const c = cfg({ freeHours: 24 });
  assert.equal(quoteCancellation(base({ now: at(25 * HOUR) }), c).tier, "free");
  assert.equal(quoteCancellation(base({ now: at(23 * HOUR) }), c).tier, "late");
  const noGrace = cfg({ freeHours: 12, graceMinutes: 0 });
  const paidAt = at(5 * HOUR);
  assert.equal(quoteCancellation(base({ paidAt, now: new Date(paidAt.getTime() + MIN) }), noGrace).tier, "late");
});

test("every outcome adds up to what the passenger paid", () => {
  for (const seatKes of [10, 150, 805, 1610, 3, 5]) {
    for (const feeKes of [0, 1, 96, 193]) {
      for (const mode of ["passenger", "driver", "no_show"] as const) {
        for (const hours of [40, 12, 11.9, 3, 0.5, -1]) {
          for (const latePercent of [0, 33, 50, 100]) {
            const q = quoteCancellation(base({ mode, seatKes, feeKes, now: at(hours * HOUR) }), cfg({ latePercent }));
            assert.equal(
              q.passengerGetsKes + q.driverGetsKes + q.kipitaKeepsKes,
              seatKes + feeKes,
              `${mode} seat ${seatKes} fee ${feeKes} ${hours}h ${latePercent}%`,
            );
            assert.ok(q.passengerGetsKes >= 0 && q.driverGetsKes >= 0 && q.kipitaKeepsKes >= 0);
          }
        }
      }
    }
  }
});

test("noShowOpensAt is the departure time plus the wait", () => {
  assert.equal(noShowOpensAt(DEPARTS, DEFAULT_CANCELLATION_CONFIG).getTime(), DEPARTS.getTime() + 15 * MIN);
});

test("settings: missing, bad and out-of-range values fall back to the defaults", () => {
  assert.deepEqual(cancellationConfigFromSettings({}), DEFAULT_CANCELLATION_CONFIG);
  const c = cancellationConfigFromSettings({
    cancel_free_hours: 24,
    cancel_grace_minutes: "45",
    cancel_late_refund_percent: 150,
    no_show_wait_minutes: "soon",
    no_show_dispute_hours: 0,
  });
  assert.equal(c.freeHours, 24);
  assert.equal(c.graceMinutes, 45);
  assert.equal(c.latePercent, 50, "150% is out of range");
  assert.equal(c.noShowWaitMinutes, 15, "not a number");
  assert.equal(c.noShowDisputeHours, 24, "a dispute window must be at least 1 hour");
});

test("rule text reads the settings", () => {
  const lines = cancellationRuleLines(DEFAULT_CANCELLATION_CONFIG);
  assert.equal(lines.length, 4);
  assert.match(lines[0], /more than 12 hours before the ride, or within 30 minutes of paying/);
  assert.match(lines[1], /50% of the seat price back/);
  assert.match(lines[2], /don't turn up, nothing is refunded/);
  assert.match(lines[3], /driver cancels, you always get everything back/);

  const custom = cancellationRuleLines(cfg({ freeHours: 1, graceMinutes: 60, latePercent: 0 }));
  assert.match(custom[0], /more than 1 hour before the ride, or within 1 hour of paying/);
  assert.match(custom[1], /seat price goes to the driver/);
});
