"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import styled from "styled-components";
import { Car, Info, Package, Phone, Shield, User, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ago, dateTime, kes, shortDate, tripCode, type ReportRow, type ReportStatus } from "@/lib/admin/console";
import { setReportStatusAction } from "@/lib/admin/console-actions";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Eyebrow,
  Note,
  PageHeader,
  Pill,
  StatusChip,
  TabLink,
  type Tone,
  useToast,
} from "./ui";

export type DisputesTab = "open" | "reviewing" | "closed";

const Layout = styled.div`
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const List = styled(Card)`
  max-height: 680px;
  padding: 0;
  overflow-y: auto;
`;

const ListTabs = styled.div`
  position: sticky;
  z-index: 1;
  top: 0;
  height: 52px;
  padding: 0 14px;
  display: flex;
  align-items: flex-end;
  gap: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`;

const CaseButton = styled.button<{ $on: boolean }>`
  width: 100%;
  min-height: 84px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: inherit;
  background: ${({ theme, $on }) => ($on ? theme.color.surfaceContainer : "transparent")};
  box-shadow: ${({ theme, $on }) => ($on ? `inset 4px 0 ${theme.color.primary}` : "none")};
  font: inherit;
  text-align: left;
  cursor: pointer;

  > span:first-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    margin-top: 3px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  time {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
`;

const Detail = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 12px;
  align-items: start;

  @media (max-width: 1250px) {
    grid-template-columns: 1fr;
  }
`;

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 4px 0 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const Parties = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  > div {
    min-height: 64px;
    padding: 9px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: 10px;
    color: ${({ theme }) => theme.color.textSoft};
  }
  > div > span {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  strong {
    margin-top: 2px;
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  em {
    margin-top: 2px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
    font-style: normal;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Statement = styled.section`
  margin-top: 16px;

  h3 {
    margin: 0 0 8px;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  blockquote {
    margin: 0;
    padding: 12px 14px;
    border-radius: 10px;
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.background};
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
`;

const Decision = styled(Card)`
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    color: ${({ theme }) => theme.color.text};
  }
  > div {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }
  > div > * {
    width: 100%;
  }
  > p {
    margin: 12px 0 0;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const TYPE: Record<ReportRow["type"], { label: string; tone: Tone; icon: typeof Shield }> = {
  safety: { label: "Safety", tone: "error", icon: Shield },
  user: { label: "User report", tone: "warning", icon: User },
  lost_item: { label: "Lost item", tone: "info", icon: Package },
};

function titleOf(r: ReportRow) {
  if (r.reason) return r.reason.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return TYPE[r.type].label;
}

function shortId(id: string) {
  return `DS-${id.slice(0, 6).toUpperCase()}`;
}

const NEXT: Record<ReportStatus, { status: ReportStatus; label: string; variant: "green" | "outline" | "secondary" | "danger" }[]> = {
  open: [
    { status: "reviewing", label: "Start investigating", variant: "green" },
    { status: "resolved", label: "Mark resolved", variant: "outline" },
    { status: "dismissed", label: "Dismiss", variant: "secondary" },
  ],
  reviewing: [
    { status: "resolved", label: "Mark resolved", variant: "green" },
    { status: "dismissed", label: "Dismiss", variant: "secondary" },
    { status: "open", label: "Move back to open", variant: "secondary" },
  ],
  resolved: [{ status: "open", label: "Reopen case", variant: "outline" }],
  dismissed: [{ status: "open", label: "Reopen case", variant: "outline" }],
};

export function DisputesView({ tab, rows, error, safetyOpen }: { tab: DisputesTab; rows: ReportRow[] | null; error: string | null; safetyOpen: ReportRow | null }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(rows?.[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedId((cur) => (rows?.some((r) => r.id === cur) ? cur : rows?.[0]?.id ?? null));
  }, [rows]);

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const move = (status: ReportStatus) => {
    if (!selected) return;
    startTransition(async () => {
      const res = await setReportStatusAction(selected.id, status);
      if (res.ok) {
        toast.show(`${shortId(selected.id)} moved to ${status === "reviewing" ? "investigating" : status}.`);
        router.refresh();
      } else {
        toast.show(res.error, true);
      }
    });
  };

  const tabs: { key: DisputesTab; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "reviewing", label: "Investigating" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <>
      <PageHeader title="Disputes and safety" description="Investigate trip issues, protect riders and make consistent decisions." />
      {safetyOpen && (
        <Banner $tone="error">
          <Warning size={20} />
          <span>
            <strong>Open safety report</strong> · {safetyOpen.reporter.name ?? "A rider"}
            {safetyOpen.booking ? ` · ${safetyOpen.booking.from} → ${safetyOpen.booking.to}` : ""} · {ago(safetyOpen.created_at)} ago
          </span>
          {tab !== "open" && <a href="/admin/disputes">Open queue</a>}
        </Banner>
      )}
      <Layout>
        <List>
          <ListTabs role="tablist">
            {tabs.map((t) => (
              <TabLink key={t.key} href={t.key === "open" ? "/admin/disputes" : `/admin/disputes?tab=${t.key}`} $on={tab === t.key} scroll={false}>
                {t.label}
                {tab === t.key && rows ? <b>{rows.length}</b> : null}
              </TabLink>
            ))}
          </ListTabs>
          {error && <EmptyState error title="Could not load cases" body={error} />}
          {rows?.length === 0 && <EmptyState title="No cases" body={tab === "open" ? "Nothing waiting. Reports from riders land here." : "Nothing in this list."} />}
          {rows?.map((r) => (
            <CaseButton key={r.id} type="button" $on={r.id === selectedId} onClick={() => setSelectedId(r.id)}>
              <span>
                <strong>{titleOf(r)}</strong>
                <small>
                  {shortId(r.id)}
                  {r.booking?.reference ? ` · ${r.booking.reference}` : ""}
                </small>
                <small>{r.description}</small>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <Pill $tone={TYPE[r.type].tone}>{TYPE[r.type].label}</Pill>
                <time>{ago(r.created_at)}</time>
              </span>
            </CaseButton>
          ))}
        </List>
        {!selected ? (
          <Card>
            <EmptyState title="Select a case" body="Pick a case from the list to see the full report." />
          </Card>
        ) : (
          <Detail>
            <Card>
              <Head>
                <div>
                  <Eyebrow>
                    {shortId(selected.id)} · {TYPE[selected.type].label}
                  </Eyebrow>
                  <h2>{titleOf(selected)}</h2>
                  <p>Filed {dateTime(selected.created_at)}</p>
                </div>
                <StatusChip status={selected.status} />
              </Head>
              <Parties>
                <div>
                  <Avatar name={selected.reporter.name || "Reporter"} src={selected.reporter.avatar} size={32} />
                  <span>
                    <small>Reported by</small>
                    <strong>{selected.reporter.name ?? "Unknown"}</strong>
                    <em>{selected.reporter.phone ?? selected.contact ?? "No contact"}</em>
                  </span>
                </div>
                <div>
                  {selected.reported ? (
                    <>
                      <Avatar name={selected.reported.name || "User"} src={selected.reported.avatar} size={32} />
                      <span>
                        <small>About</small>
                        <strong>{selected.reported.name ?? "Unknown"}</strong>
                        <em>{selected.reported.phone ?? ""}</em>
                      </span>
                    </>
                  ) : (
                    <>
                      <User size={22} />
                      <span>
                        <small>About</small>
                        <strong>No person named</strong>
                      </span>
                    </>
                  )}
                </div>
                <div>
                  <Car size={22} />
                  <span>
                    <small>Trip</small>
                    {selected.booking ? (
                      <>
                        <strong>
                          {selected.booking.from} → {selected.booking.to}
                        </strong>
                        <em>
                          {tripCode(selected.booking.trip_id)} · {shortDate(selected.booking.departure_date)}
                        </em>
                      </>
                    ) : (
                      <strong>Not linked</strong>
                    )}
                  </span>
                </div>
              </Parties>
              <Statement>
                <h3>Statement</h3>
                <blockquote>{selected.description}</blockquote>
              </Statement>
              {selected.contact && (
                <Note $tone="neutral">
                  <Phone size={15} />
                  Preferred contact: {selected.contact}
                </Note>
              )}
            </Card>
            <Decision>
              <h2>Decision</h2>
              <div>
                {NEXT[selected.status].map((a) => (
                  <Button key={a.status} $variant={a.variant} onClick={() => move(a.status)} disabled={pending}>
                    {a.label}
                  </Button>
                ))}
                {selected.booking && (
                  <ButtonLink $variant="secondary" href="/admin/refunds">
                    Refund {kes(selected.booking.total)}
                  </ButtonLink>
                )}
              </div>
              <Note>
                <Info size={15} />
                Status changes are recorded in the audit log. Refunds go through the refund queue.
              </Note>
            </Decision>
          </Detail>
        )}
      </Layout>
      {toast.node}
    </>
  );
}
