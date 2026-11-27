// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPayoutNames, compareNames, statementRecipient } from "./name-match.ts";
import type { KipitaRecord, StatementLine } from "./reconcile.ts";

// ── reading the name off a statement line ───────────────────────────────────

test("recipient: number and name after 'to'", () => {
  assert.deepEqual(statementRecipient("Business Payment to 254712345678 - John Doe"), { phone: "254712345678", name: "John Doe" });
  assert.deepEqual(statementRecipient("  Salary   Payment to 254712345678 – Mercy Chebet "), { phone: "254712345678", name: "Mercy Chebet" });
});

test("recipient: a number with hidden digits is read as it is printed", () => {
  assert.deepEqual(statementRecipient("Business Payment to 2547*****678 - JOHN DOE"), { phone: "2547*****678", name: "JOHN DOE" });
  assert.deepEqual(statementRecipient("Business Payment to +254712345678: Aisha Omar"), { phone: "+254712345678", name: "Aisha Omar" });
});

test("recipient: no name when the line has none, or when the number is too short to be a phone", () => {
  assert.deepEqual(statementRecipient("Business Payment to 254712345678"), { phone: null, name: null });
  assert.deepEqual(statementRecipient("Business Payment to 254712345678 - "), { phone: null, name: null });
  assert.deepEqual(statementRecipient("Pay Bill from 4015501 - Some Shop"), { phone: null, name: null });
  assert.deepEqual(statementRecipient("Charge for B2C payment"), { phone: null, name: null });
  assert.deepEqual(statementRecipient(""), { phone: null, name: null });
});

// ── comparing two names ─────────────────────────────────────────────────────

const result = (a: string | null, b: string | null) => compareNames(a, b).result;

test("names: same words in any order, any case, match", () => {
  assert.equal(result("John Doe", "JOHN DOE"), "match");
  assert.equal(result("John Doe", "Doe John"), "match");
  assert.equal(result("  john   doe ", "John Doe"), "match");
});

test("names: M-Pesa shows two names, the account has three (or the other way): match", () => {
  assert.equal(result("John Kamau Doe", "John Doe"), "match");
  assert.equal(result("John Doe", "John Kamau Doe"), "match");
});

test("names: apostrophes, accents and titles do not matter", () => {
  assert.equal(result("Grace Mwang'i", "GRACE MWANGI"), "match");
  assert.equal(result("José Kamau", "Jose Kamau"), "match");
  // an accent in the middle of a word must not split the word in two
  assert.equal(result("Kĩambu Njeri", "KIAMBU NJERI"), "match");
  assert.equal(result("Mr John Doe", "John Doe"), "match");
});

test("names: one name only is never a match", () => {
  assert.deepEqual(compareNames("John Doe", "JOHN"), { result: "partial", why: "Only one name to compare" });
  assert.deepEqual(compareNames("Madonna", "Madonna"), { result: "partial", why: "Only one name to compare" });
  assert.equal(result("John", "John Doe"), "partial");
  assert.equal(result("Ali Ali", "Ali"), "partial");
});

test("names: one of two names in common is partial", () => {
  assert.deepEqual(compareNames("John Doe", "John Smith"), { result: "partial", why: "Only part of the name matches" });
  assert.equal(result("John Kamau Doe", "John Peter Doe"), "partial");
});

test("names: a letter out, an initial or a hidden letter is partial, never a match", () => {
  assert.deepEqual(compareNames("John Kamau", "John Kamaw"), { result: "partial", why: "Spelling or initials differ" });
  assert.deepEqual(compareNames("Jane Doe", "Jane D"), { result: "partial", why: "Spelling or initials differ" });
  assert.deepEqual(compareNames("John Doe", "Jo*n Doe"), { result: "partial", why: "Spelling or initials differ" });
  assert.deepEqual(compareNames("John Doe", "J*** Doe"), { result: "partial", why: "Spelling or initials differ" });
});

test("names: a hidden-letter pattern must fit, and all stars fit nothing", () => {
  assert.equal(result("John Doe", "Ja*n Smith"), "different");
  assert.equal(result("John Doe", "*** ***"), "different");
});

test("names: nothing in common is different", () => {
  assert.deepEqual(compareNames("John Doe", "Peter Otieno"), { result: "different", why: "No name in common" });
  assert.equal(result("Alice Wanjiru", "Brian Otieno"), "different");
  // a surname one letter out is a spelling to look at, not a stranger
  assert.equal(result("Alice Wanjiru", "Al Wanjiku"), "partial");
});

test("names: an empty name is unknown, not different", () => {
  assert.equal(result("John Doe", null), "unknown");
  assert.equal(result(null, "John Doe"), "unknown");
  assert.equal(result("", "  "), "unknown");
  assert.equal(result("Mr", "Dr"), "unknown");
});

// ── over a statement ────────────────────────────────────────────────────────

