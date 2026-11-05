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
  gap: 10px;

  a {
    display: block;
    width: 64px;
    height: 64px;
    border-radius: ${({ theme }) => theme.radius.sm};
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.color.line};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

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
          ? `Approve ${name}? They will be able to publish rides immediately.`
          : `Reject ${name}? They will be told to resubmit, and cannot publish.`;
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
                <dt>Licence</dt>
                <dd>{item.license_number ?? "—"}</dd>
                <dt>National ID</dt>
                <dd>{item.national_id ?? "—"}</dd>
                {item.license_expiry && (
                  <>
                    <dt>Expires</dt>
                    <dd>{item.license_expiry}</dd>
                  </>
                )}
              </Docs>
            </div>
          </Who>

          {(item.license_photo || item.selfie_photo) && (
            <Shots>
              {item.license_photo && (
                <a href={item.license_photo} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.license_photo} alt="Licence" />
                </a>
              )}
              {item.selfie_photo && (
                <a href={item.selfie_photo} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.selfie_photo} alt="Selfie" />
                </a>
              )}
            </Shots>
          )}

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
