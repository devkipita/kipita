/**
 * The file for the M-Pesa portal's bulk payment (Admin > Payouts > "Download for bulk payment").
 *
 * One row per driver: phone number in the form the portal takes (2547XXXXXXXX), amount, name, remarks.
 * The portal's exact template has not been confirmed with Safaricom yet, so the column names and order here
 * are a plain default; if the portal wants something else, this is the one place to change.
 *
 * A name is typed by the person who owns the account, and the file will be opened in a spreadsheet, so a name
 * that starts like a formula (= + - @) is cleaned before it goes in.
 */

export interface PayoutFileLine {
  /** 2547XXXXXXXX */
  phone: string;
  amount: number;
  name: string;
}

/** Text for one cell: a leading = + - @ (or tab / return) is removed so a spreadsheet cannot run it, and spaces are tidied. */
export function cleanCellText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/^[\s=+\-@]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const formatAmount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export interface PayoutFile {
  csv: string;
  /** Rows in the file. */
  count: number;
  /** Sum of the amounts in the file. */
  total: number;
  /** Lines left out because the phone number or amount is not usable. */
  skipped: PayoutFileLine[];
}

export function bulkPaymentCsv(lines: PayoutFileLine[], remarks = "Kipita payout"): PayoutFile {
  const rows: string[] = [["Phone", "Amount", "Name", "Remarks"].map(cell).join(",")];
  const skipped: PayoutFileLine[] = [];
  let totalCents = 0;
  let count = 0;

  for (const l of lines) {
    if (!/^254[0-9]{9}$/.test(l.phone) || !Number.isFinite(l.amount) || l.amount <= 0) {
      skipped.push(l);
      continue;
    }
    rows.push([l.phone, formatAmount(l.amount), cleanCellText(l.name), cleanCellText(remarks)].map(cell).join(","));
    totalCents += Math.round(l.amount * 100);
    count += 1;
  }

  return { csv: rows.join("\r\n") + "\r\n", count, total: totalCents / 100, skipped };
}
