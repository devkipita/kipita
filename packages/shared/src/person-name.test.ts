// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { shortName } from "./person-name.ts";

test("first name and the first letter of the last name", () => {
  assert.equal(shortName("Olive Mahinda"), "Olive M.");
});

test("a middle name is dropped; the last word gives the initial", () => {
  assert.equal(shortName("Mary Wanjiru Kamau"), "Mary K.");
});

test("a single name stays as it is", () => {
  assert.equal(shortName("Wanjiku"), "Wanjiku");
});

test("the initial is upper case", () => {
  assert.equal(shortName("amina hassan"), "amina H.");
});

test("extra spaces are ignored", () => {
  assert.equal(shortName("  Brian   Otieno  "), "Brian O.");
});

test("an accented or non-Latin initial is kept whole", () => {
  assert.equal(shortName("Zoë Ñungu"), "Zoë Ñ.");
});

test("a missing or blank name gives the fallback", () => {
  assert.equal(shortName(null), "Kipita user");
  assert.equal(shortName(undefined), "Kipita user");
  assert.equal(shortName("   "), "Kipita user");
  assert.equal(shortName("", "Someone"), "Someone");
});

test("the full last name never appears", () => {
  assert.ok(!shortName("Olive Mahinda").includes("Mahinda"));
});
