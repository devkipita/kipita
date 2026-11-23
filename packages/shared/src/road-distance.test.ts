// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, resolveTown, roadDistanceKm } from "./towns.ts";

test("a known route uses its road distance", () => {
  assert.equal(roadDistanceKm("Nairobi", "Nanyuki"), 190);
  assert.equal(roadDistanceKm("Nairobi", "Mombasa"), 485);
  assert.equal(roadDistanceKm("Nairobi", "Nyeri"), 150);
});

test("a known route is the same in both directions", () => {
  assert.equal(roadDistanceKm("Nanyuki", "Nairobi"), 190);
  assert.equal(roadDistanceKm("Mombasa", "Nairobi"), 485);
});

test("town names are matched without regard to case", () => {
  assert.equal(roadDistanceKm("nairobi", "NAKURU"), 160);
});

test("Nairobi CBD shares the Nairobi figures", () => {
  assert.equal(roadDistanceKm("Nairobi CBD", "Eldoret"), 325);
  assert.equal(roadDistanceKm("Kisumu", "Nairobi CBD"), 340);
});

test("a route that is not in the table is the straight line times 1.2", () => {
  const a = resolveTown("Thika");
  const b = resolveTown("Nakuru");
  assert.ok(a && b);
  const expected = Math.round(haversineKm(a, b) * 1.2 * 10) / 10;
  assert.equal(roadDistanceKm("Thika", "Nakuru"), expected);
});

test("Nairobi suburbs are not given the Nairobi figures", () => {
  const km = roadDistanceKm("Karen", "Nanyuki");
  assert.ok(km !== null && km !== 190);
});

test("the same town, or an unknown one, has no distance", () => {
  assert.equal(roadDistanceKm("Nairobi", "Nairobi"), null);
  assert.equal(roadDistanceKm("Nairobi", "Atlantis"), null);
  assert.equal(roadDistanceKm("", "Nairobi"), null);
});
