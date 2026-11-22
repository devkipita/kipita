"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styled from "styled-components";
import { Phone } from "@/components/icons";
import { ago, dateTime, kes, shortDate, shortTime, type AdminProblemKind, type ProblemRow } from "@/lib/admin/console";
import { resolveProblemAction } from "@/lib/admin/console-actions";
import { Button, Card, EmptyState, Field, Modal, PageHeader, Pill, TabLink, type Tone, useToast } from "./ui";

export type ProblemsTab = "open" | "resolved";

const Tabs = styled.div`
  display: flex;
  gap: 22px;
  margin-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const Stack = styled.div`
  display: grid;
  gap: 12px;
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
  }
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
`;

const Money = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.color.text};
  font-size: 13px;
  font-weight: 700;

  span {
    color: ${({ theme }) => theme.color.muted};
    font-weight: 500;
  }
`;

const People = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  > div {
    padding: 9px 10px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  strong {
    color: ${({ theme }) => theme.color.text};
    font-size: 12px;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    width: max-content;
    color: ${({ theme }) => theme.color.primary};
    font-size: 12px;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Items = styled.ul`
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;

  li {
    padding: 10px 12px;
    border-radius: 10px;
    background: ${({ theme }) => theme.color.background};
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: ${({ theme }) => theme.color.text};
    font-size: 12px;
    font-weight: 700;
  }
  time {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
    font-weight: 500;
  }
  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.color.text};
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
`;

const Decide = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 10px;

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const Outcome = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.color.text};
  font-size: 13px;

  span {
    color: ${({ theme }) => theme.color.muted};
  }
`;

const KIND: Record<AdminProblemKind, string> = {
  never_picked_up: "Never picked up",
  not_dropped_off: "Not taken to the stop",
  unsafe_driving: "Unsafe driving",
  asked_for_cash: "Asked for extra money",
  other: "Something else",
  manual_board: "Marked on board by hand",
};

function Person({ label, who }: { label: string; who: ProblemRow["passenger"] }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{who.name ?? "Unknown"}</strong>
      {who.phone ? (
        <a href={`tel:${who.phone}`}>
          <Phone size={13} /> {who.phone}
        </a>
      ) : (
        <span>No number</span>
      )}
    </div>
  );
}

export function ProblemsView({ tab, rows, error }: { tab: ProblemsTab; rows: ProblemRow[] | null; error: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refunding, setRefunding] = useState<ProblemRow | null>(null);

  function decide(row: ProblemRow, outcome: "clear" | "refund") {
    const open = row.problems.find((p) => p.status === "open");
    if (!open) return;
    startTransition(async () => {
      const res = await resolveProblemAction(open.id, outcome, notes[row.booking_id] ?? "");
      setRefunding(null);
      if (res.ok) {
        toast.show(outcome === "refund" ? "Refunded to the passenger's wallet." : "Cleared.");
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
    });
  }

  return (
    <>
      <PageHeader title="Problems" description="Clear or refund each one before the morning payout." />
      <Tabs role="tablist">
        <TabLink href="/admin/problems" $on={tab === "open"} scroll={false}>
          Open{tab === "open" && rows ? <b>{rows.length}</b> : null}
        </TabLink>
        <TabLink href="/admin/problems?tab=resolved" $on={tab === "resolved"} scroll={false}>
          Resolved
        </TabLink>
      </Tabs>

      {error && <EmptyState error title="Could not load problems" body={error} />}
      {rows?.length === 0 && (
        <Card>
          <EmptyState title="Nothing to review" body={tab === "open" ? "Reports and by-hand boardings show up here." : "No decisions yet."} />
        </Card>
      )}

      <Stack>
        {rows?.map((row) => {
          const held = row.escrow_status === "held";
          const tones: [string, Tone][] = [];
          if (row.problems.some((p) => p.source === "passenger")) tones.push(["Passenger report", "warning"]);
          if (row.problems.some((p) => p.source === "manual_board")) tones.push(["By hand", "info"]);
          return (
            <Card key={row.booking_id}>
              <Head>
                <div>
                  <h2>
                    {row.from} → {row.to}
                  </h2>
                  <p>
                    {shortDate(row.departure_date)} · {shortTime(row.departure_time)}
                    {row.reference ? ` · ${row.reference}` : ""} · {row.seats} {row.seats === 1 ? "seat" : "seats"}
                  </p>
                </div>
                <Pills>
                  {tones.map(([label, tone]) => (
                    <Pill key={label} $tone={tone}>
                      {label}
                    </Pill>
                  ))}
                  {tab === "open" ? <Pill $tone="neutral">{ago(row.opened_at)}</Pill> : null}
                </Pills>
              </Head>

              <Money>
                {kes(row.amount)} <span>paid</span>
                {row.driver_earning != null ? (
                  <>
                    {" · "}
                    {kes(row.driver_earning)} <span>to the driver</span>
                  </>
                ) : null}
                {" · "}
                <span>
                  {held
                    ? row.release_due_at
                      ? `held, due ${dateTime(row.release_due_at)}`
                      : "held until the ride ends"
                    : (row.escrow_status ?? "not held")}
                </span>
              </Money>

              <People>
                <Person label="Passenger" who={row.passenger} />
                <Person label="Driver" who={row.driver} />
              </People>

              <Items>
                {row.problems.map((p) => (
                  <li key={p.id}>
                    <header>
                      {KIND[p.kind]}
                      <time>{ago(p.created_at)} ago</time>
                    </header>
                    <p>{p.note}</p>
                  </li>
                ))}
              </Items>

              {tab === "open" ? (
                <Decide>
                  <Field>
                    Note (optional)
                    <textarea
                      value={notes[row.booking_id] ?? ""}
                      maxLength={500}
                      onChange={(e) => setNotes((cur) => ({ ...cur, [row.booking_id]: e.target.value }))}
                    />
                  </Field>
                  <div>
                    <Button $variant="green" disabled={pending} onClick={() => decide(row, "clear")}>
                      Clear
                    </Button>
                    <Button $variant="danger" disabled={pending || !held} onClick={() => setRefunding(row)}>
                      Refund passenger
                    </Button>
                  </div>
                </Decide>
              ) : (
                <Outcome>
                  {row.problems[0]?.outcome === "refund" ? "Refunded" : "Cleared"}
                  {row.resolved_at ? <span> · {dateTime(row.resolved_at)}</span> : null}
                  {row.problems.find((p) => p.resolved_note)?.resolved_note ? (
                    <span> · {row.problems.find((p) => p.resolved_note)?.resolved_note}</span>
                  ) : null}
                </Outcome>
              )}
            </Card>
          );
        })}
      </Stack>

      {refunding && (
        <Modal
          title="Refund passenger?"
          close={() => setRefunding(null)}
          footer={
            <>
              <Button $variant="outline" onClick={() => setRefunding(null)} disabled={pending}>
                Cancel
              </Button>
              <Button $variant="danger" onClick={() => decide(refunding, "refund")} disabled={pending}>
                Refund {kes(refunding.amount)}
              </Button>
            </>
          }
        >
          <p>
            {kes(refunding.amount)} goes back to {refunding.passenger.name ?? "the passenger"}&rsquo;s wallet. The driver is not paid for this ride.
          </p>
        </Modal>
      )}
      {toast.node}
    </>
  );
}
