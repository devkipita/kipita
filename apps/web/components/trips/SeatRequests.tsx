"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { Clock, Star, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { answerSeatRequestAction, seatRequestAction } from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking } from "@/lib/trips/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { Chip } from "./BookingCard";

const arrive = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

const List = styled.div`
  display: grid;
  gap: 14px;
  padding-top: 18px;
`;

const Card = styled.article<{ $fresh: boolean }>`
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  background: ${nocturne.surface};
  animation: ${({ $fresh }) => ($fresh ? arrive : "none")} ${dur.enter} ${ease.enter};

  @media (min-width: 861px) {
    padding: 22px 26px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  b {
    font-size: 16px;
    font-weight: 800;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: ${nocturne.muted};
  }
  small svg {
    color: ${nocturne.star};
  }
`;

const Route = styled.ol`
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    display: grid;
    gap: 2px;
    padding-left: 26px;
  }
  li::before {
    content: "";
    position: absolute;
    left: 3px;
    top: 8px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2.5px ${nocturne.green};
    background: ${nocturne.surface};
  }
  li + li::before {
    background: ${nocturne.green};
  }
  li:first-child::after {
    content: "";
    position: absolute;
    left: 7px;
    top: 22px;
    bottom: -12px;
    border-left: 2px dashed ${nocturne.line2};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  small {
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const Fare = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid ${nocturne.line};
  font-size: 15px;
  color: ${nocturne.muted};

  b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
`;

const Btns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (min-width: 861px) {
    max-width: 420px;
    margin-left: auto;
    width: 100%;
  }
`;

const Btn = styled.button<{ $main?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  border-radius: 999px;
  border: 2px solid ${({ $main }) => ($main ? "transparent" : nocturne.green)};
  background: ${({ $main }) => ($main ? nocturne.green : nocturne.surface)};
  color: ${({ $main }) => ($main ? nocturne.onGreen : nocturne.green)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Err = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 0;
  font-weight: 700;
  color: ${nocturne.danger};
`;

const Empty = styled.p`
  margin: 0;
  padding: clamp(40px, 7vh, 72px) 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
`;

export function SeatRequests({
  initial,
  viewerId,
  onCount,
}: {
  initial: Booking[];
  viewerId: string;
  onCount?: (n: number) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ id: string; job: "accept" | "decline" } | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const { ask, confirmNode } = useConfirm();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    onCount?.(items.length);
  }, [items.length, onCount]);

  const receive = useCallback((row: { id: string; status: string }, event: "INSERT" | "UPDATE") => {
    if (row.status !== "requested") {
      setItems((prev) => prev.filter((b) => b.id !== row.id));
      setFresh((prev) => prev.filter((id) => id !== row.id));
      return;
    }
    if (event === "UPDATE") return;

    void seatRequestAction(row.id).then((booking) => {
      if (!booking) return;
      setItems((prev) => (prev.some((b) => b.id === booking.id) ? prev : [booking, ...prev]));
      setFresh((prev) => (prev.includes(booking.id) ? prev : [booking.id, ...prev]));
    });
  }, []);

  useBookingStream(`seat-requests:${viewerId}`, viewerId ? `driver_id=eq.${viewerId}` : null, receive);

  async function answer(booking: Booking, decision: "accept" | "decline", anchor: Element) {
    if (decision === "decline") {
      const ok = await ask(anchor, {
        title: "Decline request?",
        yes: "Decline request",
        no: "Keep request",
        danger: true,
      });
      if (!ok) return;
    }

    setBusy({ id: booking.id, job: decision });
    setError("");
    startTransition(async () => {
      const result = await answerSeatRequestAction(booking.id, decision);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        return;
      }
      setItems((prev) => prev.filter((b) => b.id !== booking.id));
      setFresh((prev) => prev.filter((id) => id !== booking.id));
      setBusy(null);
      router.refresh();
    });
  }

  if (items.length === 0) return <Empty>No requests right now</Empty>;

  return (
    <>
      {confirmNode}
      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}
      <List>
        {items.map((booking) => {
          const p = booking.passenger;
          const name = p?.full_name || "Kipita passenger";
          const seats = booking.seats_booked;
          const seatWord = seats === 1 ? "seat" : "seats";
          const perSeat = booking.trip?.price_per_seat ?? 0;
          const working = busy?.id === booking.id;

          return (
            <Card key={booking.id} $fresh={fresh.includes(booking.id)}>
              <Top>
                <Who>
                  <Avatar name={name} src={p?.avatar_url} size={44} />
                  <span>
                    <b>{name}</b>
                    <small>
                      {p?.rating ? (
                        <>
                          <Star size={13} weight="fill" /> {p.rating.toFixed(1)}
                          {p.total_trips ? ` · ${p.total_trips} trips` : ""}
                        </>
                      ) : (
                        "New to Kipita"
                      )}
                    </small>
                  </span>
                </Who>
                <Chip $tone="pay">
                  <Clock size={15} weight="bold" />
                  Needs reply
                </Chip>
              </Top>

              <Route>
                <li>
                  <b>{booking.trip?.from_location ?? "Pickup to confirm"}</b>
                  <small>
                    {formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm"} ·{" "}
                    {formatTripTime(booking.trip?.departure_time ?? null) || "time to confirm"}
                  </small>
                </li>
                <li>
                  <b>{booking.trip?.to_location ?? "Drop-off to confirm"}</b>
                  <small>
                    {seats} {seatWord} requested
                  </small>
                </li>
              </Route>

              <Fare>
                <span>{perSeat > 0 ? `${seats} ${seatWord} at ${formatCurrency(perSeat)}` : `${seats} ${seatWord}`}</span>
                <b>
                  You receive{" "}
                  {formatCurrency(
                    booking.service_fee != null ? booking.total_price - booking.service_fee : booking.total_price,
                  )}
                </b>
              </Fare>

              <Btns>
                <Btn type="button" onClick={(e) => answer(booking, "decline", e.currentTarget)} disabled={working}>
                  {working && busy?.job === "decline" && <ButtonOrb job="committing" />}
                  Decline request
                </Btn>
                <Btn
                  type="button"
                  $main
                  onClick={(e) => answer(booking, "accept", e.currentTarget)}
                  disabled={working}
                  aria-busy={working}
                >
                  {working && busy?.job === "accept" && <ButtonOrb job="committing" />}
                  Accept request
                </Btn>
              </Btns>
            </Card>
          );
        })}
      </List>
    </>
  );
}
