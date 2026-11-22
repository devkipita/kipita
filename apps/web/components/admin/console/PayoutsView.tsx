"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import styled from "styled-components";
import {
  bulkPaymentCsv,
  kenyaToday,
  parseStatementCsv,
  reconcile,
  type ColumnKey,
  type ColumnOverrides,
  type KipitaRecord,
  type ParsedStatement,
  type Reconciliation,
  type StatementLine,
} from "@kipita/shared";
import { dateTime, kes, type PayoutHistoryRow, type PayoutLine, type PayoutQueue, type PayoutWaitingReason } from "@/lib/admin/console";
import { fetchReconcileDataAction, markPayoutPaidAction, returnPayoutAction } from "@/lib/admin/console-actions";
import {
  Button,
  Card,
  CardHead,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Money,
  Note,
  PageHeader,
  Pill,
  TableScroll,
  TabLink,
  Tabs,
  useToast,
} from "./ui";

export type PayoutsTab = "pay" | "paid" | "reconcile";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole shillings plainly; cents only when there are some (a difference of 50 cents must not vanish). */
function fmt(n: number) {
  return Number.isInteger(n) ? kes(n) : `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const at = (ms: number | null) => (ms === null ? "" : dateTime(new Date(ms).toISOString()));

const Stack = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 14px;
`;

const Strip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 14px;
  background: ${({ theme }) => theme.color.surface};

  strong {
    color: ${({ theme }) => theme.color.text};
    font: 800 17px ${({ theme }) => theme.fontHeading};
  }
  span {
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
`;

const Cell = styled.div`
  display: grid;
  gap: 2px;
`;

const Act = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  input {
    width: 132px;
    min-height: 34px;
    padding: 0 9px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 9px;
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.background};
    font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.03em;
  }
`;

const Right = styled.span`
  display: block;
  text-align: right;
`;

const Totals = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;

  div {
    padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 10px;
  }
  dt {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  dd {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.color.text};
    font-size: 13px;
    font-weight: 700;
  }
  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
    font-weight: 500;
  }
`;

const PickGrid = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
`;

const Plain = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textSoft};
  font-size: 13px;
  line-height: 1.5;
