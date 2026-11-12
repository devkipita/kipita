"use client";

import { useCallback, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  CheckCircle as CheckCircle2,
  CircleNotch as Loader2,
  Phone,
  SealCheck,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Empty, Notice, SmallButton } from "@/components/ui/primitives";
import {
  fetchDriverApplications,
  setDriverApproval,
  type DriverApplication,
} from "@/lib/driver/admin";

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`;

const List = styled.div`
  display: grid;
  gap: 16px;
`;

const Row = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 20px 24px;
  border: 1px solid ${({ theme }) => theme.color.line};
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  .name {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.text};
  }
`;

const Docs = styled.dl`
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 18px;
  margin: 6px 0 0;

  dt {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.color.muted};
  }
  dd {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    color: ${({ theme }) => theme.color.text};
  }
`;

const Shots = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  a,
  .missing {
    display: grid;
    place-items: center;
    width: 112px;
    height: 84px;
    border-radius: ${({ theme }) => theme.radius.sm};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.color.line};
  }
  .missing {
    border-style: dashed;
    font-size: 0.8rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.error};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  figcaption {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const DOC_LABEL: Record<NonNullable<DriverApplication["document_type"]>, string> = {
  national_id: "National ID",
  driving_licence: "Driving licence",
  passport: "Passport",
};

function documentsOf(item: DriverApplication) {
  const docs = [
    { label: item.document_type ? DOC_LABEL[item.document_type] : "Document", url: item.document_photo ?? item.license_photo },
    { label: "Profile photo", url: item.selfie_photo },
    { label: "Car", url: item.vehicle_photo },
  ];
  if (item.document_photo && item.license_photo) docs.push({ label: "Licence (earlier)", url: item.license_photo });
  return docs;
}

function hasAllDocuments(item: DriverApplication) {
  return !!((item.document_photo || item.license_photo) && item.selfie_photo && item.vehicle_photo);
}

const Actions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 10px;
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export function DriverReview() {
  const [items, setItems] = useState<DriverApplication[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await fetchDriverApplications());
    } catch {
      setError("Could not load driver applications. Check your access and try again.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (item: DriverApplication, status: "approved" | "rejected") => {
      const name = item.full_name ?? "this driver";
      const msg =
        status === "approved"
          ? `${hasAllDocuments(item) ? "" : `${name} is missing at least one photo. `}Approve ${name}? They can publish rides immediately${
              item.waiting_rides > 0 ? `, and their ${item.waiting_rides} saved ${item.waiting_rides === 1 ? "ride goes" : "rides go"} live now` : ""
            }.`
          : `Reject ${name}? They will be asked to send their details again${
              item.waiting_rides > 0 ? `, and their ${item.waiting_rides} saved ${item.waiting_rides === 1 ? "ride is" : "rides are"} cancelled` : ""
            }.`;
      if (!window.confirm(msg)) return;

      setBusy(item.user_id);
      setError("");
      try {
        await setDriverApproval(item.user_id, status);
        setItems((prev) => prev?.filter((i) => i.user_id !== item.user_id) ?? null);
      } catch {
        setError("That action failed. Please try again.");
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  if (items === null) {
    return (
      <Empty>
        <Spinner size={18} style={{ verticalAlign: "-3px" }} /> Loading driver
        applications…
      </Empty>
    );
  }

  return (
    <List>
      {error && <Notice $variant="error">{error}</Notice>}

      {items.length === 0 && !error && (
        <Empty>
          <CheckCircle2 size={18} style={{ verticalAlign: "-3px" }} /> No
          applications waiting. Every driver has been reviewed.
        </Empty>
      )}

      {items.map((item) => (
        <Row key={item.user_id}>
          <Who>
            <Avatar
              name={item.full_name || "Driver"}
              src={item.avatar_url}
              size={52}
            />
            <div>
              <div className="name">{item.full_name || "Unnamed driver"}</div>
              {item.phone && (
                <Muted>
                  <Phone size={14} /> {item.phone}
                </Muted>
              )}
              <Docs>
                {item.document_type ? (
                  <>
                    <dt>{DOC_LABEL[item.document_type]}</dt>
                    <dd>{item.document_number ?? "—"}</dd>
                  </>
                ) : (
                  <>
                    <dt>Licence</dt>
                    <dd>{item.license_number ?? "—"}</dd>
                    <dt>National ID</dt>
                    <dd>{item.national_id ?? "—"}</dd>
                  </>
                )}
                {item.waiting_rides > 0 && (
                  <>
                    <dt>Saved rides</dt>
                    <dd>{item.waiting_rides} waiting</dd>
                  </>
                )}
              </Docs>
            </div>
          </Who>

          <Shots>
            {documentsOf(item).map((doc) => (
              <figure key={doc.label}>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={doc.url} alt={`${doc.label} for ${item.full_name || "this driver"}`} />
                  </a>
                ) : (
                  <span className="missing">Missing</span>
                )}
                <figcaption>{doc.label}</figcaption>
              </figure>
            ))}
          </Shots>

          <Actions>
            <SmallButton
              type="button"
              $variant="reject"
              onClick={() => act(item, "rejected")}
              disabled={busy === item.user_id}
            >
              Reject
            </SmallButton>
            <SmallButton
              type="button"
              $variant="approve"
              onClick={() => act(item, "approved")}
              disabled={busy === item.user_id}
              aria-busy={busy === item.user_id}
            >
              <SealCheck size={15} weight="fill" /> Approve
            </SmallButton>
          </Actions>
        </Row>
      ))}
    </List>
  );
}
