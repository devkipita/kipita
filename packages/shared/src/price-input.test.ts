// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { wholeShillings } from "./price-input.ts";

test("plain digits are kept", () => {
  assert.equal(wholeShillings("900"), "900");
});

test("thousands separators and spaces are dropped", () => {
  assert.equal(wholeShillings("1,030"), "1030");
  assert.equal(wholeShillings(" 1 030 "), "1030");
});

test("a decimal point ends the amount instead of joining the digits", () => {
  assert.equal(wholeShillings("900.5"), "900");
  assert.equal(wholeShillings("900.50"), "900");
  assert.equal(wholeShillings("900."), "900");
});

test("a leading decimal point leaves nothing", () => {
  assert.equal(wholeShillings(".5"), "");
});

test("leading zeros are removed", () => {
  assert.equal(wholeShillings("0900"), "900");
  assert.equal(wholeShillings("000"), "");
});

test("letters and signs are dropped", () => {
  assert.equal(wholeShillings("KES 900"), "900");
  assert.equal(wholeShillings("-500"), "500");
  assert.equal(wholeShillings("abc"), "");
});

test("the length is capped at six digits by default", () => {
  assert.equal(wholeShillings("12345678"), "123456");
});

test("the cap can be changed", () => {
  assert.equal(wholeShillings("12345678", 4), "1234");
});

test("empty input is empty", () => {
  assert.equal(wholeShillings(""), "");
});
