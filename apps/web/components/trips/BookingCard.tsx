"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import styled, { css } from "styled-components";
import { CaretRight, CheckCircle, Clock, NavigationArrow, XCircle } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { dur, ease, nocturne, pulse } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
import { fs } from "./RideRow";
import { RateStars } from "./RateStars";

type Tone = "wait" | "pay" | "go" | "live" | "done" | "off";

type IconType = ComponentType<{ size?: number; weight?: "fill" | "bold" | "regular" }>;

export const STATUS: Record<Booking["status"], { label: string; tone: Tone; icon: IconType }> = {
  requested: { label: "Requested", tone: "wait", icon: Clock },
  pending_payment: { label: "Awaiting payment", tone: "pay", icon: Clock },
  confirmed: { label: "Seat reserved", tone: "go", icon: CheckCircle },
  in_progress: { label: "On the way", tone: "live", icon: NavigationArrow },
  completed: { label: "Completed", tone: "done", icon: CheckCircle },
  cancelled: { label: "Cancelled", tone: "off", icon: XCircle },
  rejected: { label: "Declined", tone: "off", icon: XCircle },
};

const MONEY_NOTE: Record<Booking["status"], string> = {
  requested: "Not charged yet",
  pending_payment: "Fee included",
  confirmed: "Paid, held until you arrive",
  in_progress: "Held until you arrive",
  completed: "Total paid",
  cancelled: "Booking total",
  rejected: "Not charged",
};

const chipLook: Record<Tone, ReturnType<typeof css>> = {
  wait: css`
    background: color-mix(in oklab, ${nocturne.tan} 22%, transparent);
    color: ${nocturne.cream};
  `,
  pay: css`
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
  `,
  go: css`
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
  `,
  live: css`
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  `,
  done: css`
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  `,
  off: css`
    background: color-mix(in oklab, ${nocturne.danger} 12%, transparent);
    color: ${nocturne.danger};
  `,
};

const DESK = "@media (min-width: 861px)";

const Card = styled.article<{ $tone: Tone }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "top top"
    "route route"
    "rule rule"
    "person money"
    "pay pay"
    "rate rate";
  gap: 14px 12px;
  padding: 18px 18px 16px;
  border-radius: 20px;
  background: ${nocturne.surface};
  overflow: hidden;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  ${({ $tone }) =>
    $tone === "off" &&
    css`
      ol b,
      [data-money] b {
        color: ${nocturne.muted};
      }
      [data-money]:not([data-refunded]) b {
        text-decoration: line-through;
        text-decoration-thickness: 2px;
      }
    `}

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:has(> a[data-cover]:focus-visible) {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
    }
  }

  ${DESK} {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) auto;
    grid-template-areas:
      "top top top"
      "route person money"
      "pay pay pay"
      "rate rate rate";
    align-items: center;
    gap: 18px 32px;
    padding: 22px 26px;
  }
`;

const Cover = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;

  &:focus-visible {
    outline: none;
  }
`;

const Top = styled.div`
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const Chip = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: ${fs.small};
  font-weight: 800;
  white-space: nowrap;
  ${({ $tone }) => chipLook[$tone]}

  > i {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
  > i::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: currentColor;
    animation: ${pulse} 1.8s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    > i::after {
      animation: none;
      opacity: 0.3;
    }
  }
`;

const Aside = styled.span<{ $soon?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${fs.small};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $soon }) => ($soon ? nocturne.danger : nocturne.muted)};
  text-align: right;
`;

const Route = styled.ol`
  grid-area: route;
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
    line-height: 1.25;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  small {
    font-size: 14px;
    color: ${nocturne.muted};
  }

  ${DESK} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 28px;

    li {
      padding: 22px 0 0;
    }
    li::before {
      left: 0;
      top: 0;
    }
    li:first-child::after {
      left: 16px;
      right: -22px;
      top: 4px;
      bottom: auto;
      border-left: 0;
      border-top: 2px dashed ${nocturne.line2};
    }
    b {
      font-size: 21px;
    }
  }
`;

const Rule = styled.hr`
  grid-area: rule;
  width: 100%;
  height: 1px;
  margin: 2px 0;
  border: 0;
  background: ${nocturne.line};

  ${DESK} {
    display: none;
  }
`;

const Person = styled.span`
  grid-area: person;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  span {
    display: grid;
    min-width: 0;
  }
  b {
    font-size: 15px;
    font-weight: 800;
    color: ${nocturne.cream};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    font-size: ${fs.small};
    color: ${nocturne.muted};
  }
`;

const Money = styled.span`
  grid-area: money;
  display: grid;
  justify-items: end;
  align-content: center;

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  small {
    font-size: ${fs.small};
    color: ${nocturne.muted};
  }
