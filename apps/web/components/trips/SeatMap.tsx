"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styled, { css } from "styled-components";
import { m, useAnimate, useReducedMotion } from "motion/react";
import { Check } from "@/components/icons";
import { RollingNumber } from "@/components/ui/Counter";
import { tween } from "@/lib/motion";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { SeatRider } from "@/lib/trips/types";

export type SeatState = "paid" | "booked" | "requested" | "free";

const LABEL: Record<SeatState, string> = {
  paid: "Paid",
  booked: "Booked",
  requested: "Requested",
  free: "Free",
};

const Body = styled.div`
  position: relative;
  display: grid;
  gap: 12px;
  width: 236px;
  padding: 16px 20px 24px;
  border: 2px solid ${nocturne.cream};
  border-radius: 56px 56px 28px 28px;
  background: ${nocturne.surface};

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 52px;
    width: 8px;
    height: 16px;
    border: 2px solid ${nocturne.cream};
    background: ${nocturne.surface};
  }
  &::before {
    left: -12px;
    border-radius: 6px 2px 2px 6px;
  }
  &::after {
    right: -12px;
    border-radius: 2px 6px 6px 2px;
  }
  .glass {
    height: 12px;
    margin: 0 16px 4px;
    border: 2px solid ${nocturne.cream};
    border-bottom: 0;
    border-radius: 120px 120px 0 0 / 24px 24px 0 0;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
  }
`;

const SeatRow = styled.div<{ $n: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $n }) => $n}, minmax(0, 1fr));
  gap: 8px;
`;

const seatLook: Record<SeatState, ReturnType<typeof css>> = {
  paid: css`
    background: ${({ theme }) => theme.color.primary};
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.onPrimary};
  `,
  booked: css`
    background: ${({ theme }) => theme.color.primaryContainer};
    border-color: ${({ theme }) => theme.color.primaryContainer};
    color: ${({ theme }) => theme.color.onPrimaryContainer};
  `,
  requested: css`
    background: ${({ theme }) => theme.color.warningContainer};
    border-color: ${({ theme }) => theme.color.warning};
    border-style: dashed;
    color: ${({ theme }) => theme.color.onWarningContainer};
  `,
  free: css`
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    border-color: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  `,
};

const Cell = styled(m.span)<{ $state: SeatState }>`
  position: relative;
  display: grid;
  place-items: center;
  height: 48px;
  border: 2px solid;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  --icon-knockout: ${({ theme }) => theme.color.primary};
  transition:
    background-color ${dur.enter} ${ease.standard},
    border-color ${dur.enter} ${ease.standard},
    color ${dur.enter} ${ease.standard};
  ${({ $state }) => seatLook[$state]}

  ${({ $state }) =>
    $state === "requested" &&
    css`
      &::after {
        content: "";
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
    `}
`;

const Driver = styled.span`
  display: grid;
  place-items: center;
  height: 48px;
  border-radius: 12px;
  background: ${nocturne.cream};
  color: ${nocturne.surface};
  font-size: 13px;
  font-weight: 700;
`;

const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: ${nocturne.muted};

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  b {
    color: ${nocturne.cream};
    font-weight: 700;
  }
`;

const Swatch = styled.span<{ $state: SeatState }>`
  width: 14px;
  height: 14px;
  border: 2px solid;
  border-radius: 4px;
  ${({ $state }) => seatLook[$state]}
`;

const Wrap = styled.figure`
  display: grid;
  justify-items: center;
  gap: 16px;
  margin: 0;
`;

export function seatRows(total: number): number[] {
  const rows: number[] = [];
  let rest = Math.max(0, total - 1);
  while (rest > 0) {
    const take = rest === 4 ? 4 : Math.min(3, rest);
    rows.push(take);
    rest -= take;
  }
  return rows;
}

export type SeatSlot = { state: SeatState; rider: SeatRider | null };

const ORDER: Record<SeatRider["state"], number> = { paid: 0, booked: 1, requested: 2 };

