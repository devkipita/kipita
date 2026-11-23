/**
 * Checking Kipita's records against the M-Pesa statement (Admin > Payouts > Reconcile).
 *
 * The CEO downloads the statement from the M-Pesa portal as a CSV and drops it on the screen. This file reads
 * it and sets it beside what Kipita has on record (the database function `admin_reconcile_data`), receipt
 * number against receipt number. It has no UI and no network, so it can be tested on its own.
 *
 * The file's exact layout has not been confirmed with Safaricom for Kipita's account, so nothing here assumes
 * one layout: columns are found by their heading ("Receipt No.", "Paid In", "Withdrawn", ...), the person can
 * pick a column when none is found, and every line that could not be read is handed back with a reason
 * instead of being dropped.
 *
 * Times in the statement are Kenya time (UTC+3, no daylight saving).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Reading numbers, receipts and times
// ─────────────────────────────────────────────────────────────────────────────

/** "1,234.50", "KES 1,234", "-500", "(500.00)" → a number. Anything else → null. */
export function parseMoney(value: unknown): number | null {
  let s = String(value ?? "").trim();
  if (s === "") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/\b(kes|kshs?)\b\.?/gi, "").replace(/[^0-9.\-]/g, "");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** A receipt as it is compared: no spaces, no quotes (Excel's ="ABC" trick), upper case. */
export function normalizeReceipt(value: unknown): string {
  return String(value ?? "").replace(/[\s"'=`]/g, "").toUpperCase();
}

/** An M-Pesa receipt: 8 to 14 letters and digits, with at least one of each (a heading like "OPENINGBALANCE" is not one). */
export function isReceipt(value: string): boolean {
  return /^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{8,14}$/.test(value);
}

const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function kenyaTime(y: number, mo: number, d: number, h: number, mi: number, se: number): number | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 59) return null;
  const utc = Date.UTC(y, mo - 1, d, h, mi, se);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null; // 31 Feb
  return utc - KENYA_OFFSET_MS;
}

function applyAmPm(h: number, ampm: string | undefined): number {
  if (!ampm) return h;
  const pm = ampm.toLowerCase() === "pm";
  return h === 12 ? (pm ? 12 : 0) : pm ? h + 12 : h;
}

/**
 * A time from the statement → milliseconds since 1970, or null if it cannot be read.
 * Takes 2026-11-20 14:03:22, 2026-11-20T14:03, 20-11-2026 14:03, 20/11/2026 2:03 PM, 20-Nov-2026 14:03 and a
 * bare date. A time with its own zone (…Z, …+03:00) keeps that zone; the rest is Kenya time. Day comes first
 * in 20/11/2026, as everywhere in Kenya.
 */
export function parseStatementTime(value: string): number | null {
  const s = value.trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const t = Date.parse(s.replace(" ", "T").replace(/\s+/g, ""));
    return Number.isNaN(t) ? null : t;
  }

  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return kenyaTime(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?$/.exec(s);
  if (m) return kenyaTime(+m[3], +m[2], +m[1], applyAmPm(+(m[4] ?? 0), m[7]), +(m[5] ?? 0), +(m[6] ?? 0));

  m = /^(\d{1,2})[- ]([A-Za-z]{3})[A-Za-z]*[- ,]+(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?$/.exec(s);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (mo === 0) return null;
    return kenyaTime(+m[3], mo, +m[1], applyAmPm(+(m[4] ?? 0), m[7]), +(m[5] ?? 0), +(m[6] ?? 0));
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading the file
// ─────────────────────────────────────────────────────────────────────────────

function countUnquoted(line: string, delimiter: string): number {
  let quoted = false;
  let n = 0;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === delimiter) n += 1;
  }
  return n;
}

function detectDelimiter(text: string): string {
  const first = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "").slice(0, 8);
  let best = ",";
  let bestScore = 0;
  for (const d of [",", ";", "\t"]) {
    let score = 0;
    for (const line of first) score += countUnquoted(line, d);
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/** CSV text → rows of cells. Handles a leading BOM, quotes, "" inside quotes, new lines inside quotes, CRLF, and , ; or tab. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export type ColumnKey = "receipt" | "time" | "details" | "paidIn" | "withdrawn" | "amount" | "status";

/** Heading names the person picked for a column (as they appear in the file). Anything not given is found by name. */
export type ColumnOverrides = Partial<Record<ColumnKey, string>>;

const ALIASES: Record<ColumnKey, string[]> = {
  receipt: ["receiptno", "receiptnumber", "receipt", "mpesareceipt", "mpesacode", "transactionid", "transactioncode", "transactionreceipt", "trxid"],
  time: ["completiontime", "completiondate", "transactiontime", "transactiondate", "datetime", "date", "time", "initiationtime"],
  details: ["details", "description", "transactiondetails", "narration", "remarks", "particulars"],
  paidIn: ["paidin", "credit", "credits", "moneyin", "amountin", "deposit", "deposits", "received"],
  withdrawn: ["withdrawn", "debit", "debits", "moneyout", "amountout", "withdrawal", "withdrawals", "paidout"],
  amount: ["amount", "transactionamount"],
  status: ["transactionstatus", "status"],
};

const norm = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]/g, "");