let n = 0;
function pair(kind: KipitaRecord["kind"], who: string | null, details: string) {
  n += 1;
  const receipt = `RK${String(n).padStart(8, "0")}`;
  const line: StatementLine = { row: n + 1, receipt, direction: kind === "payout" ? "out" : "in", amount: 1000, at: null, details };
  const record: KipitaRecord = { kind, id: `id${n}`, receipt, amount: 1000, at: null, who, ref: null };
  return { line, record };
}

test("statement: each payout is checked against the account name; payments are left out", () => {
  const check = checkPayoutNames([
    pair("payout", "Mercy Chebet", "Business Payment to 254711111111 - MERCY CHEBET"),
    pair("payout", "James Mwangi", "Business Payment to 254722222222 - Peter Otieno"),
    pair("payment", "Aisha Omar", "Pay Bill from 2547*****333 - AISHA OMAR"),
  ]);
  assert.equal(check.rows.length, 2);
  assert.equal(check.checked, 2);
  assert.equal(check.matched, 1);
  assert.equal(check.noNamesOnStatement, false);
  assert.equal(check.toCheck.length, 1);
  assert.equal(check.toCheck[0].kipitaName, "James Mwangi");
  assert.equal(check.toCheck[0].statementName, "Peter Otieno");
  assert.equal(check.toCheck[0].statementPhone, "254722222222");
  assert.equal(check.toCheck[0].result, "different");
});

test("statement: when no payout line shows a name, nothing is flagged and that is said once", () => {
  const check = checkPayoutNames([
    pair("payout", "Mercy Chebet", "Business Payment to 254711111111"),
    pair("payout", "James Mwangi", "Business Payment"),
  ]);
  assert.equal(check.rows.length, 2);
  assert.equal(check.checked, 0);
  assert.equal(check.noNamesOnStatement, true);
  assert.deepEqual(check.toCheck, []);
});

test("statement: one line with no name among lines that have one is flagged", () => {
  const check = checkPayoutNames([
    pair("payout", "Mercy Chebet", "Business Payment to 254711111111 - Mercy Chebet"),
    pair("payout", "Grace Njeri", "Business Payment"),
  ]);
  assert.equal(check.checked, 1);
  assert.equal(check.noNamesOnStatement, false);
  assert.equal(check.toCheck.length, 1);
  assert.equal(check.toCheck[0].result, "unknown");
  assert.equal(check.toCheck[0].why, "No name on the statement line");
});

test("statement: a payout the account has no name for is flagged as unknown", () => {
  const check = checkPayoutNames([pair("payout", null, "Business Payment to 254711111111 - Mercy Chebet")]);
  assert.equal(check.toCheck.length, 1);
  assert.equal(check.toCheck[0].result, "unknown");
});

test("statement: no payouts, nothing to say", () => {
  assert.deepEqual(checkPayoutNames([]), { rows: [], checked: 0, matched: 0, toCheck: [], noNamesOnStatement: false });
  assert.equal(checkPayoutNames([pair("topup", "Aisha Omar", "Pay Bill from 2547*****333 - AISHA OMAR")]).rows.length, 0);
});

// ── from a statement file to the name check ─────────────────────────────────

import { parseStatementCsv, reconcile } from "./reconcile.ts";

test("end to end: a statement file and Kipita's records give one clear name and one to check", () => {
  const csv = [
    "Receipt No.,Completion Time,Details,Paid In,Withdrawn",
    '"RKA1B2C3D4","2026-11-27 08:15:02","Business Payment to 254711111111 - MERCY  CHEBET","","2,500.00"',
    '"RKE5F6G7H8","2026-11-27 08:15:03","Business Payment to 2547*****222 - Peter Otieno","","1,200.00"',
    '"RKJ9K1L2M3","2026-11-27 09:01:44","Pay Bill from 2547*****333 - AISHA OMAR","800.00",""',
  ].join("\n");
  const stmt = parseStatementCsv(csv);
  assert.equal(stmt.lines.length, 3);

  const records: KipitaRecord[] = [
    { kind: "payout", id: "w1", receipt: "RKA1B2C3D4", amount: 2500, at: "2026-11-27T05:15:00Z", who: "Mercy Chebet", ref: null },
    { kind: "payout", id: "w2", receipt: "RKE5F6G7H8", amount: 1200, at: "2026-11-27T05:15:00Z", who: "James Mwangi", ref: null },
    { kind: "payment", id: "p1", receipt: "RKJ9K1L2M3", amount: 800, at: "2026-11-27T06:01:00Z", who: "Aisha Omar", ref: "KP-1" },
  ];
  const rec = reconcile(stmt.lines, records);
  assert.equal(rec.problems, 0);

  const check = checkPayoutNames([...rec.matched, ...rec.amountDiffers]);
  assert.equal(check.rows.length, 2);
  assert.equal(check.matched, 1);
  assert.equal(check.toCheck.length, 1);
  assert.equal(check.toCheck[0].receipt, "RKE5F6G7H8");
  assert.equal(check.toCheck[0].statementPhone, "2547*****222");
  assert.equal(check.toCheck[0].result, "different");
});
