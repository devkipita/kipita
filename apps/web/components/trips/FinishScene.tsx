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
  width: min(216px, 56%);

  @media (min-width: 900px) {
    width: min(340px, 70%);
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
  justify-content: center;
  gap: 8px;
  margin: 0;
  animation: ${fade} ${dur.enter} ${ease.enter} 240ms both;

  div {
    display: grid;
    gap: 1px;
    min-width: 92px;
    padding: 10px 14px;
    border-radius: 14px;
    background: ${nocturne.surface};
    box-shadow: ${nocturne.cardShadow};
  }
  dt {
    order: 2;
    font-size: 12px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  dd {
    order: 1;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
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
        <FinishArt />
      </Art>
      <Copy>
        <h2>{isDriver ? `You delivered your passenger to ${destination}` : `You made it to ${destination}`}</h2>
        <p>{isDriver ? "The fare is on its way to your wallet" : "Kipita released your fare to the driver"}</p>
      </Copy>
      <Stats>
        <div>
          <dt>{isDriver ? "to you" : "paid"}</dt>
          <dd>{formatCurrency(amount)}</dd>
        </div>
        {time ? (
          <div>
            <dt>on the road</dt>
            <dd>{time}</dd>
          </div>
        ) : null}
        <div>
          <dt>{seats === 1 ? "seat" : "seats"}</dt>
          <dd>{seats}</dd>
        </div>
      </Stats>
    </Wrap>
  );
}
