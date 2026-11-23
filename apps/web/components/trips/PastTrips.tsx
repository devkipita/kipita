"use client";

import Link from "next/link";
import { useState } from "react";
import styled from "styled-components";
import { departureInstant } from "@kipita/shared";
import { Car, CaretRight, CheckCircle, Clock, NavigationArrow, XCircle } from "@/components/icons";
import { Chip as Toggle } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency } from "@/lib/trips/format";
import type { Booking, TripLeg } from "@/lib/trips/types";
import { Chip, STATUS, StatusTile } from "./BookingCard";
import { fs } from "./RideRow";

const LIMIT = 12;

const Ledger = styled.div`
  display: grid;
  gap: 24px;
  padding-top: 16px;
`;

const Month = styled.section`
  display: grid;
  gap: 8px;

  h3 {
    margin: 0;
    padding-left: 4px;
    font-size: ${fs.small};
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Rows = styled.ul`
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;

  li:first-child a {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
  li:last-child a {
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
  }
`;

const RowLink = styled(Link)`
  position: relative;
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) auto 128px 16px;
  align-items: center;
  gap: 16px;
  min-height: 64px;
  padding: 8px 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${nocturne.cream};
  text-decoration: none;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .date {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: ${fs.small};
    font-weight: 600;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
  .trip {
    display: grid;
    min-width: 0;
  }
  .trip b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 700;
  }
  .trip span {
    font-size: ${fs.small};
    color: ${nocturne.muted};
  }
  .money {
    display: grid;
    justify-items: end;
    text-align: right;
  }
  .money b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .money span {
    font-size: ${fs.small};
    color: ${nocturne.muted};
  }
  > svg {
    color: ${nocturne.muted};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 999px color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    z-index: 1;
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "date badge"
      "trip money";
    gap: 4px 12px;
    padding: 12px 16px;

    .date {
      grid-area: date;
    }
    .trip {
      grid-area: trip;
    }
    .badge {
      grid-area: badge;
      justify-self: end;
    }
    .money {
      grid-area: money;
    }
    > svg {
      display: none;
    }
  }
`;

const Empty = styled.p`
  margin: 0;
  padding: 16px 4px 0;
  font-size: ${fs.meta};
  color: ${nocturne.muted};
`;

const More = styled.div`
  display: flex;
  justify-content: center;
