// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isEmptyDraft, isOwnDraft, putNearTownFirst, sameTown, type DraftCore } from "./publish-draft.ts";

const blank: DraftCore = { from: "", to: "", date: "", time: "", seats: null, price: "" };

test("a draft with nothing chosen is empty", () => {
  assert.equal(isEmptyDraft(blank), true);
  assert.equal(isEmptyDraft(blank, { step: 0, maxStep: 0 }), true);
});

test("a draft with only a departure town is not empty", () => {
  assert.equal(isEmptyDraft({ ...blank, from: "Nanyuki" }), false);
});

test("whitespace alone does not count as an answer", () => {
  assert.equal(isEmptyDraft({ ...blank, from: "   ", price: " " }), true);
});

test("each answer on its own makes the draft non-empty", () => {
  assert.equal(isEmptyDraft({ ...blank, to: "Nairobi" }), false);
  assert.equal(isEmptyDraft({ ...blank, date: "2026-12-01" }), false);
  assert.equal(isEmptyDraft({ ...blank, time: "07:30" }), false);
  assert.equal(isEmptyDraft({ ...blank, seats: 3 }), false);
  assert.equal(isEmptyDraft({ ...blank, price: "800" }), false);
});

test("having moved past step one keeps the draft, even if answers were cleared", () => {
  assert.equal(isEmptyDraft(blank, { step: 3 }), false);
  assert.equal(isEmptyDraft(blank, { maxStep: 2 }), false);
});

test("a saved draft is restored only for the account that made it", () => {
  assert.equal(isOwnDraft("user-1", "user-1"), true);
  assert.equal(isOwnDraft("user-1", "user-2"), false);
});

test("a saved draft with no owner is not restored", () => {
  assert.equal(isOwnDraft(undefined, "user-1"), false);
  assert.equal(isOwnDraft(null, "user-1"), false);
  assert.equal(isOwnDraft("", "user-1"), false);
});

test("no draft is restored when the account is unknown", () => {
  assert.equal(isOwnDraft("", ""), false);
  assert.equal(isOwnDraft(undefined, ""), false);
});

test("town names match ignoring case and spacing, and empty never matches", () => {
  assert.equal(sameTown("Nanyuki", " nanyuki "), true);
  assert.equal(sameTown("Nanyuki", "Nairobi"), false);
  assert.equal(sameTown("", ""), false);
});

const T = (name: string) => ({ name });

test("the near-you town goes first and is not listed twice", () => {
  const list = [T("Nairobi"), T("Nakuru"), T("Nanyuki"), T("Thika")];
  const out = putNearTownFirst(list, T("Nanyuki"), "", 6);
  assert.deepEqual(out.map((t) => t.name), ["Nanyuki", "Nairobi", "Nakuru", "Thika"]);
});

test("the near-you town is added when the list did not include it", () => {
  const out = putNearTownFirst([T("Nairobi"), T("Nakuru")], T("Meru"), "", 6);
  assert.deepEqual(out.map((t) => t.name), ["Meru", "Nairobi", "Nakuru"]);
});

test("the near-you town is left out when it is the destination already chosen", () => {
  const out = putNearTownFirst([T("Nairobi"), T("Nanyuki")], T("Nanyuki"), "nanyuki", 6);
  assert.deepEqual(out.map((t) => t.name), ["Nairobi"]);
});

test("the list is cut to the limit after the near-you town is placed first", () => {
  const list = [T("A"), T("B"), T("C"), T("D")];
  const out = putNearTownFirst(list, T("Z"), "", 3);
  assert.deepEqual(out.map((t) => t.name), ["Z", "A", "B"]);
});

test("with no near-you town the list is only cut to the limit", () => {
  const list = [T("A"), T("B"), T("C")];
  assert.deepEqual(putNearTownFirst(list, null, "", 2).map((t) => t.name), ["A", "B"]);
});