type ColumnIndexes = Partial<Record<ColumnKey, number>>;

function resolveColumns(header: string[], overrides: ColumnOverrides): ColumnIndexes {
  const names = header.map(norm);
  const out: ColumnIndexes = {};
  for (const key of Object.keys(ALIASES) as ColumnKey[]) {
    const wanted = overrides[key];
    if (wanted) {
      const i = names.indexOf(norm(wanted));
      if (i >= 0) {
        out[key] = i;
        continue;
      }
    }
    for (const alias of ALIASES[key]) {
      const i = names.indexOf(alias);
      if (i >= 0) {
        out[key] = i;
        break;
      }
    }
  }
  return out;
}

const hasMoney = (c: ColumnIndexes) => c.paidIn !== undefined || c.withdrawn !== undefined || c.amount !== undefined;

export type StatementDirection = "in" | "out";

export interface StatementLine {
  /** Row in the file as a spreadsheet counts it (the heading row included). */
  row: number;
  /** Upper case, no spaces. */
  receipt: string;
  /** "in" = paid into the account, "out" = paid out of it. */
  direction: StatementDirection;
  /** Always positive. */
  amount: number;
  /** When it completed (ms since 1970), or null when the file has no readable time. */
  at: number | null;
  details: string;
}

export interface SkippedLine {
  row: number;
  reason: string;
  text: string;
}

export interface ParsedStatement {
  lines: StatementLine[];
  /** Rows that were not read, with why. Blank rows are left out. */
  skipped: SkippedLine[];
  /** The headings of the row taken as the heading row. */
  headers: string[];
  /** The headings used for each column (as in the file). Empty when nothing could be read. */
  columns: Partial<Record<ColumnKey, string>>;
  /** What could not be found, when the file cannot be read yet: ask the person to pick these columns. */
  missing: ("receipt" | "amount")[];
}

const nonEmpty = (row: string[]) => row.filter((c) => c.trim() !== "").length;