`;

function dayOf(b: Booking): Date {
  const raw = b.trip?.departure_date;
  const at = raw ? new Date(`${raw}T00:00`) : new Date(b.created_at);
  return Number.isFinite(at.getTime()) ? at : new Date(b.created_at);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function money(b: Booking, rode: boolean) {
  if (b.status === "rejected") return { amount: null, note: "Nothing charged" };
  if (b.status === "cancelled") {
    if (rode && b.refunded_amount != null) {
      return {
        amount: formatCurrency(b.refunded_amount),
        note: b.refund_to === "mpesa" ? "Refunded to M-Pesa" : "Refunded to wallet",
      };
    }
    if (!b.paid_at) return { amount: null, note: "Nothing charged" };
    return { amount: formatCurrency(b.total_price), note: "Paid, then cancelled" };
  }
  return { amount: formatCurrency(b.total_price), note: rode ? "You paid" : "Passenger paid" };
}

type Entry =
  | { kind: "seat"; key: string; day: Date; booking: Booking }
  | { kind: "ride"; key: string; day: Date; tripId: string; trip: TripLeg | null; bookings: Booking[] };

export function pastEntries(bookings: Booking[], viewerId: string): Entry[] {
  const sorted = [...bookings].sort((a, b) => dayOf(b).getTime() - dayOf(a).getTime());
  const entries: Entry[] = [];
  const rides = new Map<string, Extract<Entry, { kind: "ride" }>>();
  for (const b of sorted) {
    if (b.passenger_id === viewerId) {
      entries.push({ kind: "seat", key: b.id, day: dayOf(b), booking: b });
      continue;
    }
    const ride = rides.get(b.trip_id);
    if (ride) {
      ride.bookings.push(b);
      continue;
    }
    const next = { kind: "ride" as const, key: `ride-${b.trip_id}`, day: dayOf(b), tripId: b.trip_id, trip: b.trip, bookings: [b] };
    rides.set(b.trip_id, next);
    entries.push(next);
  }
  return entries;
}

function rideState(trip: TripLeg | null, bookings: Booking[]) {
  const leaves = departureInstant(trip?.departure_date, trip?.departure_time);
  const ahead = leaves ? leaves.getTime() > Date.now() : false;
  if (trip?.status === "cancelled") return { label: "Ride cancelled", tone: "off" as const, icon: XCircle, ahead: false };
  if (trip?.status === "in_progress") return { label: "On the way", tone: "live" as const, icon: NavigationArrow, ahead: false };
  if (trip?.status === "completed" || bookings.some((b) => b.status === "completed"))
    return { label: "Ride completed", tone: "done" as const, icon: CheckCircle, ahead: false };
  if (ahead) return { label: "Ride still on", tone: "go" as const, icon: Car, ahead: true };
  return { label: "Ride over", tone: "off" as const, icon: Clock, ahead: false };
}

function seatSummary(bookings: Booking[]): string {
  const rode = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const declined = bookings.filter((b) => b.status === "rejected").length;
  const who = (n: number) => (n === 1 ? "1 passenger" : `${n} passengers`);
  const parts: string[] = [];
  if (rode) parts.push(`${who(rode)} rode`);
  if (cancelled) parts.push(`${parts.length ? cancelled : who(cancelled)} cancelled`);
  if (declined) parts.push(`${parts.length ? declined : who(declined)} declined`);
  return parts.join(", ");
}

export function PastTrips({ bookings, viewerId }: { bookings: Booking[]; viewerId: string }) {
  const [all, setAll] = useState(false);

  if (bookings.length === 0) return <Empty>No past trips yet.</Empty>;

  const entries = pastEntries(bookings, viewerId);
  const shown = all ? entries : entries.slice(0, LIMIT);

  const months: { key: string; label: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const key = monthKey(e.day);
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(e);
    else
      months.push({
        key,
        label: e.day.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        items: [e],
      });
  }

  return (
    <Ledger>
      {months.map((m) => (
        <Month key={m.key} aria-label={m.label}>
          <h3>{m.label}</h3>
          <Rows>
            {m.items.map((e) => {
              const day = e.day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
              if (e.kind === "seat") {
                const b = e.booking;
                const status = STATUS[b.status];
                const from = b.trip?.from_location ?? "Pickup";
                const to = b.trip?.to_location ?? "Drop-off";
                const { amount, note } = money(b, true);
                return (
                  <li key={e.key}>
                    <RowLink href={`/trips/${b.id}`} aria-label={`${day}, ${from} to ${to}, ${status.label}`}>
                      <span className="date">
                        <StatusTile $tone={status.tone} $small aria-hidden>
                          <status.icon size={16} weight="bold" />
                        </StatusTile>
                        {day}
                      </span>
                      <span className="trip">
                        <b>
                          {from} → {to}
                        </b>
                        <span>You rode</span>
                      </span>
                      <span className="badge">
                        <Chip $tone={status.tone}>{status.label}</Chip>
                      </span>
                      <span className="money">
                        {amount && <b>{amount}</b>}
                        <span>{note}</span>
                      </span>
                      <CaretRight size={16} aria-hidden />
                    </RowLink>
                  </li>
                );
              }
              const first = e.bookings[0];
              const state = rideState(e.trip, e.bookings);
              const from = e.trip?.from_location ?? "Pickup";
              const to = e.trip?.to_location ?? "Drop-off";
              const summary = seatSummary(e.bookings);
              const lead = state.ahead ? "Your ride" : "You drove";
              const earned = e.bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.total_price, 0);
              const href = e.bookings.length === 1 ? `/trips/${first.id}` : `/ride/${e.tripId}`;
              return (
                <li key={e.key}>
                  <RowLink href={href} aria-label={`${day}, ${from} to ${to}, ${state.label}${summary ? `, ${summary}` : ""}`}>
                    <span className="date">
                      <StatusTile $tone={state.tone} $small aria-hidden>
                        <state.icon size={16} weight="bold" />
                      </StatusTile>
                      {day}
                    </span>
                    <span className="trip">
                      <b>
                        {from} → {to}
                      </b>
                      <span>{summary ? `${lead} · ${summary}` : lead}</span>
                    </span>
                    <span className="badge">
                      <Chip $tone={state.tone}>{state.label}</Chip>
                    </span>
                    <span className="money">
                      {earned > 0 ? <b>{formatCurrency(earned)}</b> : null}
                      <span>{earned > 0 ? "Passengers paid" : "Nothing charged"}</span>
                    </span>
                    <CaretRight size={16} aria-hidden />
                  </RowLink>
                </li>
              );
            })}
          </Rows>
        </Month>
      ))}
      {entries.length > LIMIT && (
        <More>
          <Toggle type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? (
              "Show fewer trips"
            ) : (
              <>
                Show all <RollingNumber value={entries.length} /> past trips
              </>
            )}
          </Toggle>
        </More>
      )}
    </Ledger>
  );
}
