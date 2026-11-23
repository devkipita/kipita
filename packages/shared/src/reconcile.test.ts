// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isReceipt,
  looksLikeCharge,
  normalizeReceipt,
  parseCsv,
  parseMoney,
  parseStatementCsv,
  parseStatementTime,
  reconcile,
  type KipitaRecord,
  type StatementLine,
} from "./reconcile.ts";

// Kenya time → ms, for building expected values
const kenya = (iso: string) => Date.parse(iso + "+03:00");

// ── numbers, receipts, times ────────────────────────────────────────────────

test("money: commas, currency words, brackets, signs, and things that are not money", () => {
  assert.equal(parseMoney("1,234.50"), 1234.5);
  assert.equal(parseMoney("KES 1,234"), 1234);
  assert.equal(parseMoney("Ksh. 300.00"), 300);
  assert.equal(parseMoney("-500.00"), -500);
  assert.equal(parseMoney("(500.00)"), -500);
  assert.equal(parseMoney(".5"), 0.5);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("-"), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney("12-34"), null);
  assert.equal(parseMoney("1.2.3"), null);
  assert.equal(parseMoney(undefined), null);
});

test("receipts: spaces, quotes and Excel's text trick are removed; headings are not receipts", () => {
  assert.equal(normalizeReceipt(' slk1a2b3c4 '), "SLK1A2B3C4");
  assert.equal(normalizeReceipt('="SLK1A2B3C4"'), "SLK1A2B3C4");
  assert.equal(normalizeReceipt("SLK 1A2B 3C4"), "SLK1A2B3C4");
  assert.equal(normalizeReceipt(null), "");
  assert.ok(isReceipt("SLK1A2B3C4"));
  assert.ok(!isReceipt("OPENINGBALANCE"));
  assert.ok(!isReceipt("12345678"));
  assert.ok(!isReceipt("SLK1A2"));
  assert.ok(!isReceipt(""));
});

test("times are Kenya time unless the text carries its own zone", () => {
  assert.equal(parseStatementTime("2026-11-20 14:03:22"), kenya("2026-11-20T14:03:22"));
  assert.equal(parseStatementTime("2026-11-20T14:03"), kenya("2026-11-20T14:03:00"));
  assert.equal(parseStatementTime("2026-11-20"), kenya("2026-11-20T00:00:00"));
  assert.equal(parseStatementTime("20-11-2026 14:03:22"), kenya("2026-11-20T14:03:22"));
  assert.equal(parseStatementTime("20/11/2026 14:03"), kenya("2026-11-20T14:03:00"));
  assert.equal(parseStatementTime("5/11/2026 2:03 PM"), kenya("2026-11-05T14:03:00"));
  assert.equal(parseStatementTime("5/11/2026 12:10 AM"), kenya("2026-11-05T00:10:00"));
  assert.equal(parseStatementTime("5/11/2026 12:10 PM"), kenya("2026-11-05T12:10:00"));
  assert.equal(parseStatementTime("20-Nov-2026 14:03:22"), kenya("2026-11-20T14:03:22"));
  assert.equal(parseStatementTime("2026-11-20T11:03:22Z"), Date.parse("2026-11-20T11:03:22Z"));
  assert.equal(parseStatementTime("2026-11-20 14:03:22+03:00"), kenya("2026-11-20T14:03:22"));
  assert.equal(parseStatementTime("31/02/2026"), null);
  assert.equal(parseStatementTime("2026-13-01"), null);
  assert.equal(parseStatementTime("yesterday"), null);
  assert.equal(parseStatementTime(""), null);
});

test("day comes first in 05/11/2026 (5 November, not 11 May)", () => {
  assert.equal(parseStatementTime("05/11/2026"), kenya("2026-11-05T00:00:00"));
});

// ── reading the CSV ─────────────────────────────────────────────────────────

