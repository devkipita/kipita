// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { bulkPaymentCsv, cleanCellText } from "./payout-file.ts";

test("one row per driver, with a heading row", () => {
  const f = bulkPaymentCsv([
    { phone: "254712000001", amount: 1500, name: "Wanjiru Kamau" },
    { phone: "254722000002", amount: 800.5, name: "Otieno" },
  ]);
  assert.equal(
    f.csv,
    "Phone,Amount,Name,Remarks\r\n254712000001,1500,Wanjiru Kamau,Kipita payout\r\n254722000002,800.50,Otieno,Kipita payout\r\n",
  );
  assert.equal(f.count, 2);
  assert.equal(f.total, 2300.5);
  assert.deepEqual(f.skipped, []);
});

test("a name with a comma or a quote is quoted", () => {
  const f = bulkPaymentCsv([{ phone: "254712000001", amount: 100, name: 'Mwangi, J "Jim"' }]);
  assert.ok(f.csv.includes('"Mwangi, J ""Jim"""'));
});

test("a name that starts like a formula is cleaned", () => {
  assert.equal(cleanCellText("=HYPERLINK(\"x\")"), 'HYPERLINK("x")');
  assert.equal(cleanCellText("  +254 Kamau"), "254 Kamau");
  assert.equal(cleanCellText("@SUM(A1)"), "SUM(A1)");
  assert.equal(cleanCellText("-cmd"), "cmd");
  assert.equal(cleanCellText("Ann\nMarie\tW"), "Ann Marie W");
  const f = bulkPaymentCsv([{ phone: "254712000001", amount: 100, name: "=1+1" }]);
  assert.ok(f.csv.includes(",1+1,"), f.csv);
});

test("a bad phone number or amount is left out and handed back", () => {
  const bad = [
    { phone: "0712000001", amount: 100, name: "A" },
    { phone: "254712000001", amount: 0, name: "B" },
    { phone: "254712000001", amount: Number.NaN, name: "C" },
  ];
  const f = bulkPaymentCsv([...bad, { phone: "254712000009", amount: 250, name: "D" }]);
  assert.equal(f.count, 1);
  assert.equal(f.total, 250);
  assert.deepEqual(f.skipped, bad);
});

test("no lines: just the heading row", () => {
  const f = bulkPaymentCsv([]);
  assert.equal(f.csv, "Phone,Amount,Name,Remarks\r\n");
  assert.equal(f.count, 0);
});

test("the total adds in cents, so it does not drift", () => {
  const f = bulkPaymentCsv([
    { phone: "254712000001", amount: 0.1, name: "A" },
    { phone: "254712000002", amount: 0.2, name: "B" },
  ]);
  assert.equal(f.total, 0.3);
});
