"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import styled, { useTheme } from "styled-components";
import { ArrowRight, CalendarBlank, Clock, Users } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { cancelBookingAction } from "@/lib/trips/booking-actions";
import type { Booking } from "@/lib/trips/types";
import { STATUS_ICON, STATUS_LABEL, statusTone } from "./statusTone";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const LADDER: Booking["status"][] = [
  "requested",
  "pending_payment",
  "confirmed",
  "in_progress",
  "completed",
];

const Meter = styled.span`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 4px;
  width: min(220px, 100%);
  margin-top: 10px;
  pointer-events: none;

  i {
    flex: 1;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--n-accent) 22%, transparent);
    transition: background-color 0.4s ease;
  }
  i[data-on] {
    background: ${nocturne.accent};
  }
`;

function useCountdown(iso: string | null): string | null {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (!Number.isFinite(ms) || ms <= 0) {
        setLeft(null);
        return;
      }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setLeft(`${mins}:${String(secs).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  return left;
}

const Row = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px 32px;
  padding: clamp(20px, 2.6vh, 28px) 14px;
  margin-inline: -14px;
  border-radius: 14px;
  transition: background-color 0.16s ease;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
    &:hover .route {
      color: ${nocturne.accent};
    }
    &:hover .route svg {
      transform: translateX(4px);
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover .route svg {
      transform: none;
    }
  }
`;

const Open = styled(Link)`
  text-decoration: none;
  color: inherit;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 14px;
  }
  &:focus-visible::after {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Acts = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const Act = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border: 1.5px solid ${({ $primary }) => ($primary ? "transparent" : RULE)};
  border-radius: 999px;
  font: inherit;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $primary }) => ($primary ? nocturne.ctaBg : "transparent")};
  color: ${({ $primary }) => ($primary ? nocturne.ctaFg : nocturne.muted)};
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ $primary }) =>
        $primary ? nocturne.green : nocturne.surface};
      color: ${({ $primary }) => ($primary ? nocturne.onGreen : nocturne.cream)};
      border-color: ${({ $primary }) => ($primary ? "transparent" : nocturne.accent)};
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Expiry = styled.span<{ $soon: boolean }>`
  font-size: 13.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $soon }) => ($soon ? nocturne.ctaBg : nocturne.muted)};
`;

const Main = styled.div`
  min-width: 0;
`;

const Status = styled.p<{ $on: string }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: ${({ $on }) => $on};

  svg {
    flex: none;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }
  em {
    font-style: normal;
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 0.72;
  }
`;

const Route = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(23px, 2.5vw, 31px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.032em;
  color: ${nocturne.cream};
  transition: color 0.16s ease;

  svg {
    flex: none;
    color: ${nocturne.accent};
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 12px 0 0;
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
`;

const Side = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .who {
    min-width: 0;
    text-align: right;
  }
  .name {
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.cream};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fare {
    margin-top: 2px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }

  @media (max-width: 720px) {
    justify-content: flex-start;
    padding-top: 16px;
    border-top: 1.5px solid ${RULE};

    .who {
      text-align: left;
    }
  }
`;

export function BookingCard({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId: string;
}) {
  const theme = useTheme();
  const tone = statusTone(theme, booking.status);
  const Icon = STATUS_ICON[booking.status];

  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const destination = booking.trip?.to_location ?? "Trip";
  const origin = booking.trip?.from_location ?? "";
  const live = booking.status === "in_progress";
  const step = LADDER.indexOf(booking.status);

  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const left = useCountdown(booking.expires_at);
  const soon = left !== null && left.startsWith("0:");

  const canPay = !isDriver && booking.status === "pending_payment";
  const canCancel =
    !isDriver &&
    (booking.status === "requested" ||
      booking.status === "pending_payment" ||
      booking.status === "confirmed");

  function cancel() {
    const paid = booking.status === "confirmed";
    const msg = paid
      ? `Cancel this trip? ${formatCurrency(booking.total_price)} goes back to your Kipita wallet in full.`
      : "Cancel this request? The seat is released straight away.";
    if (!window.confirm(msg)) return;

    setBusy(true);
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id);
      if (!result.ok) window.alert(result.error);
      setBusy(false);
    });
  }

  return (
    <Row>
      <Main>
        <Open
          href={`/trips/${booking.id}`}
          aria-label={`${origin} to ${destination}, ${STATUS_LABEL[booking.status]}, ${formatCurrency(booking.total_price)}`}
        />
        <Status $on={tone.bg}>
          {live ? <span className="dot" /> : <Icon size={15} weight="fill" />}
          {STATUS_LABEL[booking.status]}
          {step >= 0 && <em>{step + 1}/5</em>}
        </Status>

        {step >= 0 && (
          <Meter aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} data-on={i <= step ? "" : undefined} />
            ))}
          </Meter>
        )}

        <Route className="route">
          {origin && (
            <>
              <span>{origin}</span>
              <ArrowRight size={21} aria-hidden />
            </>
          )}
          <span>{destination}</span>
        </Route>

        {booking.trip && (
          <Facts>
            <li>
              <CalendarBlank size={17} />
              {formatTripDate(booking.trip.departure_date)}
            </li>
            <li>
              <Clock size={17} />
              {formatTripTime(booking.trip.departure_time)}
            </li>
            <li>
              <Users size={17} />
              {booking.seats_booked}{" "}
              {booking.seats_booked === 1 ? "seat" : "seats"}
            </li>
          </Facts>
        )}

        {(canPay || canCancel) && (
          <Acts>
            {canPay && (
              <>
                <Act
                  as={Link}
                  $primary
                  href={`/ride/${booking.trip_id}?booking=${booking.id}`}
                >
                  Pay {formatCurrency(booking.total_price)}
                </Act>
                {left && <Expiry $soon={soon}>Hold ends in {left}</Expiry>}
              </>
            )}
            {canCancel && (
              <Act type="button" onClick={cancel} disabled={busy}>
                {busy ? "Cancelling…" : "Cancel"}
              </Act>
            )}
          </Acts>
        )}
      </Main>

      <Side>
        <Avatar
          name={person?.full_name || "Kipita user"}
          src={person?.avatar_url}
          size={44}
        />
        <div className="who">
          <div className="name">{person?.full_name || "Kipita user"}</div>
          <div className="fare">{formatCurrency(booking.total_price)}</div>
        </div>
      </Side>
    </Row>
  );
}
