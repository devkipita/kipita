"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, CheckCircle as CheckCircle2, MapPin, CircleNotch as Loader2 } from "@/components/icons";
import styled, { keyframes } from "styled-components";
import { formatKes, type PendingRefund, type RefundDecision } from "@kipita/shared";
import { fetchPendingRefunds, resolveRefund } from "@/lib/refunds";
import { Empty, Notice, SmallButton } from "@/components/ui/primitives";

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

const Amount = styled.span`
  font-weight: 800;
  font-size: 1.25rem;
  background: ${({ theme }) => theme.color.warnBg};
  color: ${({ theme }) => theme.color.warnText};
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
`;

const Actions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 10px;
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.9rem;
`;

const TripRow = styled.div`
  color: ${({ theme }) => theme.color.textSoft};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const OkIcon = styled(CheckCircle2)`
  vertical-align: -5px;
  color: ${({ theme }) => theme.color.primary};
`;

export function RefundReview() {
  const [items, setItems] = useState<PendingRefund[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await fetchPendingRefunds());
    } catch {
      setError("Could not load refund requests. Check your access and try again.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (item: PendingRefund, decision: RefundDecision) => {
      const msg =
        decision === "approve"
          ? `Approve this refund? ${formatKes(item.amount)} will be returned to ${item.passenger?.full_name ?? "the passenger"}'s wallet.`
          : `Reject this refund? The fare will be released to the driver instead.`;
      if (!window.confirm(msg)) return;

      setBusy(item.id);
      setError("");
      try {
        await resolveRefund(item.id, decision);
        setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
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
        <Spinner size={18} style={{ verticalAlign: "-3px" }} /> Loading refund
        requests…
      </Empty>
    );
  }

  return (
    <List>
      {error && <Notice $variant="error">{error}</Notice>}

      {items.length === 0 && !error ? (
        <Empty>
          <OkIcon size={22} /> No refunds to review — you&apos;re all caught up.
        </Empty>
      ) : (
        items.map((item) => (
          <Row key={item.id}>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700 }}>
                {item.passenger?.full_name ?? "—"}
              </div>
              {item.booking?.booking_reference && (
                <Muted>{item.booking.booking_reference}</Muted>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              {item.booking?.trip && (
                <TripRow>
                  <MapPin size={15} />
                  {item.booking.trip.from_location} → {item.booking.trip.to_location}
                </TripRow>
              )}
              {item.reason && (
                <Muted style={{ marginTop: 4 }}>“{item.reason}”</Muted>
              )}
            </div>

            <Amount>{formatKes(item.amount)}</Amount>

            <Actions>
              <SmallButton
                $variant="reject"
                disabled={busy === item.id}
                onClick={() => act(item, "reject")}
              >
                <X size={16} />
                Reject
              </SmallButton>
              <SmallButton
                $variant="approve"
                disabled={busy === item.id}
                onClick={() => act(item, "approve")}
              >
                {busy === item.id ? (
                  <Spinner size={16} />
                ) : (
                  <Check size={16} />
                )}
                Approve
              </SmallButton>
            </Actions>
          </Row>
        ))
      )}
    </List>
  );
}
