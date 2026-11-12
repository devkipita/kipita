"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { ArrowClockwise, ArrowUpRight, CaretRight, Check, Phone, SealCheck, Warning, XCircle } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ago, shortDate } from "@/lib/admin/console";
import {
  fetchDriverApplications,
  setDriverApproval,
  type DriverApplication,
  type ReviewStatus,
} from "@/lib/driver/admin";
import {
  Button,
  ConsequenceList,
  EmptyState,
  Modal,
  PageHeader,
  Skeleton,
  StatusChip,
  TabButton,
  useToast,
} from "./ui";

const Workspace = styled.section`
  min-height: 664px;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surface};

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const Queue = styled.aside`
  min-width: 0;
  border-right: 1px solid ${({ theme }) => theme.color.line};

  @media (max-width: 1000px) {
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const QueueTabs = styled.div`
  height: 52px;
  padding: 0 14px;
  display: flex;
  align-items: flex-end;
  gap: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const QueueList = styled.div`
  max-height: 612px;
  padding: 8px;
  overflow-y: auto;
`;

const QueueItem = styled.button<{ $on: boolean }>`
  width: 100%;
  min-height: 88px;
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.primary : "transparent")};
  border-radius: 12px;
  color: inherit;
  background: ${({ theme, $on }) => ($on ? theme.color.surfaceContainer : "transparent")};
  font: inherit;
  text-align: left;
  cursor: pointer;

  > span {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  strong {
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    margin-top: 2px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
  i {
    width: max-content;
    margin-top: 7px;
    padding: 3px 7px;
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: 6px;
    color: ${({ theme }) => theme.color.warning};
    background: ${({ theme }) => theme.color.warningContainer};
    font-size: 10px;
    font-style: normal;
  }
`;

const Review = styled.article`
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const ReviewHead = styled.header`
  min-height: 70px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 2px 0 0;
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const Checklist = styled.div`
  padding: 10px 18px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const CheckItem = styled.button<{ $on: boolean; $missing: boolean }>`
  min-width: 150px;
  min-height: 46px;
  padding: 6px 10px;
  display: grid;
  grid-template-columns: 26px 1fr;
  align-items: center;
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.line)};
  border-radius: 10px;
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme, $on }) => ($on ? theme.color.surfaceContainer : theme.color.surface)};
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;

  > span {
    grid-row: 1 / 3;
    width: 21px;
    height: 21px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: ${({ theme, $missing }) => ($missing ? theme.color.onError : theme.color.onPrimary)};
    background: ${({ theme, $missing }) => ($missing ? theme.color.error : theme.color.primary)};
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
`;

const DocGrid = styled.div`
  flex: 1;
  min-height: 0;
  padding: 14px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 0.8fr);
  gap: 14px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Viewer = styled.section`
  min-height: 380px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceVariant};

  > div:first-child {
    height: 44px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface};
    font-size: 11px;
    color: ${({ theme }) => theme.color.textSoft};
  }
  > div:first-child > div {
    display: flex;
  }
  > div:first-child a,
  > div:first-child button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }
  figure {
    flex: 1;
    margin: 0;
    padding: 16px;
    display: grid;
    place-items: center;
    overflow: auto;
  }
  img {
    max-width: 100%;
    max-height: 460px;
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(17, 43, 34, 0.13);
    transition: transform 0.2s ease;
  }