`;

const REASON: Record<PayoutWaitingReason, string> = {
  account: "Account not active",
  phone: "Phone number not verified",
  minimum: "Under the minimum",
};

const lineKey = (l: PayoutLine) => l.withdrawal_id ?? l.user_id;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// To pay
// ─────────────────────────────────────────────────────────────────────────────

function ToPay({ queue }: { queue: PayoutQueue }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<PayoutLine | null>(null);
  const [returning, setReturning] = useState<PayoutLine | null>(null);
  const [reason, setReason] = useState("");

  const total = queue.lines.reduce((sum, l) => sum + l.amount, 0);

  function bulk() {
    const file = bulkPaymentCsv(queue.lines.map((l) => ({ phone: l.phone ?? "", amount: l.amount, name: l.name ?? "" })));
    if (file.count === 0) {
      toast.show("No line has a usable phone number.", true);
      return;
    }
    download(`kipita-payouts-${kenyaToday()}.csv`, file.csv);
    toast.show(file.skipped.length ? `${file.count} in the file. ${file.skipped.length} left out: no usable phone number.` : `${file.count} in the file.`);
  }

  function askPaid(line: PayoutLine) {
    const receipt = (receipts[lineKey(line)] ?? "").trim();
    if (!/^[A-Z0-9]{8,14}$/.test(receipt)) {
      toast.show("Enter the M-Pesa receipt number.", true);
      return;
    }
    setPaying(line);
  }

  function confirmPaid(line: PayoutLine) {
    startTransition(async () => {
      const res = await markPayoutPaidAction({
        userId: line.user_id,
        withdrawalId: line.withdrawal_id,
        amount: line.amount,
        receipt: receipts[lineKey(line)] ?? "",
      });
      setPaying(null);
      if (res.ok) {
        toast.show("Marked as paid.");
      } else {
        toast.show(res.error, true);
      }
      router.refresh();
    });
  }

  function confirmReturn(line: PayoutLine) {
    if (!line.withdrawal_id) return;
    const id = line.withdrawal_id;
    startTransition(async () => {
      const res = await returnPayoutAction(id, reason);
      if (res.ok) {
        setReturning(null);
        setReason("");
        toast.show("Back in their wallet.");
      } else {
        toast.show(res.error, true);
      }
      router.refresh();
    });
  }

  return (
    <>
      {queue.lines.length === 0 ? (
        <Card style={{ marginTop: 14 }}>
          <EmptyState title="Nobody to pay" body="Released earnings show up here." />
        </Card>
      ) : (
        <Stack>
          <Strip>
            <div>
              <strong>{fmt(total)}</strong> <span>to {queue.lines.length} {queue.lines.length === 1 ? "person" : "people"}</span>
            </div>
            <Button $variant="tonal" onClick={bulk}>
              Download for bulk payment
            </Button>
          </Strip>
          <Card $flush>
            <TableScroll>
              <DataTable>
                <thead>
                  <tr>
                    <th>Who</th>
                    <th>Phone</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Receipt number</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.lines.map((line) => {
                    const key = lineKey(line);
                    return (
                      <tr key={key}>
                        <td>
                          <strong>{line.name ?? "Unknown"}</strong>
                          <small>{line.kind === "request" ? "Asked to withdraw" : "Earnings"}</small>
                        </td>
                        <td>
                          <Cell>
                            <span>{line.phone ?? "No usable number"}</span>
                            {line.verified ? (
                              <small>Verified{line.verified_via ? ` (${line.verified_via === "mpesa" ? "M-Pesa" : "SMS"})` : ""}</small>
                            ) : (
                              <Pill $tone="warning">Not verified</Pill>
                            )}
                          </Cell>
                        </td>
                        <td>
                          <Right>
                            <Money>{fmt(line.amount)}</Money>
                          </Right>
                        </td>
                        <td>
                          <Act>
                            <input
                              value={receipts[key] ?? ""}
                              maxLength={14}
                              placeholder="e.g. SLK1A2B3C4"
                              aria-label={`M-Pesa receipt number for ${line.name ?? "this person"}`}
                              autoCapitalize="characters"
                              autoComplete="off"
                              spellCheck={false}
                              onChange={(e) => setReceipts((cur) => ({ ...cur, [key]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                            />
                            <Button $variant="green" disabled={pending} onClick={() => askPaid(line)}>
                              Mark paid
                            </Button>
                            {line.kind === "request" && (
                              <Button $variant="outline" disabled={pending} onClick={() => setReturning(line)}>
                                Return
                              </Button>
                            )}
                          </Act>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </TableScroll>
          </Card>
        </Stack>
      )}

      {queue.waiting.length > 0 && (
        <Stack>
          <Card>
            <CardHead title="Waiting" sub="Owed money, but cannot be paid yet." />
            <TableScroll style={{ marginTop: 12 }}>
              <DataTable>
                <thead>
                  <tr>
                    <th>Who</th>
                    <th>Phone</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.waiting.map((w) => (
                    <tr key={w.user_id}>
                      <td>
                        <strong>{w.name ?? "Unknown"}</strong>
                      </td>
                      <td>{w.phone ?? "No number"}</td>
                      <td>
                        <Right>
                          <Money>{fmt(w.amount)}</Money>
                        </Right>
                      </td>
                      <td>
                        <Pill $tone="warning">{w.reason === "minimum" ? `Under KES ${queue.min}` : REASON[w.reason]}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </TableScroll>
          </Card>
        </Stack>
      )}

      {paying && (
        <Modal
          title="Mark as paid?"
          close={() => setPaying(null)}
          footer={
            <>
              <Button $variant="outline" onClick={() => setPaying(null)} disabled={pending}>
                Cancel
              </Button>
              <Button $variant="green" onClick={() => confirmPaid(paying)} disabled={pending}>
                Mark {fmt(paying.amount)} paid
              </Button>
            </>
          }
        >
          <Plain>
            {fmt(paying.amount)} to {paying.name ?? "this person"} ({paying.phone ?? "no number"}). Receipt {receipts[lineKey(paying)]}.
          </Plain>
          <Note $tone={paying.kind === "earnings" ? "warning" : "info"}>
            {paying.kind === "earnings" ? "The amount leaves their wallet now. This cannot be undone." : "This cannot be undone."}
          </Note>
        </Modal>
      )}

      {returning && (
        <Modal
          title="Return to wallet?"
          close={() => setReturning(null)}
          footer={
            <>
              <Button $variant="outline" onClick={() => setReturning(null)} disabled={pending}>
                Cancel
              </Button>
              <Button $variant="danger" onClick={() => confirmReturn(returning)} disabled={pending || !reason.trim()}>
                Return {fmt(returning.amount)}
              </Button>
            </>
          }
        >
          <Plain>
            {fmt(returning.amount)} goes back to {returning.name ?? "the person"}&rsquo;s wallet. They are told.
          </Plain>
          <Field style={{ marginTop: 12 }}>
            Reason
            <textarea value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Modal>
      )}
      {toast.node}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paid
// ─────────────────────────────────────────────────────────────────────────────

function Paid({ history }: { history: PayoutHistoryRow[] }) {
  if (history.length === 0) {
    return (
      <Card style={{ marginTop: 14 }}>
        <EmptyState title="No payouts yet" body="Paid and returned payouts from the last 30 days show up here." />
      </Card>
    );
  }
  return (
    <Card $flush style={{ marginTop: 14 }}>
      <TableScroll>
        <DataTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Phone</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Receipt</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.at ? dateTime(h.at) : ""}</td>
                <td>
                  <strong>{h.name ?? "Unknown"}</strong>
                </td>
                <td>{h.phone ?? ""}</td>
                <td>
                  <Right>
                    <Money>{fmt(h.amount)}</Money>
                  </Right>
                </td>
                <td>
                  <code>{h.receipt ?? ""}</code>
                </td>
                <td>
                  {h.status === "paid" ? (
                    <Pill $tone="success">Paid</Pill>
                  ) : (
                    <Cell>
                      <Pill $tone="neutral">{h.status === "failed" ? "Returned" : "Cancelled"}</Pill>
                      {h.reason ? <small>{h.reason}</small> : null}
                    </Cell>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableScroll>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconcile
// ─────────────────────────────────────────────────────────────────────────────

type Col<T> = { head: string; cell: (row: T) => ReactNode; right?: boolean };

function Section<T>({ title, sub, rows, cols, tone }: { title: string; sub?: string; rows: T[]; cols: Col<T>[]; tone?: "problem" }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHead title={title} sub={sub} aside={<Pill $tone={tone === "problem" ? "warning" : "neutral"}>{rows.length}</Pill>} />
      <TableScroll style={{ marginTop: 12 }}>
        <DataTable>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.head} style={c.right ? { textAlign: "right" } : undefined}>
                  {c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.head}>{c.right ? <Right>{c.cell(r)}</Right> : c.cell(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </TableScroll>
    </Card>
  );
}

const lineCols: Col<StatementLine>[] = [
  { head: "Row", cell: (l) => l.row },
  { head: "Receipt", cell: (l) => <code>{l.receipt}</code> },
  { head: "Amount", right: true, cell: (l) => <Money>{fmt(l.amount)}</Money> },
  { head: "When", cell: (l) => at(l.at) },
  { head: "Details", cell: (l) => l.details },
];

const recordCols: Col<KipitaRecord>[] = [
  { head: "Kind", cell: (r) => (r.kind === "payment" ? "Payment" : r.kind === "topup" ? "Top-up" : "Payout") },
  { head: "Receipt", cell: (r) => <code>{r.receipt ?? "none"}</code> },
  { head: "Amount", right: true, cell: (r) => <Money>{fmt(r.amount)}</Money> },
  { head: "When", cell: (r) => (r.at ? dateTime(r.at) : "") },
  { head: "Who", cell: (r) => [r.who, r.ref].filter(Boolean).join(" · ") },
];

const PICKS: { key: ColumnKey; label: string; need?: boolean }[] = [
  { key: "receipt", label: "Receipt number", need: true },
  { key: "paidIn", label: "Money in" },
  { key: "withdrawn", label: "Money out" },
  { key: "amount", label: "Amount (one column, minus = out)" },
  { key: "time", label: "Time" },
  { key: "details", label: "Details" },
];

function Results({ r, parsed }: { r: Reconciliation; parsed: ParsedStatement }) {
  const compared = r.matched.length + r.problems;
  const clear = r.problems === 0 && r.matched.length > 0;
  return (
    <Stack>
      <Note $tone={clear ? "success" : "warning"} style={{ margin: 0, fontSize: 13 }}>
        {clear ? `All ${r.matched.length} agree.` : `${r.problems} to look at. ${r.matched.length} agree.`}
      </Note>

      <Card>
        <Totals>
          <div>
            <dt>Money in</dt>
            <dd>{fmt(r.totals.statementIn)}</dd>
            <small>Kipita has {fmt(r.totals.kipitaIn)}</small>
          </div>
          <div>
            <dt>Money out</dt>
            <dd>{fmt(r.totals.statementOut)}</dd>
            <small>Kipita has {fmt(r.totals.kipitaOut)}</small>
          </div>
          <div>
            <dt>M-Pesa fees</dt>
            <dd>{fmt(r.charges.total)}</dd>
            <small>{r.charges.lines.length} lines, not compared</small>
          </div>
          <div>
            <dt>Lines read</dt>
            <dd>{parsed.lines.length}</dd>
            <small>{parsed.skipped.length} not read</small>
          </div>
        </Totals>
        {compared === 0 && <Note $tone="info">Nothing to compare in this period.</Note>}
      </Card>

      <Section title="Money in, not in Kipita" sub="On the statement, but Kipita has no record." tone="problem" rows={r.receivedNoRecord} cols={lineCols} />
      <Section title="Money out, not in Kipita" sub="Left the account, but Kipita has no record." tone="problem" rows={r.paidOutNoRecord} cols={lineCols} />
      <Section
        title="Different amount"
        sub="Same receipt, different amount."
        tone="problem"
        rows={r.amountDiffers}
        cols={[
          { head: "Receipt", cell: (p) => <code>{p.line.receipt}</code> },
          { head: "Statement", right: true, cell: (p) => <Money>{fmt(p.line.amount)}</Money> },
          { head: "Kipita", right: true, cell: (p) => <Money>{fmt(p.record.amount)}</Money> },
          { head: "Difference", right: true, cell: (p) => <Money>{fmt(p.difference)}</Money> },
          { head: "Who", cell: (p) => [p.record.who, p.record.ref].filter(Boolean).join(" · ") },
        ]}
      />
      <Section
        title="Money went the other way"
        sub="Same receipt, but in where Kipita says out, or the reverse."
        tone="problem"
        rows={r.directionDiffers}
        cols={[
          { head: "Receipt", cell: (p) => <code>{p.line.receipt}</code> },
          { head: "Statement", cell: (p) => (p.line.direction === "in" ? "In" : "Out") },
          { head: "Kipita", cell: (p) => (p.record.kind === "payout" ? "Out" : "In") },
          { head: "Amount", right: true, cell: (p) => <Money>{fmt(p.line.amount)}</Money> },
          { head: "Who", cell: (p) => p.record.who ?? "" },
        ]}
      />
      <Section title="Not on the statement" sub="Kipita says paid, but the statement does not show it." tone="problem" rows={r.missingFromStatement} cols={recordCols} />
      <Section
        title="Same receipt twice (statement)"
        tone="problem"
        rows={r.duplicatesInStatement.flatMap((d) => d.lines)}
        cols={lineCols}
      />
      <Section
        title="Same receipt twice (Kipita)"
        tone="problem"
        rows={r.duplicatesInKipita.flatMap((d) => d.records)}
        cols={recordCols}
      />
      <Section title="Kipita records with no receipt" tone="problem" rows={r.recordsNoReceipt} cols={recordCols} />
      <Section title="Outside this statement" sub="Kipita records at times the statement does not cover." rows={r.notCovered} cols={recordCols} />
      <Section title="M-Pesa fees" rows={r.charges.lines} cols={lineCols} />
      <Section
        title="Rows not read"
        sub="Left out of the check."
        rows={parsed.skipped}
        cols={[
          { head: "Row", cell: (s) => s.row },
          { head: "Why", cell: (s) => s.reason },
          { head: "Text", cell: (s) => s.text },
        ]}
      />
    </Stack>
  );
}

function Reconcile() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [picks, setPicks] = useState<ColumnOverrides>({});
  const [parsed, setParsed] = useState<ParsedStatement | null>(null);
  const [result, setResult] = useState<Reconciliation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(csv: string, overrides: ColumnOverrides) {
    setError(null);
    setNote(null);
    setResult(null);
    const p = parseStatementCsv(csv, overrides);
    setParsed(p);
    if (p.missing.length > 0) return;
    if (p.lines.length === 0) {
      setError("No lines could be read from this file.");
      return;
    }

    // Kipita's records for the days the statement covers, a day either side so a payment at midnight still pairs up.
    let from = 0;
    let to = 0;
    let have = false;
    for (const l of p.lines) {
      if (l.at === null) continue;
      if (!have || l.at < from) from = l.at;
      if (!have || l.at > to) to = l.at;
      have = true;
    }
    if (have) {
      from -= DAY_MS;
      to += DAY_MS;
    } else {
      to = Date.now();
      from = to - 31 * DAY_MS;
      setNote("The statement has no readable times, so the last 31 days of Kipita records were used.");
    }

    setBusy(true);
    const res = await fetchReconcileDataAction(from, to);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(reconcile(p.lines, res.records));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("That file is too big. Use a statement of one month or less.");
      return;
    }
    const csv = await file.text();
    setText(csv);
    setFileName(file.name);
    setPicks({});
    await run(csv, {});
  }

  return (
    <Stack>
      <Card>
        <CardHead title="Check the M-Pesa statement" sub="Download the statement from the M-Pesa portal as a CSV, then choose the file. Nothing is saved." />
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={(e) => {
              const chosen = e.target.files?.[0];
              e.target.value = "";
              void onFile(chosen);
            }}
          />
          <Button $variant="tonal" disabled={busy} onClick={() => fileRef.current?.click()}>
            {text ? "Choose another file" : "Choose the CSV"}
          </Button>
          {fileName && <span style={{ fontSize: 12 }}>{fileName}</span>}
          {busy && <span style={{ fontSize: 12 }}>Checking…</span>}
        </div>
        {error && (
          <Note $tone="error" role="alert">
            {error}
          </Note>
        )}
        {note && <Note $tone="info">{note}</Note>}

        {parsed && parsed.missing.length > 0 && (
          <>
            <Note $tone="warning">
              {parsed.headers.length === 0
                ? "This does not look like a statement."
                : `We could not find the ${parsed.missing.map((m) => (m === "receipt" ? "receipt number" : "amount")).join(" or ")} column. Pick the columns.`}
            </Note>
            {parsed.headers.length > 0 && (
              <>
                <PickGrid>
                  {PICKS.map((p) => (
                    <Field key={p.key}>
                      {p.label}
                      <select value={picks[p.key] ?? ""} onChange={(e) => setPicks((cur) => ({ ...cur, [p.key]: e.target.value || undefined }))}>
                        <option value="">{p.need ? "Choose…" : "None"}</option>
                        {parsed.headers.filter(Boolean).map((h, i) => (
                          <option key={`${h}-${i}`} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </PickGrid>
                <div style={{ marginTop: 12 }}>
                  <Button $variant="primary" disabled={busy || !text} onClick={() => text && void run(text, picks)}>
                    Read the file
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {result && parsed && <Results r={result} parsed={parsed} />}
      {toast.node}
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const TAB_LABEL: { key: PayoutsTab; label: string; href: string }[] = [
  { key: "pay", label: "To pay", href: "/admin/payouts" },
  { key: "paid", label: "Paid", href: "/admin/payouts?tab=paid" },
  { key: "reconcile", label: "Reconcile", href: "/admin/payouts?tab=reconcile" },
];

export function PayoutsView({
  tab,
  queue,
  history,
  error,
}: {
  tab: PayoutsTab;
  queue: PayoutQueue | null;
  history: PayoutHistoryRow[] | null;
  error: string | null;
}) {
  return (
    <>
      <PageHeader title="Payouts" description="Pay each driver from the M-Pesa portal, then enter the receipt number here." />
      <Tabs role="tablist">
        {TAB_LABEL.map((t) => (
          <TabLink key={t.key} href={t.href} $on={tab === t.key} scroll={false}>
            {t.label}
            {t.key === "pay" && queue && queue.lines.length > 0 ? <b>{queue.lines.length}</b> : null}
          </TabLink>
        ))}
      </Tabs>

      {error && <EmptyState error title="Could not load payouts" body={error} />}
      {tab === "pay" && queue && <ToPay queue={queue} />}
      {tab === "paid" && history && <Paid history={history} />}
      {tab === "reconcile" && <Reconcile />}
    </>
  );
}
