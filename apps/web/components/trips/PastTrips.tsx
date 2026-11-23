"use client";

import Link from "next/link";
import { useState } from "react";
import styled from "styled-components";
import { CaretRight } from "@/components/icons";
import { Chip as Toggle } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency } from "@/lib/trips/format";
import type { Booking } from "@/lib/trips/types";
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

export function PastTrips({ bookings, viewerId }: { bookings: Booking[]; viewerId: string }) {
  const [all, setAll] = useState(false);

  if (bookings.length === 0) return <Empty>No past trips yet.</Empty>;

  const sorted = [...bookings].sort((a, b) => dayOf(b).getTime() - dayOf(a).getTime());
  const shown = all ? sorted : sorted.slice(0, LIMIT);

  const months: { key: string; label: string; items: Booking[] }[] = [];
  for (const b of shown) {
    const d = dayOf(b);
    const key = monthKey(d);
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(b);
    else
      months.push({
        key,
        label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        items: [b],
      });
  }

  return (
    <Ledger>
      {months.map((m) => (
        <Month key={m.key} aria-label={m.label}>
          <h3>{m.label}</h3>
          <Rows>
            {m.items.map((b) => {
              const rode = b.passenger_id === viewerId;
              const status = STATUS[b.status];
              const from = b.trip?.from_location ?? "Pickup";
              const to = b.trip?.to_location ?? "Drop-off";
              const { amount, note } = money(b, rode);
              const day = dayOf(b).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              return (
                <li key={b.id}>
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
                      <span>{rode ? "You rode" : "You drove"}</span>
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
            })}
          </Rows>
        </Month>
      ))}
      {sorted.length > LIMIT && (
        <More>
          <Toggle type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? (
              "Show fewer trips"
            ) : (
              <>
                Show all <RollingNumber value={sorted.length} /> past trips
              </>
            )}
          </Toggle>
        </More>
      )}
    </Ledger>
  );
}
