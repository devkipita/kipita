// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEscrowSplit, splitPaidTotal } from "./escrow.ts";

test("fee on top: total 896 with a stored fee of 96 leaves the driver the full 800", () => {
  assert.deepEqual(splitPaidTotal(896, 96), { fee: 96, driverEarning: 800, onTop: true });
});

test("a stored fee of 0 is still on top, not a missing fee", () => {
  assert.deepEqual(splitPaidTotal(800, 0), { fee: 0, driverEarning: 800, onTop: true });
});

test("older bookings (no stored fee) keep the deducted behaviour", () => {
  assert.deepEqual(splitPaidTotal(1200, null), { fee: 144, driverEarning: 1056, onTop: false });
  assert.deepEqual(splitPaidTotal(1200, undefined), { fee: 144, driverEarning: 1056, onTop: false });
  assert.deepEqual(splitPaidTotal(1200, null), { ...computeEscrowSplit(1200), onTop: false });
});

test("the percent argument only matters for the deducted path", () => {
  assert.equal(splitPaidTotal(1000, null, 10).fee, 100);
  assert.equal(splitPaidTotal(1000, 50, 10).fee, 50);
});
