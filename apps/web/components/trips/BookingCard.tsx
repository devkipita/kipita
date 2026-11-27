"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import styled, { css, type DefaultTheme } from "styled-components";
import { CaretRight, CheckCircle, Clock, NavigationArrow, XCircle } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { VerifiedMark } from "@/components/alerts/VerifiedMark";
import { dur, ease, nocturne, pulse } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
import { Road, fs } from "./RideRow";
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
  cancelled: "Booking cancelled",
  rejected: "Not charged",
};

const chipLook: Record<Tone, ReturnType<typeof css>> = {
  wait: css`
    background: ${({ theme }) => theme.color.secondaryContainer};
    color: ${({ theme }) => theme.color.onSecondaryContainer};
  `,
  pay: css`
    background: ${({ theme }) => theme.color.warningContainer};
    color: ${({ theme }) => theme.color.onWarningContainer};
  `,
  go: css`
    background: ${({ theme }) => theme.color.successContainer};
    color: ${({ theme }) => theme.color.onSuccessContainer};
  `,
  live: css`
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  `,
  done: css`
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.cream};
  `,
  off: css`
    background: ${({ theme }) => theme.color.errorContainer};
    color: ${({ theme }) => theme.color.onErrorContainer};
  `,
};

const DESK = "@media (min-width: 861px)";

function toneContainer(tone: Tone, theme: DefaultTheme): string {
  const c = theme.color;
  switch (tone) {
    case "wait":
      return c.secondaryContainer;
    case "pay":
      return c.warningContainer;
    case "go":
      return c.successContainer;
    case "live":
      return nocturne.lime;
    case "off":
      return c.errorContainer;
    default:
      return c.surfaceContainerHigh;
  }
}

const Card = styled.article<{ $tone: Tone }>`
  --row-ink: ${nocturne.cream};
  --row-mark: ${nocturne.accent};

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "time money"
    "route route"
    "pay pay"
    "rate rate";
  gap: 16px 12px;
  padding: 16px;
  border-radius: 20px;
  background: ${({ theme, $tone }) =>
    `color-mix(in oklab, ${toneContainer($tone, theme)} 32%, ${theme.color.surfaceContainerLowest})`};
  overflow: hidden;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 999px color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:has(> a[data-cover]:focus-visible) {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }

  ${DESK} {
    grid-template-columns: 136px minmax(0, 1fr) auto;
    grid-template-areas:
      "time route money"
      "pay pay pay"
      "rate rate rate";
    align-items: center;
    gap: 16px 32px;
    padding: 20px 24px;
  }
`;

export const StatusTile = styled.span<{ $tone: Tone; $small?: boolean }>`
  display: grid;
  place-items: center;
  flex: none;
  width: ${({ $small }) => ($small ? "32px" : "40px")};
  height: ${({ $small }) => ($small ? "32px" : "40px")};
  border-radius: ${({ $small }) => ($small ? "8px" : "12px")};
  ${({ $tone }) => chipLook[$tone]}
`;

const Cover = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;

  &:focus-visible {
    outline: none;
  }
  &:active {
    background-color: color-mix(in oklab, ${nocturne.cream} 4%, transparent);
  }
`;

const When = styled.div`
  grid-area: time;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  > span {
    font-size: ${fs.small};
    font-weight: 600;
    color: ${nocturne.muted};
  }
  > b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 24px;
    font-weight: 800;
    line-height: 28px;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${nocturne.cream};
  }
  > :last-child {
    margin-top: 4px;
  }
`;

export const Chip = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: ${fs.small};
  font-weight: 600;
  white-space: nowrap;
  ${({ $tone }) => chipLook[$tone]}

  > i {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  > i::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: currentColor;
    animation: ${pulse} calc(${dur.max} * 4) ${ease.standard} infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    > i::after {
      animation: none;
      opacity: 0.3;
    }
  }
`;

const Trip = styled.div`
  grid-area: route;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const Person = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: ${fs.meta};
  color: ${nocturne.muted};

  b {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .plate {
    flex: none;
    padding: 0 4px;
    border-radius: 4px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${nocturne.cream};
    font-size: ${fs.small};
    font-weight: 700;
    letter-spacing: 0.02em;
  }
`;

const Money = styled.span`
  grid-area: money;
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 2px;
  text-align: right;

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
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

const Aside = styled.span<{ $soon?: boolean }>`
  font-size: ${fs.small};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $soon }) => ($soon ? nocturne.danger : nocturne.muted)};
`;

const RateSlot = styled.div`
  grid-area: rate;
  position: relative;
  z-index: 2;
  padding-top: 12px;
`;

const Pay = styled(Link)<{ $live?: boolean }>`
  grid-area: pay;
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  background: ${({ $live }) => ($live ? nocturne.lime : nocturne.green)};
  color: ${({ $live }) => ($live ? nocturne.greenDeep : nocturne.onGreen)};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  transition:
    filter ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      filter: brightness(0.94);
    }
  }
  &:active {
    filter: brightness(0.9);
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }

  ${DESK} {
    justify-self: end;
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
  const time = formatTripTime(booking.trip?.departure_time ?? null) || "Time to confirm";
  const status = STATUS[booking.status];
  const Icon = status.icon;
  const live = booking.status === "in_progress";
  const seats = `${booking.seats_booked} ${booking.seats_booked === 1 ? "seat" : "seats"}`;
  const plate = booking.trip?.vehicle?.plate_number ?? null;

  const left = useCountdown(booking.expires_at);
  const soon = left !== null && left.startsWith("0:");
  const canPay = !isDriver && booking.status === "pending_payment";
  const refunded = booking.refunded_amount != null && !isDriver;

  const note =
    booking.status === "pending_payment" && booking.service_fee == null
      ? "Pay to keep your seat"
      : refunded
        ? booking.refund_to === "mpesa"
          ? "Refunded to M-Pesa"
          : "Refunded to your wallet"
        : booking.status === "cancelled" && !booking.paid_at
          ? "Cancelled, nothing charged"
          : MONEY_NOTE[booking.status];

  return (
    <Card $tone={status.tone}>
      <Cover data-cover href={`/trips/${booking.id}`} aria-label={`Open trip, ${origin} to ${destination}, ${status.label}`} />

      <When>
        <StatusTile $tone={status.tone} aria-hidden>
          <Icon size={20} weight="bold" />
        </StatusTile>
        <span>{date}</span>
        <b>{time}</b>
        <Chip $tone={status.tone}>
          {live ? <i aria-hidden /> : <Icon size={16} weight="bold" />}
          {status.label}
        </Chip>
      </When>

      <Trip>
        <Road $moving={live}>
          <span>{origin}</span>
          <i aria-hidden />
          <span>{destination}</span>
        </Road>
        <Person>
          <Avatar name={name} src={person?.avatar_url} size={32} />
          <b>{name}</b>
          <VerifiedMark verified={person?.is_verified} />
          <span>· {isDriver ? "Passenger" : "Driver"} · {seats}</span>
          {plate && !isDriver && <span className="plate">{plate}</span>}
        </Person>
      </Trip>

      <Money>
        {canPay && left ? (
          <Aside $soon={soon}>{soon ? `Seat released in ${left}` : `Pay within ${left}`}</Aside>
        ) : booking.booking_reference ? (
          <Aside>{booking.booking_reference}</Aside>
        ) : null}
        <b>{formatCurrency(refunded ? booking.refunded_amount! : booking.total_price)}</b>
        <small>{note}</small>
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
          <NavigationArrow size={20} weight="bold" />
          Open trip
        </Pay>
      )}
    </Card>
  );
}