test("csv: quotes, commas and new lines inside quotes, CRLF, BOM, semicolons, tabs", () => {
  assert.deepEqual(parseCsv('a,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n'), [
    ["a", "b", "c"],
    ["x, y", 'say "hi"', "line1\nline2"],
  ]);
  assert.deepEqual(parseCsv("﻿a;b\n1;2\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv(""), []);
});

const PORTAL = [
  "Account Statement",
  "Account: 123456,Period: 01-11-2026 to 20-11-2026",
  "",
  "Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance",
  "SLK1A2B3C4,2026-11-20 14:03:22,Pay Bill from 254712000001 - Wanjiru Kamau,Completed,\"1,200.00\",,\"5,000.00\"",
  "SLK5D6E7F8,2026-11-20 16:10:00,Business Payment to 254712000009 - Otieno,Completed,,\"1,000.00\",\"4,200.00\"",
  "SLK9G0H1J2,2026-11-20 16:10:00,Business Payment Charge,Completed,,23.00,\"4,177.00\"",
  "SLK3K4L5M6,2026-11-20 17:00:00,Pay Bill from 254700000000 - Someone,Failed,300.00,,\"4,177.00\"",
  "OPENING BALANCE,,,,,,\"3,800.00\"",
  "",
  "TOTAL,,,,\"1,500.00\",\"1,023.00\",",
].join("\r\n");

test("a portal-style statement: preamble, quoted amounts, a charge, a failed line, an opening balance, a total", () => {
  const p = parseStatementCsv(PORTAL);
  assert.deepEqual(p.missing, []);
  assert.deepEqual(p.columns, {
    receipt: "Receipt No.",
    time: "Completion Time",
    details: "Details",
    status: "Transaction Status",
    paidIn: "Paid In",
    withdrawn: "Withdrawn",
  });
  assert.equal(p.lines.length, 3);
  assert.deepEqual(p.lines[0], {
    row: 5,
    receipt: "SLK1A2B3C4",
    direction: "in",
    amount: 1200,
    at: kenya("2026-11-20T14:03:22"),
    details: "Pay Bill from 254712000001 - Wanjiru Kamau",
  });
  assert.equal(p.lines[1].direction, "out");
  assert.equal(p.lines[1].amount, 1000);
  assert.equal(p.lines[2].amount, 23);
  assert.deepEqual(
    p.skipped.map((s) => [s.row, s.reason]),
    [
      [8, "Status: Failed"],
      [9, "No receipt number"],
      [11, "No receipt number"],
    ],
  );
});

test("a semicolon file with a BOM and a signed Amount column", () => {
  const text = "﻿Transaction ID;Date;Narration;Amount\n" + "SLK1A2B3C4;20/11/2026 14:03;Customer payment;\"1,200.00\"\n" + "SLK5D6E7F8;20/11/2026 16:10;Payout;-1000\n" + "SLK7N8P9Q0;20/11/2026 16:11;Nothing;0\n";
  const p = parseStatementCsv(text);
  assert.equal(p.lines.length, 2);
  assert.equal(p.lines[0].direction, "in");
  assert.equal(p.lines[1].direction, "out");
  assert.equal(p.lines[1].amount, 1000);
  assert.deepEqual(p.skipped.map((s) => s.reason), ["No amount"]);
});

test("money on both sides of one line is skipped, not guessed", () => {
  const p = parseStatementCsv("Receipt No.,Paid In,Withdrawn\nSLK1A2B3C4,100,100\n");
  assert.equal(p.lines.length, 0);
  assert.equal(p.skipped[0].reason, "Money both in and out");
});

test("no columns found: nothing read, and the headings come back for the person to pick from", () => {
  const p = parseStatementCsv("Ref,When,What,How much\nSLK1A2B3C4,2026-11-20,Thing,100\n");
  assert.equal(p.lines.length, 0);
  assert.deepEqual(p.headers, ["Ref", "When", "What", "How much"]);
  assert.deepEqual(p.missing, ["receipt", "amount"]);
});

test("picking the columns by heading makes the same file readable", () => {
  const text = "Ref,When,What,How much\nSLK1A2B3C4,2026-11-20 10:00,Thing,100\n";
  const p = parseStatementCsv(text, { receipt: "Ref", time: "When", details: "What", amount: "How much" });
  assert.deepEqual(p.missing, []);
  assert.equal(p.lines.length, 1);
  assert.equal(p.lines[0].amount, 100);
  assert.equal(p.lines[0].direction, "in");
  assert.equal(p.lines[0].at, kenya("2026-11-20T10:00:00"));
});

test("a heading that is not in the file is ignored and the columns are still found by name", () => {
  const p = parseStatementCsv("Receipt No.,Paid In\nSLK1A2B3C4,100\n", { receipt: "Nope" });
  assert.equal(p.lines.length, 1);
});

test("an empty or unreadable file does not throw", () => {
  const empty = parseStatementCsv("");
  assert.deepEqual(empty.lines, []);
  assert.deepEqual(empty.headers, []);
  assert.deepEqual(empty.missing, ["receipt", "amount"]);
  assert.deepEqual(parseStatementCsv("hello").lines, []);
  assert.deepEqual(parseStatementCsv("hello").missing, ["receipt", "amount"]);
});

// ── setting it beside Kipita's records ──────────────────────────────────────

const line = (receipt: string, direction: "in" | "out", amount: number, at = "2026-11-20T12:00:00", details = ""): StatementLine => ({
  row: 1,
  receipt,
  direction,
  amount,
  at: kenya(at),
  details,
});

const rec = (kind: KipitaRecord["kind"], receipt: string | null, amount: number, at = "2026-11-20T12:00:00"): KipitaRecord => ({
  kind,
  id: `${kind}-${receipt ?? "none"}-${amount}`,
  receipt,
  amount,
  at: new Date(kenya(at)).toISOString(),
  who: "Someone",
  ref: kind === "payment" ? "KP-1" : null,
});

test("everything agrees", () => {
  const r = reconcile(
    [line("SLK1A2B3C4", "in", 1200), line("SLK5D6E7F8", "out", 1000), line("SLK2A2A2A2A", "in", 700)],
    [rec("payment", "SLK1A2B3C4", 1200), rec("payout", "SLK5D6E7F8", 1000), rec("topup", "SLK2A2A2A2A", 700)],
  );
  assert.equal(r.matched.length, 3);
  assert.equal(r.problems, 0);
  assert.deepEqual(r.totals, { statementIn: 1900, statementOut: 1000, kipitaIn: 1900, kipitaOut: 1000 });
});

test("receipts match whatever the case or spacing in Kipita's record", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 100)], [rec("payment", " slk1a2b3c4 ", 100)]);
  assert.equal(r.matched.length, 1);
});