/** A statement CSV → its lines. Never throws; says what it could not read. */
export function parseStatementCsv(text: string, overrides: ColumnOverrides = {}): ParsedStatement {
  const rows = parseCsv(text);

  let headerRow = -1;
  let cols: ColumnIndexes = {};
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    const c = resolveColumns(rows[i], overrides);
    if (c.receipt !== undefined && hasMoney(c)) {
      headerRow = i;
      cols = c;
      break;
    }
  }

  if (headerRow < 0) {
    const fallback = rows.findIndex((r) => nonEmpty(r) >= 3);
    const headers = fallback >= 0 ? rows[fallback].map((h) => h.trim()) : [];
    const c = fallback >= 0 ? resolveColumns(rows[fallback], overrides) : {};
    const missing: ("receipt" | "amount")[] = [];
    if (c.receipt === undefined) missing.push("receipt");
    if (!hasMoney(c)) missing.push("amount");
    return { lines: [], skipped: [], headers, columns: {}, missing: missing.length ? missing : ["receipt"] };
  }

  const header = rows[headerRow];
  const columns: Partial<Record<ColumnKey, string>> = {};
  for (const key of Object.keys(cols) as ColumnKey[]) columns[key] = header[cols[key] as number].trim();

  const cell = (r: string[], key: ColumnKey) => (cols[key] === undefined ? "" : (r[cols[key] as number] ?? "").trim());
  const lines: StatementLine[] = [];
  const skipped: SkippedLine[] = [];

  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const r = rows[i];
    if (nonEmpty(r) === 0) continue;
    const row = i + 1;
    const shown = r.filter((c) => c.trim() !== "").join(" | ").slice(0, 120);
    const skip = (reason: string) => skipped.push({ row, reason, text: shown });

    const receipt = normalizeReceipt(cell(r, "receipt"));
    if (!isReceipt(receipt)) {
      skip("No receipt number");
      continue;
    }

    const status = cell(r, "status");
    if (status !== "" && !/complet|success|confirm|paid/i.test(status)) {
      skip(`Status: ${status}`);
      continue;
    }

    let direction: StatementDirection | null = null;
    let amount = 0;
    if (cols.paidIn !== undefined || cols.withdrawn !== undefined) {
      const inAmount = Math.abs(parseMoney(cell(r, "paidIn")) ?? 0);
      const outAmount = Math.abs(parseMoney(cell(r, "withdrawn")) ?? 0);
      if (inAmount > 0 && outAmount > 0) {
        skip("Money both in and out");
        continue;
      }
      if (inAmount > 0) {
        direction = "in";
        amount = inAmount;
      } else if (outAmount > 0) {
        direction = "out";
        amount = outAmount;
      }
    } else {
      const signed = parseMoney(cell(r, "amount")) ?? 0;
      if (signed > 0) {
        direction = "in";
        amount = signed;
      } else if (signed < 0) {
        direction = "out";
        amount = -signed;
      }
    }
    if (direction === null) {
      skip("No amount");
      continue;
    }

    const timeText = cell(r, "time");
    lines.push({
      row,
      receipt,
      direction,
      amount,
      at: timeText ? parseStatementTime(timeText) : null,
      details: cell(r, "details").replace(/\s+/g, " "),
    });
  }

  return { lines, skipped, headers: header.map((h) => h.trim()), columns, missing: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setting the statement beside Kipita's records
// ─────────────────────────────────────────────────────────────────────────────

/** One record from `admin_reconcile_data`. */
export interface KipitaRecord {
  kind: "payment" | "topup" | "payout";
  id: string;
  receipt: string | null;
  amount: number;
  /** ISO time. */
  at: string | null;
  who: string | null;
  /** The booking reference, for a payment. */
  ref: string | null;
}

export interface Pair {
  line: StatementLine;
  record: KipitaRecord;
}

export interface Reconciliation {
  /** Same receipt, same direction, same amount. */
  matched: Pair[];
  /** Same receipt, but the amounts differ. difference = statement − Kipita. */
  amountDiffers: (Pair & { difference: number })[];
  /** Same receipt, but money went the other way (a payout that shows as money in, or the reverse). */
  directionDiffers: Pair[];
  /** Money came in on the statement and Kipita has no record of it. */
  receivedNoRecord: StatementLine[];
  /** Money went out on the statement and Kipita has no record of it. */
  paidOutNoRecord: StatementLine[];
  /** Kipita says it was paid, and the statement (which covers that time) does not show it. */
  missingFromStatement: KipitaRecord[];
  /** Kipita records at times the statement does not cover. Not a problem; to be checked against another statement. */
  notCovered: KipitaRecord[];
  /** Fees on the statement, not compared. */
  charges: { lines: StatementLine[]; total: number };
  /** The same receipt twice on the statement. */
  duplicatesInStatement: { receipt: string; lines: StatementLine[] }[];
  /** The same receipt on two Kipita records. */
  duplicatesInKipita: { receipt: string; records: KipitaRecord[] }[];
  /** Kipita records with no receipt number. */
  recordsNoReceipt: KipitaRecord[];
  /** Statement lines outside the chosen period with no Kipita record. Left out of the comparison. */
  outsidePeriod: number;
  totals: { statementIn: number; statementOut: number; kipitaIn: number; kipitaOut: number };
  /** How many things need a look (everything above except matched, notCovered, charges and outsidePeriod). */
  problems: number;
}

/** Fee lines. Only used on a line whose receipt Kipita has no record of, so a person named "Fee" cannot be mistaken for one. */
export function looksLikeCharge(details: string): boolean {
  return /\b(charges?|fees?|tariff|commission|excise)\b/i.test(details);
}

const cents = (n: number) => Math.round(n * 100);
const sumCents = (xs: number[]) => xs.reduce((a, x) => a + cents(x), 0) / 100;

export interface ReconcileOptions {
  /** The period the Kipita records were fetched for (ms since 1970). Statement lines outside it are left out. */
  from?: number | null;
  to?: number | null;
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function reconcile(lines: StatementLine[], records: KipitaRecord[], opts: ReconcileOptions = {}): Reconciliation {
  const from = opts.from ?? null;
  const to = opts.to ?? null;
  const inPeriod = (at: number | null) => at === null || ((from === null || at >= from) && (to === null || at <= to));

  // Kipita's side, by receipt
  const byReceipt = new Map<string, KipitaRecord[]>();
  const recordsNoReceipt: KipitaRecord[] = [];
  for (const r of records) {
    const key = normalizeReceipt(r.receipt);
    if (key === "") recordsNoReceipt.push(r);
    else push(byReceipt, key, r);
  }
  const duplicatesInKipita = [...byReceipt]
    .filter(([, rs]) => rs.length > 1)
    .map(([receipt, rs]) => ({ receipt, records: rs }));

  // The statement, by receipt, with fee lines taken out
  const groups = new Map<string, StatementLine[]>();
  for (const l of lines) push(groups, l.receipt, l);

  const chargeLines: StatementLine[] = [];
  const candidates = new Map<string, StatementLine[]>();
  for (const [receipt, group] of groups) {
    const plain = group.filter((l) => !looksLikeCharge(l.details));
    if (plain.length === 0) {
      if (byReceipt.has(receipt)) candidates.set(receipt, group);
      else chargeLines.push(...group);
    } else {
      chargeLines.push(...group.filter((l) => looksLikeCharge(l.details)));
      candidates.set(receipt, plain);
    }
  }

  const matched: Pair[] = [];
  const amountDiffers: (Pair & { difference: number })[] = [];
  const directionDiffers: Pair[] = [];
  const receivedNoRecord: StatementLine[] = [];
  const paidOutNoRecord: StatementLine[] = [];
  const duplicatesInStatement: { receipt: string; lines: StatementLine[] }[] = [];
  const counted: StatementLine[] = [];
  let outsidePeriod = 0;

  for (const [receipt, group] of candidates) {
    const line = group[0];
    if (group.length > 1) duplicatesInStatement.push({ receipt, lines: group });

    const record = byReceipt.get(receipt)?.[0];
    if (!record) {
      if (!inPeriod(line.at)) {
        outsidePeriod += 1;
        continue;
      }
      counted.push(line);
      (line.direction === "in" ? receivedNoRecord : paidOutNoRecord).push(line);
      continue;
    }

    counted.push(line);
    const expected = record.kind === "payout" ? "out" : "in";
    if (line.direction !== expected) directionDiffers.push({ line, record });
    else if (cents(line.amount) !== cents(record.amount)) {
      amountDiffers.push({ line, record, difference: (cents(line.amount) - cents(record.amount)) / 100 });
    } else matched.push({ line, record });
  }

  // Kipita records the statement does not show
  let stmtFrom: number | null = null;
  let stmtTo: number | null = null;
  for (const l of lines) {
    if (l.at === null) continue;
    if (stmtFrom === null || l.at < stmtFrom) stmtFrom = l.at;
    if (stmtTo === null || l.at > stmtTo) stmtTo = l.at;
  }
  const missingFromStatement: KipitaRecord[] = [];
  const notCovered: KipitaRecord[] = [];
  for (const [receipt, recs] of byReceipt) {
    if (candidates.has(receipt)) continue;
    const record = recs[0];
    const at = record.at ? Date.parse(record.at) : Number.NaN;
    const covered = stmtFrom === null || stmtTo === null || Number.isNaN(at) || (at >= stmtFrom && at <= stmtTo);
    (covered ? missingFromStatement : notCovered).push(record);
  }

  const problems =
    amountDiffers.length +
    directionDiffers.length +
    receivedNoRecord.length +
    paidOutNoRecord.length +
    missingFromStatement.length +
    duplicatesInStatement.length +
    duplicatesInKipita.length +
    recordsNoReceipt.length;

  return {
    matched,
    amountDiffers,
    directionDiffers,
    receivedNoRecord,
    paidOutNoRecord,
    missingFromStatement,
    notCovered,
    charges: { lines: chargeLines, total: sumCents(chargeLines.map((l) => l.amount)) },
    duplicatesInStatement,
    duplicatesInKipita,
    recordsNoReceipt,
    outsidePeriod,
    totals: {
      statementIn: sumCents(counted.filter((l) => l.direction === "in").map((l) => l.amount)),
      statementOut: sumCents(counted.filter((l) => l.direction === "out").map((l) => l.amount)),
      kipitaIn: sumCents(records.filter((r) => r.kind !== "payout").map((r) => r.amount)),
      kipitaOut: sumCents(records.filter((r) => r.kind === "payout").map((r) => r.amount)),
    },
    problems,
  };
}