export function assignSeats(
  total: number,
  counts: { paid: number; booked: number; requested: number },
  riders?: SeatRider[],
): SeatSlot[] {
  const slots: SeatSlot[] = [];
  if (riders && riders.length > 0) {
    const sorted = [...riders].sort(
      (a, b) => ORDER[a.state] - ORDER[b.state] || a.created_at.localeCompare(b.created_at),
    );
    for (const r of sorted) {
      for (let i = 0; i < r.seats && slots.length < total; i++) slots.push({ state: r.state, rider: r });
    }
  } else {
    const p = Math.min(counts.paid, total);
    const b = Math.min(counts.booked, total - p);
    const q = Math.min(counts.requested, total - p - b);
    for (let i = 0; i < p; i++) slots.push({ state: "paid", rider: null });
    for (let i = 0; i < b; i++) slots.push({ state: "booked", rider: null });
    for (let i = 0; i < q; i++) slots.push({ state: "requested", rider: null });
  }
  while (slots.length < total) slots.push({ state: "free", rider: null });
  return slots;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
const SeatLink = styled(Link)`
  display: grid;
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover > span {
      box-shadow: inset 0 0 0 999px color-mix(in oklab, currentColor 10%, transparent);
    }
  }
  &:active {
    transform: scale(0.96);
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
`;

function Seat({ n, slot, index, fillOrder }: { n: number; slot: SeatSlot; index: number; fillOrder: number }) {
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const { rider } = slot;
  const [state, setShown] = useState<SeatState>(reduce ? slot.state : "free");
  const first = useRef(true);
  const previous = useRef(state);

  useEffect(() => {
    if (!first.current) {
      setShown(slot.state);
      return;
    }
    first.current = false;
    if (slot.state === "free" || reduce) {
      setShown(slot.state);
      return;
    }
    const timer = window.setTimeout(() => setShown(slot.state), 600 + fillOrder * 180);
    return () => window.clearTimeout(timer);
  }, [slot.state, fillOrder, reduce]);

  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    if (reduce || !scope.current) return;
    void animate(scope.current, { scale: [1, 1.12, 1] }, { ...tween.enter, times: [0, 0.4, 1] });
  }, [state, reduce, animate, scope]);

  const label = rider ? `Seat ${n}: ${LABEL[state]}, ${rider.name}` : `Seat ${n}: ${LABEL[state]}`;
  const cell = (
    <Cell
      ref={scope}
      $state={state}
      role={rider ? undefined : "img"}
      aria-label={rider ? undefined : label}
      title={rider ? rider.name : undefined}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, transition: { ...tween.enter, delay: 0.03 + index * 0.035 } }}
    >
      {rider ? initials(rider.name) : state === "paid" ? <Check size={20} aria-hidden /> : n}
    </Cell>
  );

  if (!rider) return cell;
  return (
    <SeatLink href={`/trips/${rider.booking_id}`} aria-label={`${label}. Open booking`}>
      {cell}
    </SeatLink>
  );
}

export function SeatMap({
  total,
  paid,
  booked,
  requested,
  riders,
}: {
  total: number;
  paid: number;
  booked: number;
  requested: number;
  riders?: SeatRider[];
}) {
  const slots = assignSeats(total, { paid, booked, requested }, riders);
  const rows = seatRows(total);
  const counts: Record<SeatState, number> = { paid: 0, booked: 0, requested: 0, free: 0 };
  for (const s of slots) counts[s.state] += 1;

  let at = 1;
  const rest = rows.map((size) => Array.from({ length: size }, () => at++));

  return (
    <Wrap aria-label={`${counts.paid + counts.booked} of ${total} seats booked`}>
      <Body>
        <span className="glass" aria-hidden />
        <SeatRow $n={3}>
          {total > 0 ? <Seat n={1} slot={slots[0]} index={0} fillOrder={0} /> : <span aria-hidden />}
          <span aria-hidden />
          <Driver aria-label="Your seat, driver">You</Driver>
        </SeatRow>
        {rest.map((seats, r) => (
          <SeatRow key={r} $n={seats.length}>
            {seats.map((n) => (
              <Seat key={n} n={n + 1} slot={slots[n]} index={n} fillOrder={n} />
            ))}
          </SeatRow>
        ))}
      </Body>
      <Legend>
        {(["free", "requested", "booked", "paid"] as SeatState[]).map((s) => (
          <li key={s}>
            <Swatch $state={s} aria-hidden />
            {LABEL[s]} <b><RollingNumber value={counts[s]} /></b>
          </li>
        ))}
      </Legend>
    </Wrap>
  );
}