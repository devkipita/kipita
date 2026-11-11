"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { ArrowRight, CalendarBlank, Clock, Users, Warning } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import {
  answerSeatRequestAction,
  seatRequestAction,
} from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking } from "@/lib/trips/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const Section = styled.section`
  margin: clamp(26px, 4vh, 38px) 0 clamp(30px, 4.5vh, 46px);
  padding-bottom: clamp(26px, 4vh, 36px);
  border-bottom: 1.5px solid ${RULE};

  > h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 6px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 800;
    letter-spacing: -0.033em;
    line-height: 1.08;
    color: ${nocturne.cream};
  }
  > p {
    margin: 0 0 20px;
    max-width: 58ch;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

const arrive = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: none; }
`;

const Row = styled.div<{ $fresh?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px 32px;
  padding: clamp(18px, 2.4vh, 24px) 0;

  & + & {
    border-top: 1.5px solid ${RULE};
  }

  ${({ $fresh }) =>
    $fresh &&
    css`
      animation: ${arrive} 0.34s cubic-bezier(0.2, 0.8, 0.2, 1) both;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const New = styled.span`
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin-left: 10px;
  padding: 0 9px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  .name {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(19px, 2vw, 23px);
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${nocturne.cream};
  }
  .route {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    margin-top: 4px;
    font-size: 16px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .route svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 15px;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  b {
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Acts = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 760px) {
    width: 100%;
    > * {
      flex: 1;
    }
  }
`;

const Act = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 20px;
  border: 1.5px solid
    ${({ $primary }) => ($primary ? "transparent" : RULE)};
  border-radius: 999px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $primary }) => ($primary ? nocturne.ctaBg : "transparent")};
  color: ${({ $primary }) => ($primary ? nocturne.ctaFg : nocturne.cream)};
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    transform 0.16s ease;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ $primary }) =>
        $primary ? nocturne.green : nocturne.surface2};
      color: ${({ $primary }) =>
        $primary ? nocturne.onGreen : nocturne.accent};
      border-color: ${({ $primary }) =>
        $primary ? "transparent" : nocturne.accent};
      transform: translateY(-1px);
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

const Err = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 600;
  color: ${nocturne.cream};

  svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.ctaBg};
  }
`;

export function SeatRequests({
  initial,
  viewerId,
}: {
  initial: Booking[];
  viewerId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const receive = useCallback(
    (row: { id: string; status: string }, event: "INSERT" | "UPDATE") => {
      if (row.status !== "requested") {
        setItems((prev) => prev.filter((b) => b.id !== row.id));
        setFresh((prev) => prev.filter((id) => id !== row.id));
        return;
      }
      if (event === "UPDATE") return;

      void seatRequestAction(row.id).then((booking) => {
        if (!booking) return;
        setItems((prev) =>
          prev.some((b) => b.id === booking.id) ? prev : [booking, ...prev],
        );
        setFresh((prev) => (prev.includes(booking.id) ? prev : [booking.id, ...prev]));
      });
    },
    [],
  );

  useBookingStream(
    `seat-requests:${viewerId}`,
    viewerId ? `driver_id=eq.${viewerId}` : null,
    receive,
  );

  if (items.length === 0) return null;

  function answer(booking: Booking, decision: "accept" | "decline") {
    if (decision === "decline") {
      const name = booking.passenger?.full_name ?? "this passenger";
      if (!window.confirm(`Decline ${name}'s request? They will be told.`)) return;
    }

    setBusy(booking.id);
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

  return (
    <Section>
      <h2>
        Seat requests <Count>{items.length}</Count>
      </h2>
      <p>
        Passengers waiting on you, live as they arrive. Accepting holds the seat
        for 30 minutes and asks them to pay; nothing is charged until they do.
      </p>

      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}

      {items.map((booking) => (
        <Row key={booking.id} $fresh={fresh.includes(booking.id)}>
          <Who>
            <Avatar
              name={booking.passenger?.full_name || "Kipita passenger"}
              src={booking.passenger?.avatar_url}
              size={56}
            />
            <div>
              <div className="name">
                {booking.passenger?.full_name || "Kipita passenger"}
                {fresh.includes(booking.id) && <New>New</New>}
              </div>
              <div className="route">
                <span>{booking.trip?.from_location ?? "—"}</span>
                <ArrowRight size={17} aria-hidden />
                <span>{booking.trip?.to_location ?? "—"}</span>
              </div>
              <Facts>
                <li>
                  <CalendarBlank size={16} />
                  {formatTripDate(booking.trip?.departure_date ?? null) ||
                    "Date to confirm"}
                </li>
                <li>
                  <Clock size={16} />
                  {formatTripTime(booking.trip?.departure_time ?? null) ||
                    "Time to confirm"}
                </li>
                <li>
                  <Users size={16} />
                  {booking.seats_booked}{" "}
                  {booking.seats_booked === 1 ? "seat" : "seats"}
                </li>
                <li>
                  <b>{formatCurrency(booking.total_price)}</b>
                </li>
              </Facts>
            </div>
          </Who>

          <Acts>
            <Act
              type="button"
              onClick={() => answer(booking, "decline")}
              disabled={busy === booking.id}
            >
              Decline
            </Act>
            <Act
              $primary
              type="button"
              onClick={() => answer(booking, "accept")}
              disabled={busy === booking.id}
              aria-busy={busy === booking.id}
            >
              {busy === booking.id ? (
                <>
                  <ButtonOrb job="committing" /> Saving…
                </>
              ) : (
                "Accept"
              )}
            </Act>
          </Acts>
        </Row>
      ))}
    </Section>
  );
}
