// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isApproxArrival } from "./arrival.ts";

const at = "2026-11-27T10:00:00Z";

test("a fresh car point is not approximate", () => {
  assert.equal(isApproxArrival(at, "2026-11-27T09:59:30Z"), false);
});

test("a point more than three minutes old is approximate", () => {
  assert.equal(isApproxArrival(at, "2026-11-27T09:56:00Z"), true);
});

test("exactly three minutes is still fine", () => {
  assert.equal(isApproxArrival(at, "2026-11-27T09:57:00Z"), false);
});

test("nothing to compare means not approximate", () => {
  assert.equal(isApproxArrival(null, "2026-11-27T09:56:00Z"), false);
  assert.equal(isApproxArrival(at, null), false);
  assert.equal(isApproxArrival(at, "not a date"), false);
});