test("same receipt, different amount: shown with the difference", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 1250)], [rec("payment", "SLK1A2B3C4", 1200)]);
  assert.equal(r.amountDiffers.length, 1);
  assert.equal(r.amountDiffers[0].difference, 50);
  assert.equal(r.matched.length, 0);
  assert.equal(r.problems, 1);
});

test("amounts are compared in cents, so 0.1 + 0.2 equals 0.3", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 0.1 + 0.2)], [rec("payment", "SLK1A2B3C4", 0.3)]);
  assert.equal(r.matched.length, 1);
});

test("same receipt, money the other way", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 1000)], [rec("payout", "SLK1A2B3C4", 1000)]);
  assert.equal(r.directionDiffers.length, 1);
  assert.equal(r.problems, 1);
  const r2 = reconcile([line("SLK1A2B3C4", "out", 1000)], [rec("payment", "SLK1A2B3C4", 1000)]);
  assert.equal(r2.directionDiffers.length, 1);
});

test("money in with no Kipita record, and money out with no Kipita record", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 500, "2026-11-20T12:00:00", "Pay Bill from 2547…"), line("SLK5D6E7F8", "out", 900)], []);
  assert.deepEqual(r.receivedNoRecord.map((l) => l.receipt), ["SLK1A2B3C4"]);
  assert.deepEqual(r.paidOutNoRecord.map((l) => l.receipt), ["SLK5D6E7F8"]);
  assert.equal(r.problems, 2);
});

test("Kipita says paid, the statement does not show it", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 100, "2026-11-20T09:00:00"), line("SLK2A2A2A2A", "in", 100, "2026-11-20T18:00:00")], [rec("payment", "SLK1A2B3C4", 100), rec("payout", "SLK5D6E7F8", 1000, "2026-11-20T12:00:00")]);
  assert.deepEqual(r.missingFromStatement.map((x) => x.receipt), ["SLK5D6E7F8"]);
  assert.equal(r.notCovered.length, 0);
});

test("a Kipita record at a time the statement does not cover is not called missing", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 100, "2026-11-20T09:00:00"), line("SLK2A2A2A2A", "in", 100, "2026-11-20T10:00:00")], [rec("payment", "SLK1A2B3C4", 100, "2026-11-20T09:00:00"), rec("payment", "SLK2A2A2A2A", 100, "2026-11-20T10:00:00"), rec("payment", "SLK8Z8Z8Z8Z", 300, "2026-11-25T10:00:00")]);
  assert.equal(r.missingFromStatement.length, 0);
  assert.deepEqual(r.notCovered.map((x) => x.receipt), ["SLK8Z8Z8Z8Z"]);
  assert.equal(r.problems, 0);
});

test("a statement with no readable times still flags a missing record", () => {
  const noTime: StatementLine = { ...line("SLK1A2B3C4", "in", 100), at: null };
  const r = reconcile([noTime], [rec("payment", "SLK1A2B3C4", 100), rec("payment", "SLK8Z8Z8Z8Z", 300)]);
  assert.equal(r.missingFromStatement.length, 1);
});