`;

const Match = styled.aside`
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: 12px;

  h3 {
    margin: 0 0 8px;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 13px;
    color: ${({ theme }) => theme.color.text};
  }
  > div {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
  > div:last-of-type {
    border-bottom: 0;
  }
  > div > span {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: 10px;
  }
  strong {
    margin-top: 2px;
    font-size: 12px;
    color: ${({ theme }) => theme.color.text};
    overflow-wrap: anywhere;
  }
  i {
    padding: 3px 7px;
    display: flex;
    flex: none;
    align-items: center;
    gap: 3px;
    border-radius: 6px;
    color: ${({ theme }) => theme.color.success};
    background: ${({ theme }) => theme.color.successContainer};
    font-size: 10px;
    font-style: normal;
  }
  i[data-warn] {
    color: ${({ theme }) => theme.color.warning};
    background: ${({ theme }) => theme.color.warningContainer};
  }
  i[data-bad] {
    color: ${({ theme }) => theme.color.error};
    background: ${({ theme }) => theme.color.errorContainer};
  }
`;

const Actions = styled.footer`
  min-height: 66px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid ${({ theme }) => theme.color.line};

  > span {
    margin-left: auto;
    color: ${({ theme }) => theme.color.muted};
    font-size: 11px;
  }
`;

const DOC_LABEL: Record<NonNullable<DriverApplication["document_type"]>, string> = {
  national_id: "National ID",
  driving_licence: "Driving licence",
  passport: "Passport",
};

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function documentsOf(item: DriverApplication) {
  const docs = [
    { label: item.document_type ? DOC_LABEL[item.document_type] : "Identity document", url: item.document_photo ?? item.license_photo },
    { label: "Profile photo", url: item.selfie_photo },
    { label: "Car photo", url: item.vehicle_photo },
  ];
  if (item.document_photo && item.license_photo) docs.push({ label: "Licence (earlier)", url: item.license_photo });
  return docs;
}

function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(`${date}T00:00:00+03:00`).getTime() - Date.now()) / 86400000);
}

function flagOf(item: DriverApplication) {
  const missing = documentsOf(item).filter((d) => !d.url).length;
  if (missing > 0) return `${missing} ${missing === 1 ? "photo" : "photos"} missing`;
  const left = daysUntil(item.license_expiry);
  if (left !== null && left < 0) return "Licence expired";
  if (left !== null && left <= 30) return `Licence expires in ${left} days`;
  if (item.waiting_rides > 0) return `${item.waiting_rides} saved ${item.waiting_rides === 1 ? "ride" : "rides"} waiting`;
  return null;
}

export function DriversView() {
  const router = useRouter();
  const [tab, setTab] = useState<ReviewStatus>("pending");
  const [items, setItems] = useState<DriverApplication[] | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docIndex, setDocIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async (status: ReviewStatus) => {
    setError("");
    setItems(null);
    try {
      const rows = await fetchDriverApplications(status);
      setItems(rows);
      setSelectedId(rows[0]?.user_id ?? null);
    } catch {
      setError("Could not load driver applications. Check your access and try again.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const selected = useMemo(() => items?.find((i) => i.user_id === selectedId) ?? null, [items, selectedId]);
  const docs = selected ? documentsOf(selected) : [];
  const doc = docs[Math.min(docIndex, docs.length - 1)];

  useEffect(() => {
    setDocIndex(0);
    setRotation(0);
  }, [selectedId]);

  const act = async () => {
    if (!selected || !confirm) return;
    setBusy(true);
    try {
      await setDriverApproval(selected.user_id, confirm);
      const name = selected.full_name ?? "Driver";
      toast.show(confirm === "approved" ? `${name} can now publish trips.` : `${name} was asked to resubmit.`);
      const rest = items?.filter((i) => i.user_id !== selected.user_id) ?? [];
      setItems(rest);
      setSelectedId(rest[0]?.user_id ?? null);
      router.refresh();
    } catch {
      toast.show("The decision was not saved. Try again.", true);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const left = selected ? daysUntil(selected.license_expiry) : null;
  const name = selected?.full_name ?? "this driver";

  return (
    <>
      <PageHeader
        title="Driver verification"
        description="Check identity, licence and vehicle photos before a driver goes live."
        action={
          selected && tab !== "approved" ? (
            <Button onClick={() => setConfirm("approved")}>
              <SealCheck size={17} />
              Approve driver
            </Button>
          ) : undefined
        }
      />
      <Workspace>
        <Queue>
          <QueueTabs role="tablist" aria-label="Application status">
            {TABS.map((t) => (
              <TabButton key={t.key} role="tab" aria-selected={tab === t.key} $on={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
                {tab === t.key && items ? <b>{items.length}</b> : null}
              </TabButton>
            ))}
          </QueueTabs>
          <QueueList>
            {items === null && <Skeleton rows={5} />}
            {error && <EmptyState error title="Could not load the queue" body={error} action={<Button $variant="outline" onClick={() => load(tab)}>Retry</Button>} />}
            {items?.length === 0 && !error && (
              <EmptyState title="Nothing here" body={tab === "pending" ? "Every driver has been reviewed." : `No ${tab} applications.`} />
            )}
            {items?.map((item) => {
              const flag = flagOf(item);
              return (
                <QueueItem key={item.user_id} type="button" $on={item.user_id === selectedId} onClick={() => setSelectedId(item.user_id)}>
                  <Avatar name={item.full_name || "Driver"} src={item.selfie_photo ?? item.avatar_url} size={36} />
                  <span>
                    <strong>{item.full_name || "Unnamed driver"}</strong>
                    <small>{item.submitted_at ? `Submitted ${ago(item.submitted_at)} ago` : "Submitted"}</small>
                    <small>{documentsOf(item).filter((d) => d.url).length} of {documentsOf(item).length} photos</small>
                    {flag && (
                      <i>
                        <Warning size={12} />
                        {flag}
                      </i>
                    )}
                  </span>
                  <CaretRight size={16} />
                </QueueItem>
              );
            })}
          </QueueList>
        </Queue>
        <Review>
          {!selected ? (
            <EmptyState title="Select an application" body="Pick a driver from the queue to review their documents." />
          ) : (
            <>
              <ReviewHead>
                <div>
                  <Avatar name={selected.full_name || "Driver"} src={selected.avatar_url} size={40} />
                  <span>
                    <h2>{selected.full_name || "Unnamed driver"}</h2>
                    {selected.phone && (
                      <p>
                        <Phone size={13} />
                        {selected.phone}
                      </p>
                    )}
                  </span>
                </div>
                <StatusChip status={selected.approval_status} />
              </ReviewHead>
              <Checklist>
                {docs.map((d, i) => (
                  <CheckItem key={d.label} type="button" $on={i === docIndex} $missing={!d.url} onClick={() => setDocIndex(i)}>
                    <span>{d.url ? <Check size={13} /> : <XCircle size={13} />}</span>
                    {d.label}
                    <small>{d.url ? "Uploaded" : "Missing"}</small>
                  </CheckItem>
                ))}
              </Checklist>
              <DocGrid>
                <Viewer>
                  <div>
                    <span>{doc?.label}</span>
                    <div>
                      {doc?.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label="Open full size">
                          <ArrowUpRight size={18} />
                        </a>
                      )}
                      <button type="button" aria-label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
                        <ArrowClockwise size={18} />
                      </button>
                    </div>
                  </div>
                  <figure>
                    {doc?.url ? (
                      <img src={doc.url} alt={`${doc.label} for ${name}`} style={{ transform: `rotate(${rotation}deg)` }} />
                    ) : (
                      <EmptyState error title="Not uploaded" body={`${name} has not sent this photo yet.`} />
                    )}
                  </figure>
                </Viewer>
                <Match>
                  <h3>Profile details</h3>
                  <div>
                    <span>
                      <small>Full name</small>
                      <strong>{selected.full_name ?? "—"}</strong>
                    </span>
                  </div>
                  {selected.document_type ? (
                    <div>
                      <span>
                        <small>{DOC_LABEL[selected.document_type]} number</small>
                        <strong>{selected.document_number ?? "—"}</strong>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span>
                          <small>Licence number</small>
                          <strong>{selected.license_number ?? "—"}</strong>
                        </span>
                      </div>
                      <div>
                        <span>
                          <small>National ID</small>
                          <strong>{selected.national_id ?? "—"}</strong>
                        </span>
                      </div>
                    </>
                  )}
                  <div>
                    <span>
                      <small>Licence expiry</small>
                      <strong>{selected.license_expiry ? shortDate(selected.license_expiry) : "Not given"}</strong>
                    </span>
                    {left !== null &&
                      (left < 0 ? (
                        <i data-bad="">
                          <XCircle size={12} />
                          Expired
                        </i>
                      ) : left <= 30 ? (
                        <i data-warn="">
                          <Warning size={12} />
                          {left} days
                        </i>
                      ) : (
                        <i>
                          <Check size={12} />
                          Valid
                        </i>
                      ))}
                  </div>
                  <div>
                    <span>
                      <small>Saved rides</small>
                      <strong>{selected.waiting_rides} waiting for approval</strong>
                    </span>
                  </div>
                </Match>
              </DocGrid>
              <Actions>
                {tab !== "rejected" && (
                  <Button $variant="danger" onClick={() => setConfirm("rejected")}>
                    {tab === "approved" ? "Revoke approval" : "Reject"}
                  </Button>
                )}
                {tab !== "approved" && (
                  <Button $variant="green" onClick={() => setConfirm("approved")}>
                    <SealCheck size={17} />
                    Approve
                  </Button>
                )}
                <span>Decisions are recorded in the audit log.</span>
              </Actions>
            </>
          )}
        </Review>
      </Workspace>
      {confirm && selected && (
        <Modal
          title={confirm === "approved" ? `Approve ${name}` : tab === "approved" ? `Revoke ${name}` : `Reject ${name}`}
          close={() => setConfirm(null)}
          footer={
            <>
              <Button $variant="secondary" onClick={() => setConfirm(null)}>
                Go back
              </Button>
              <Button $variant={confirm === "approved" ? "green" : "danger"} onClick={act} disabled={busy} aria-busy={busy}>
                {confirm === "approved" ? "Approve driver" : "Reject application"}
              </Button>
            </>
          }
        >
          {confirm === "approved"
            ? `${name} can publish rides immediately and the account is marked verified.`
            : `${name} will be asked to send their details again.`}
          <ConsequenceList>
            <div>
              <dt>Photos</dt>
              <dd>
                {docs.filter((d) => d.url).length} of {docs.length} uploaded
              </dd>
            </div>
            <div>
              <dt>Saved rides</dt>
              <dd>
                {selected.waiting_rides === 0
                  ? "None"
                  : confirm === "approved"
                    ? `${selected.waiting_rides} go live`
                    : `${selected.waiting_rides} cancelled`}
              </dd>
            </div>
          </ConsequenceList>
        </Modal>
      )}
      {toast.node}
    </>
  );
}
