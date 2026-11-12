"use client";

import styled from "styled-components";
import { ArrowRight, ArrowUUpLeft, CheckCircle, ShieldCheck, XCircle } from "@/components/icons";
import { dateTime, kes, type Payments, type PaymentTab } from "@/lib/admin/console";
import {
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  Money,
  PageHeader,
  StatusChip,
  TableScroll,
  TabLink,
  Tabs,
} from "./ui";

const Summary = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.article<{ $tone?: "error" }>`
  min-height: 82px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 14px;
  background: ${({ theme }) => theme.color.surface};

  > span {
    width: 38px;
    height: 38px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: ${({ theme, $tone }) => ($tone ? theme.color.error : theme.color.primary)};
    background: ${({ theme, $tone }) => ($tone ? theme.color.errorContainer : theme.color.primaryContainer)};
  }
  > div {
    display: flex;
    flex-direction: column;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
  strong {
    margin-top: 4px;
    font: 800 17px ${({ theme }) => theme.fontHeading};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Layout = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 278px;
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Side = styled(Card)`
  align-self: start;
  margin-top: 52px;

  > span {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: ${({ theme }) => theme.color.warning};
    background: ${({ theme }) => theme.color.warningContainer};
  }
  h2 {
    margin: 16px 0 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 15px;
    color: ${({ theme }) => theme.color.text};
  }
  > strong {
    display: block;
    margin-top: 5px;
    font: 800 24px ${({ theme }) => theme.fontHeading};
    color: ${({ theme }) => theme.color.text};
  }
  > p {
    margin: 6px 0 14px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 1100px) {
    margin-top: 0;
  }
`;

const ErrorText = styled.small`
  color: ${({ theme }) => theme.color.error} !important;
`;

const TABS: { key: PaymentTab; label: string; empty: string }[] = [
  { key: "escrow", label: "Escrow", empty: "No payments have entered escrow yet." },
  { key: "payouts", label: "Payouts", empty: "No payouts have been released yet." },
  { key: "refunds", label: "Refunds", empty: "No payments have been refunded." },
];

export function PaymentsView({ tab, data, error }: { tab: PaymentTab; data: Payments | null; error: string | null }) {
  const s = data?.summary;
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Track escrow, M-Pesa payouts and refunds."
        action={
          s && s.pending_refunds > 0 ? (
            <ButtonLink href="/admin/refunds">Review {s.pending_refunds} refunds</ButtonLink>
          ) : undefined
        }
      />
      <Summary>
        <SummaryCard>
          <span>
            <ShieldCheck size={20} />
          </span>
          <div>
            <small>Held in escrow</small>
            <strong>{s ? kes(s.held) : "—"}</strong>
          </div>
        </SummaryCard>
        <SummaryCard>
          <span>
            <CheckCircle size={20} />
          </span>
          <div>
            <small>Released today</small>
            <strong>{s ? kes(s.released_today) : "—"}</strong>
          </div>
        </SummaryCard>
        <SummaryCard>
          <span>
            <ArrowUUpLeft size={20} />
          </span>
          <div>
            <small>Refunded this week</small>
            <strong>{s ? kes(s.refunded_week) : "—"}</strong>
          </div>
        </SummaryCard>
        <SummaryCard $tone={s && s.failed_payouts > 0 ? "error" : undefined}>
          <span>
            <XCircle size={20} />
          </span>
          <div>
            <small>Failed payouts</small>
            <strong>{s ? s.failed_payouts : "—"}</strong>
          </div>
        </SummaryCard>
      </Summary>
      <Layout>
        <div>
          <Tabs>
            {TABS.map((t) => (
              <TabLink key={t.key} href={t.key === "escrow" ? "/admin/payments" : `/admin/payments?tab=${t.key}`} $on={tab === t.key} scroll={false}>
                {t.label}
              </TabLink>
            ))}
          </Tabs>
          <Card $flush style={{ marginTop: 12 }}>
            {error || !data ? (
              <EmptyState error title="We couldn't load payments" body={error ?? "Unknown error"} />
            ) : data.rows.length === 0 ? (
              <EmptyState title="Nothing here yet" body={current.empty} />
            ) : (
              <TableScroll>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Passenger</th>
                      <th>Driver</th>
                      <th>Amount</th>
                      <th>Kipita fee</th>
                      <th>Status</th>
                      <th>Receipt</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const state = tab === "payouts" && r.payout_status ? r.payout_status : r.escrow_status ?? r.status;
                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.reference ?? "—"}</strong>
                            <small>{r.method === "mpesa" ? "M-Pesa" : r.method ?? ""}</small>
                          </td>
                          <td>{r.passenger ?? "—"}</td>
                          <td>{r.driver ?? "—"}</td>
                          <td>
                            <Money>{kes(r.amount)}</Money>
                          </td>
                          <td>{r.platform_fee != null ? kes(r.platform_fee) : "—"}</td>
                          <td>
                            <StatusChip status={state} />
                          </td>
                          <td>{r.receipt ? <code>{r.receipt}</code> : "—"}</td>
                          <td>
                            <span className="primary">{dateTime(r.created_at)}</span>
                            {r.payout_status === "failed" && <ErrorText>Payout failed</ErrorText>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </TableScroll>
            )}
          </Card>
        </div>
        <Side>
          <span>
            <ArrowUUpLeft size={22} />
          </span>
          <h2>Refund requests</h2>
          <strong>{s ? `${s.pending_refunds} pending` : "—"}</strong>
          <p>Approving refunds the passenger&apos;s Kipita wallet. Rejecting releases the fare to the driver.</p>
          <ButtonLink $variant="outline" href="/admin/refunds">
            Review requests <ArrowRight size={16} />
          </ButtonLink>
        </Side>
      </Layout>
    </>
  );
}
