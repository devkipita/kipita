"use client";

import styled, { keyframes } from "styled-components";
import { formatCurrency } from "@/lib/trips/format";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { FinishArt } from "./FinishArt";

const fade = keyframes`
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: none; }
`;

const Wrap = styled.section`
  position: relative;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 6px;
  height: 100%;
  padding: 44px 20px 16px;
  background:
    radial-gradient(120% 70% at 50% 0%, color-mix(in oklab, ${nocturne.lime} 38%, ${nocturne.surface}) 0%, ${nocturne.surface} 70%);
  text-align: center;
  overflow-y: auto;

  @media (min-width: 900px) {
    align-content: center;
    gap: 16px;
    padding: 72px 28px 32px;
  }
`;

const Art = styled.div`
  width: min(260px, 72%);

  @media (min-width: 900px) {
    width: min(440px, 88%);
  }
`;

const Copy = styled.div`
  display: grid;
  gap: 4px;
  animation: ${fade} ${dur.enter} ${ease.enter} 160ms both;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(22px, 3vw, 32px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 15px;
    color: ${nocturne.muted};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Stats = styled.dl`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 8px 0 0;
  animation: ${fade} ${dur.enter} ${ease.enter} 240ms both;

  div {
    display: grid;
    gap: 2px;
    min-width: 104px;
    padding: 12px 16px;
    border-radius: 16px;
    text-align: left;
  }
  .money {
    background: ${({ theme }) => theme.tone.amber.bg};
    color: ${({ theme }) => theme.tone.amber.on};
  }
  .time {
    background: ${({ theme }) => theme.tone.blue.bg};
    color: ${({ theme }) => theme.tone.blue.on};
  }
  .seats {
    background: ${({ theme }) => theme.tone.green.bg};
    color: ${({ theme }) => theme.tone.green.on};
  }
  dt {
    order: 2;
    font-size: 13px;
    font-weight: 600;
    color: inherit;
  }
  dd {
    order: 1;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: inherit;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

function duration(a: string | null, b: string | null): string | null {
  if (!a || !b) return null;
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  if (m <= 0) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function FinishScene({
  destination,
  startedAt,
  completedAt,
  amount,
  seats,
  isDriver,
}: {
  destination: string;
  startedAt: string | null;
  completedAt: string | null;
  amount: number;
  seats: number;
  isDriver: boolean;
}) {
  const time = duration(startedAt, completedAt);

  return (
    <Wrap aria-label="Trip complete">
      <Art>
        <FinishArt destination={destination} />
      </Art>
      <Copy>
        <h2>{isDriver ? `You delivered your passenger to ${destination}` : `You made it to ${destination}`}</h2>
        {isDriver ? null : <p>Thanks for riding with Kipita</p>}
      </Copy>
      <Stats>
        <div className="money">
          <dt>{isDriver ? "to you" : "paid"}</dt>
          <dd>{formatCurrency(amount)}</dd>
        </div>
        {time ? (
          <div className="time">
            <dt>on the road</dt>
            <dd>{time}</dd>
          </div>
        ) : null}
        <div className="seats">
          <dt>{seats === 1 ? "seat" : "seats"}</dt>
          <dd>{seats}</dd>
        </div>
      </Stats>
    </Wrap>
  );
}
