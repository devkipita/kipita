import assert from "node:assert/strict";
import { test } from "node:test";
import { dateFromISO, departureInstant, hasDeparted, kenyaClock, kenyaToday } from "./kenya-time.ts";

// These tests must pass whatever time zone the machine is in. Run them with TZ=Africa/Johannesburg,
// TZ=America/New_York and TZ=Pacific/Auckland: nothing here may read the local clock fields.

test("the clock in Kenya is three hours ahead of UTC", () => {
  const c = kenyaClock(new Date("2026-11-20T11:35:35Z"));
  assert.deepEqual(c, { date: "2026-11-20", time: "14:35", minutes: 14 * 60 + 35 });
});

test("the Kenya date rolls over at 21:00 UTC", () => {
  assert.equal(kenyaClock(new Date("2026-11-19T20:59:00Z")).date, "2026-11-19");
  assert.deepEqual(kenyaClock(new Date("2026-11-19T21:00:00Z")), { date: "2026-11-20", time: "00:00", minutes: 0 });
  assert.equal(kenyaClock(new Date("2026-11-19T21:30:00Z")).time, "00:30");
});

test("today, tomorrow and yesterday follow the Kenya date across month and year ends", () => {
  const at = new Date("2026-11-30T22:00:00Z"); // 01:00 on 1 Dec in Kenya
  assert.equal(kenyaToday(0, at), "2026-12-01");
  assert.equal(kenyaToday(-1, at), "2026-11-30");
  assert.equal(kenyaToday(1, at), "2026-12-02");
  assert.equal(kenyaToday(1, new Date("2026-12-31T10:00:00Z")), "2027-01-01");
});

test("a ride's date and time are Kenya time", () => {
  assert.equal(departureInstant("2026-11-20", "14:00")?.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(departureInstant("2026-11-20", "14:00:00")?.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(departureInstant("2026-11-20", "00:30")?.toISOString(), "2026-11-19T21:30:00.000Z");
  assert.equal(departureInstant("2026-11-20", null)?.toISOString(), "2026-11-19T21:00:00.000Z");
  assert.equal(departureInstant("2026-11-20")?.toISOString(), "2026-11-19T21:00:00.000Z");
});

test("a date or time that is not real gives nothing", () => {
  assert.equal(departureInstant(null, "14:00"), null);
  assert.equal(departureInstant("", "14:00"), null);
  assert.equal(departureInstant("20-11-2026", "14:00"), null);
  assert.equal(departureInstant("2026-02-31", "14:00"), null);
  assert.equal(departureInstant("2026-11-20", "25:00"), null);
  assert.equal(departureInstant("2026-11-20", "12:75"), null);
  assert.equal(departureInstant("2026-11-20", "noon"), null);
});

test("a ride has left once its Kenya departure time has passed", () => {
  // 14:00 in Kenya is 11:00 UTC, which is 13:00 in Cape Town: the case that was wrong before.
  assert.equal(hasDeparted("2026-11-20", "14:00", new Date("2026-11-20T10:59:59Z")), false);
  assert.equal(hasDeparted("2026-11-20", "14:00", new Date("2026-11-20T11:00:00Z")), true);
  assert.equal(hasDeparted("2026-11-20", "14:00", new Date("2026-11-20T11:35:35Z")), true);
  assert.equal(hasDeparted("2026-11-21", "06:00", new Date("2026-11-20T11:35:35Z")), false);
  assert.equal(hasDeparted(null, "14:00"), false);
});

test("it agrees with the database's trip_departs_at", () => {
  // select public.trip_departs_at(date '2026-11-20', time '14:00') = 2026-11-20 11:00:00+00
  assert.equal(departureInstant("2026-11-20", "14:00")?.toISOString(), "2026-11-20T11:00:00.000Z");
});

test("a calendar day becomes a local midnight Date with the same day", () => {
  const d = dateFromISO("2026-11-20");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getDate(), 20);
  assert.equal(d.getHours(), 0);
});
