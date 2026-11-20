// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLEARED_THRESHOLD, alertStatus, clearedVotesLeft } from "./alert-status.ts";

const votes = (confirms_count: number, cleared_count: number) => ({ confirms_count, cleared_count });

test("three Cleared votes close an alert", () => {
  assert.equal(CLEARED_THRESHOLD, 3);
});

test("an alert nobody has voted on is unconfirmed", () => {
  assert.equal(alertStatus(votes(0, 0)), "unconfirmed");
});

test("one Still there makes it active", () => {
  assert.equal(alertStatus(votes(1, 0)), "active");
  assert.equal(alertStatus(votes(9, 2)), "active");
});

test("Cleared votes alone do not close it before the threshold", () => {
  assert.equal(alertStatus(votes(0, 1)), "unconfirmed");
  assert.equal(alertStatus(votes(0, 2)), "unconfirmed");
});

test("the threshold closes it, however many people said Still there", () => {
  assert.equal(alertStatus(votes(0, 3)), "cleared");
  assert.equal(alertStatus(votes(9, 3)), "cleared");
  assert.equal(alertStatus(votes(0, 40)), "cleared");
});

test("one person taking back their Cleared vote reopens a closed alert", () => {
  assert.equal(alertStatus(votes(2, 3)), "cleared");
  assert.equal(alertStatus(votes(2, 2)), "active");
});

test("votes left counts down to zero and stays there", () => {
  assert.equal(clearedVotesLeft({ cleared_count: 0 }), 3);
  assert.equal(clearedVotesLeft({ cleared_count: 1 }), 2);
  assert.equal(clearedVotesLeft({ cleared_count: 2 }), 1);
  assert.equal(clearedVotesLeft({ cleared_count: 3 }), 0);
  assert.equal(clearedVotesLeft({ cleared_count: 7 }), 0);
});

test("votes left agrees with the status", () => {
  for (let cleared = 0; cleared <= 6; cleared++) {
    const closed = alertStatus(votes(0, cleared)) === "cleared";
    assert.equal(clearedVotesLeft({ cleared_count: cleared }) === 0, closed);
  }
});