test("fee lines are set aside, not called money out with no record", () => {
  const r = reconcile(
    [line("SLK5D6E7F8", "out", 1000, "2026-11-20T12:00:00", "Business Payment to 2547… - Otieno"), line("SLK9G0H1J2", "out", 23, "2026-11-20T12:00:00", "Business Payment Charge"), line("SLK4A4A4A4A", "out", 11.5, "2026-11-20T12:05:00", "Transaction fee")],
    [rec("payout", "SLK5D6E7F8", 1000)],
  );
  assert.equal(r.matched.length, 1);
  assert.equal(r.paidOutNoRecord.length, 0);
  assert.equal(r.charges.lines.length, 2);
  assert.equal(r.charges.total, 34.5);
  assert.equal(r.problems, 0);
});

test("a fee line that shares the payout's receipt is peeled off, not called a duplicate", () => {
  const r = reconcile([line("SLK5D6E7F8", "out", 1000, "2026-11-20T12:00:00", "Business Payment to 2547…"), line("SLK5D6E7F8", "out", 23, "2026-11-20T12:00:00", "Charge")], [rec("payout", "SLK5D6E7F8", 1000)]);
  assert.equal(r.matched.length, 1);
  assert.equal(r.duplicatesInStatement.length, 0);
  assert.equal(r.charges.total, 23);
});

test("a person whose name looks like a fee is still a payment when Kipita has the receipt", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 500, "2026-11-20T12:00:00", "Pay Bill from 2547… - Mary Fee")], [rec("payment", "SLK1A2B3C4", 500)]);
  assert.equal(r.matched.length, 1);
  assert.equal(r.charges.lines.length, 0);
});

test("the same receipt twice on the statement, and twice in Kipita", () => {
  const r = reconcile([line("SLK1A2B3C4", "in", 500), line("SLK1A2B3C4", "in", 500)], [rec("payment", "SLK1A2B3C4", 500), { ...rec("topup", "SLK1A2B3C4", 500), id: "other" }]);
  assert.equal(r.duplicatesInStatement.length, 1);
  assert.equal(r.duplicatesInStatement[0].lines.length, 2);
  assert.equal(r.duplicatesInKipita.length, 1);
  assert.equal(r.matched.length, 1);
  assert.equal(r.problems, 2);
});

test("a Kipita record with no receipt number is flagged", () => {
  const r = reconcile([], [rec("payment", null, 500), rec("payment", "  ", 500)]);
  assert.equal(r.recordsNoReceipt.length, 2);
  assert.equal(r.problems, 2);
});

test("statement lines outside the chosen period with no record are left out, and counted", () => {
  const from = kenya("2026-11-20T00:00:00");
  const to = kenya("2026-11-20T23:59:59");
  const r = reconcile([line("SLK1A2B3C4", "in", 100, "2026-11-19T12:00:00"), line("SLK2A2A2A2A", "in", 100, "2026-11-21T00:30:00"), line("SLK3A3A3A3A", "in", 100, "2026-11-20T12:00:00")], [], { from, to });
  assert.equal(r.outsidePeriod, 2);
  assert.deepEqual(r.receivedNoRecord.map((l) => l.receipt), ["SLK3A3A3A3A"]);
});

test("a line just outside the period still matches a record Kipita has", () => {
  const from = kenya("2026-11-20T00:00:00");
  const to = kenya("2026-11-20T23:59:59");
  const r = reconcile([line("SLK1A2B3C4", "in", 100, "2026-11-21T00:00:05")], [rec("payment", "SLK1A2B3C4", 100, "2026-11-20T23:59:58")], { from, to });
  assert.equal(r.matched.length, 1);
  assert.equal(r.outsidePeriod, 0);
});

test("a parsed portal statement reconciles end to end", () => {
  const p = parseStatementCsv(PORTAL);
  const r = reconcile(p.lines, [rec("payment", "SLK1A2B3C4", 1200, "2026-11-20T14:03:22"), rec("payout", "SLK5D6E7F8", 1000, "2026-11-20T16:10:00")]);
  assert.equal(r.matched.length, 2);
  assert.equal(r.charges.total, 23);
  assert.equal(r.problems, 0);
});

test("the charge heuristic", () => {
  assert.ok(looksLikeCharge("Business Payment Charge"));
  assert.ok(looksLikeCharge("Transaction fee"));
  assert.ok(looksLikeCharge("Excise duty on charge"));
  assert.ok(!looksLikeCharge("Business Payment to 254712000009 - Otieno"));
  assert.ok(!looksLikeCharge("Pay Bill from 254712000001 - Wanjiru"));
  assert.ok(!looksLikeCharge("Discharged"));
});
