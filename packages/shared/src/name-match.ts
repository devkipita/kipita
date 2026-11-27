/**
 * Is the person M-Pesa paid the person Kipita meant to pay? (Admin > Payouts > Reconcile.)
 *
 * In the pilot the payouts are made by hand from the M-Pesa portal, and the rule (Q24) is that the name M-Pesa
 * shows for the receiving number must match the name on the driver's account. The portal's statement line for a
 * payout carries that name after the number ("... to 254712345678 - John Doe"), so the check can be done on the
 * statement the CEO already drops on the Reconcile screen, instead of by eye.
 *
 * Two things here have not been confirmed against a real statement (see `kipita-payouts-build.md`): how the
 * portal words the line, and whether it prints a name at all. Both are handled openly: `statementRecipient`
 * is the one place that reads the wording, and a line with no name is reported as "no name", never as a match.
 *
 * Safaricom shows only two names of a person (first and last), sometimes with part of a name hidden, so the
 * comparison is by name, in any order, and anything short of two full names in common is "partial", not a match.
 * The account name is the name the driver signed up with; it is the name on their ID only if that was checked
 * when the driver was approved.
 */

import type { Pair } from "./reconcile";

// ─────────────────────────────────────────────────────────────────────────────
// Reading the name off a statement line
// ─────────────────────────────────────────────────────────────────────────────

export interface StatementRecipient {
  /** The number as the statement prints it, possibly with hidden digits (2547*****678). */
  phone: string | null;
  name: string | null;
}

// 8 to 13 digits, plus, or hidden-digit marks (* or x), starting with a digit or "+".
const PHONE = String.raw`\+?\d[\d*xX]{7,12}`;
const AFTER_PHONE = new RegExp(String.raw`(${PHONE})\s*[-–—:|]\s*(.+)$`);

/** "Business Payment to 254712345678 - John Doe" → { phone: "254712345678", name: "John Doe" }. Nothing found → nulls. */
export function statementRecipient(details: string): StatementRecipient {
  const text = (details ?? "").replace(/\s+/g, " ").trim();
  const m = AFTER_PHONE.exec(text);
  if (!m) return { phone: null, name: null };
  const name = m[2].replace(/\s*[-–—:|]\s*$/, "").trim();
  return { phone: m[1], name: name === "" ? null : name };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparing two names
// ─────────────────────────────────────────────────────────────────────────────

export type NameMatch = "match" | "partial" | "different" | "unknown";

export interface NameComparison {
  result: NameMatch;
  /** Short reason, for the screen. */
  why: string;
}

const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "eng", "hon", "sir"]);

/** Lower case, no accents, no apostrophes (Mwang'i = Mwangi), no titles, one word per entry. A "*" is kept: it marks a hidden letter. */
function words(name: string | null | undefined): string[] {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9*]+/g, " ")
    .split(" ")
    .filter((w) => w !== "" && !TITLES.has(w));
}

function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Is this word a looser hit on `known`: a hidden-letter pattern (Ka*u), an initial (K), or one letter out? */
function closeTo(word: string, known: string): boolean {
  if (word.includes("*")) {
    const visible = word.replace(/\*/g, "");
    if (visible === "") return false;
    const pattern = word
      .split("*")
      .map((part) => part.replace(/[.\\^$+?()[\]{}|]/g, "\\$&"))
      .join("[a-z0-9]*");
    return new RegExp(`^${pattern}$`).test(known);
  }
  if (word.length === 1) return known.startsWith(word);
  return word.length >= 4 && known.length >= 4 && withinOneEdit(word, known);
}

/**
 * Compare the name M-Pesa shows (`actual`) with the account name (`expected`), in any order.
 *
 * - match: the shorter name's words are all in the longer one, exactly, and there are at least two of them
 *   ("John Doe" against "Doe John Kamau", or "john doe" against "JOHN DOE").
 * - partial: some words match but that is not enough to be sure: one name only, an initial or a hidden letter,
 *   a spelling one letter out, or only some of the names.
 * - different: no word in common.
 * - unknown: one of the names is empty.
 */
export function compareNames(expected: string | null | undefined, actual: string | null | undefined): NameComparison {
  const known = words(expected);
  const shown = words(actual);
  if (known.length === 0 || shown.length === 0) return { result: "unknown", why: "No name to compare" };

  const left = [...known];
  let exact = 0;
  let close = 0;
  const rest: string[] = [];

  for (const w of shown) {
    const i = left.indexOf(w);
    if (i >= 0) {
      left.splice(i, 1);
      exact += 1;
    } else rest.push(w);
  }
  for (const w of rest) {
    const i = left.findIndex((k) => closeTo(w, k));
    if (i >= 0) {
      left.splice(i, 1);
      close += 1;
    }
  }

  if (exact + close === 0) return { result: "different", why: "No name in common" };
  if (close === 0 && exact >= 2 && (exact === shown.length || exact === known.length)) {
    return { result: "match", why: "Names match" };
  }
  if (shown.length === 1 || known.length === 1) return { result: "partial", why: "Only one name to compare" };
  if (close > 0) return { result: "partial", why: "Spelling or initials differ" };
  return { result: "partial", why: "Only part of the name matches" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Over a whole statement
// ─────────────────────────────────────────────────────────────────────────────

export interface NameCheckRow {
  receipt: string;
  amount: number;
  /** The name and number the statement shows for the payout; null when the line has none. */
  statementName: string | null;
  statementPhone: string | null;
  /** The account name Kipita has for the person paid. */
  kipitaName: string | null;
  result: NameMatch;
  why: string;
}

export interface NameCheck {
  /** Every payout that pairs up with a statement line. */
  rows: NameCheckRow[];
  /** Payouts whose statement line shows a name. */
  checked: number;
  /** Of those, how many match. */
  matched: number;
  /** What needs a look: names that do not match, and payouts whose line shows no name (only when other lines do). */
  toCheck: NameCheckRow[];
  /** No payout line shows a name, so nothing could be checked. False when there are no payouts either. */
  noNamesOnStatement: boolean;
}

/** Check the name on each payout that paired with a statement line (matched, or with a different amount). */
export function checkPayoutNames(pairs: Pair[]): NameCheck {
  const rows: NameCheckRow[] = [];
  for (const { line, record } of pairs) {
    if (record.kind !== "payout") continue;
    const shown = statementRecipient(line.details);
    const cmp = shown.name === null ? { result: "unknown" as const, why: "No name on the statement line" } : compareNames(record.who, shown.name);
    rows.push({
      receipt: line.receipt,
      amount: line.amount,
      statementName: shown.name,
      statementPhone: shown.phone,
      kipitaName: record.who,
      result: cmp.result,
      why: cmp.why,
    });
  }

  const checked = rows.filter((r) => r.statementName !== null).length;
  const matched = rows.filter((r) => r.result === "match").length;
  const noNamesOnStatement = rows.length > 0 && checked === 0;
  return {
    rows,
    checked,
    matched,
    toCheck: noNamesOnStatement ? [] : rows.filter((r) => r.result !== "match"),
    noNamesOnStatement,
  };
}