`;

const RateSlot = styled.div`
  grid-area: rate;
  padding-top: 14px;
  border-top: 1px solid ${nocturne.line};
`;

const Pay = styled(Link)<{ $live?: boolean }>`
  grid-area: pay;
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  background: ${({ $live }) => ($live ? nocturne.lime : nocturne.green)};
  color: ${({ $live }) => ($live ? nocturne.greenDeep : nocturne.onGreen)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg:last-child {
    transition: transform ${dur.state} ${ease.standard};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ $live }) => ($live ? nocturne.lime : nocturne.ctaBg)};
      color: ${({ $live }) => ($live ? nocturne.greenDeep : nocturne.ctaFg)};
    }
    &:hover svg:last-child {
      transform: translateX(2px);
    }
  }
  &:active {
    background: ${({ $live }) => ($live ? nocturne.lime : nocturne.ctaBg)};
    color: ${({ $live }) => ($live ? nocturne.greenDeep : nocturne.ctaFg)};
    transform: scale(0.97);
    transition-duration: ${dur.press};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }

  ${DESK} {
    justify-self: end;
    margin-top: -4px;
  }
`;

function tap(event: React.PointerEvent) {
  if (event.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8);
}

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

export function BookingCard({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId: string;
}) {
  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const name = person?.full_name || "Kipita user";
  const origin = booking.trip?.from_location ?? "Pickup to confirm";
  const destination = booking.trip?.to_location ?? "Drop-off to confirm";
  const date = formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm";
  const time = formatTripTime(booking.trip?.departure_time ?? null) || "time to confirm";
  const status = STATUS[booking.status];
  const Icon = status.icon;
  const live = booking.status === "in_progress";
  const seats = `${booking.seats_booked} ${booking.seats_booked === 1 ? "seat" : "seats"}`;

  const left = useCountdown(booking.expires_at);
  const soon = left !== null && left.startsWith("0:");
  const canPay = !isDriver && booking.status === "pending_payment";
  const refunded = booking.refunded_amount != null && !isDriver;

  return (
    <Card $tone={status.tone}>
      <Cover data-cover href={`/trips/${booking.id}`} aria-label={`Open trip, ${origin} to ${destination}, ${status.label}`} />

      <Top>
        <Chip $tone={status.tone}>
          {live ? <i aria-hidden /> : <Icon size={15} weight="bold" />}
          {status.label}
        </Chip>
        {canPay && left ? (
          <Aside $soon={soon}>{soon ? `Seat released in ${left}` : `Pay within ${left}`}</Aside>
        ) : ["completed", "cancelled", "rejected"].includes(booking.status) ? (
          <Aside>{date}</Aside>
        ) : booking.booking_reference ? (
          <Aside>{booking.booking_reference}</Aside>
        ) : (
          <Aside aria-hidden>
            <CaretRight size={18} />
          </Aside>
        )}
      </Top>

      <Route>
        <li>
          <b>{origin}</b>
          <small>
            {date} · {time}
          </small>
        </li>
        <li>
          <b>{destination}</b>
          <small>{seats}</small>
        </li>
      </Route>

      <Rule aria-hidden />
      <Person>
        <Avatar name={name} src={person?.avatar_url} size={36} />
        <span>
          <b>{name}</b>
          <small>{isDriver ? "Passenger" : "Driver"}</small>
        </span>
      </Person>
      <Money data-money data-refunded={refunded ? "" : undefined}>
        <b>{formatCurrency(refunded ? booking.refunded_amount! : booking.total_price)}</b>
        <small>
          {booking.status === "pending_payment" && booking.service_fee == null
            ? "Pay to keep your seat"
            : refunded
              ? booking.refund_to === "mpesa"
                ? "Refunded to M-Pesa"
                : "Refunded to wallet"
              : booking.status === "cancelled" && !booking.paid_at
                ? "Not charged"
                : MONEY_NOTE[booking.status]}
        </small>
      </Money>

      {canPay && (
        <Pay href={`/trips/${booking.id}?pay=1`} onPointerDown={tap}>
          Pay {formatCurrency(booking.total_price)}
          <CaretRight size={16} weight="bold" />
        </Pay>
      )}
      {booking.status === "completed" && booking.my_rating == null && (
        <RateSlot>
          <RateStars bookingId={booking.id} name={name} initial={null} />
        </RateSlot>
      )}
      {live && (
        <Pay href={`/trips/${booking.id}`} $live onPointerDown={tap}>
          <NavigationArrow size={18} weight="bold" />
          Open trip
        </Pay>
      )}
    </Card>
  );
}
