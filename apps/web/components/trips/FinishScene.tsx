"use client";

import styled, { keyframes } from "styled-components";
import { formatCurrency } from "@/lib/trips/format";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { FinishArt } from "./FinishArt";

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: none; }
`;

const Wrap = styled.section`
  --ink: ${({ theme }) => (theme.mode === "light" ? nocturne.greenDeep : nocturne.cream)};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 24px;
  height: 100%;
  padding: 48px 40px 32px;
  background: ${nocturne.surface};
  color: var(--ink);

  @media (max-width: 899px) {
    gap: 8px;
    padding: 16px 16px 32px;
  }
`;

const Window = styled.div`
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;

  .art {
    width: min(620px, 100%);
  }

  @media (max-width: 899px) {
    .art {
      width: auto;
      height: 100%;
      max-height: 170px;
      aspect-ratio: 420 / 260;
    }
    .art svg {
      width: 100%;
      height: 100%;
    }
  }
`;

const Copy = styled.div`
  display: grid;
  gap: 16px;
  animation: ${rise} ${dur.enter} ${ease.enter} both;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 2.6vw, 32px);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  p {
    margin: -8px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.muted};
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 32px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 28px;
    font-weight: 800;
    line-height: 32px;
    letter-spacing: -0.02em;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .money b {
    color: ${nocturne.green};
  }

  @media (max-width: 899px) {
    gap: 8px;

    h2 {
      font-size: 20px;
      line-height: 24px;
    }
    p {
      margin: 0;
      font-size: 14px;
    }
    ul {
      gap: 4px 16px;
    }
    li {
      gap: 4px;
      font-size: 14px;
    }
    b {
      font-size: 20px;
      line-height: 24px;
    }
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
  passengers,
  passengerName,
}: {
  destination: string;
  startedAt: string | null;
  completedAt: string | null;
  amount: number | null;
  seats: number;
  isDriver: boolean;
  passengers?: number;
  passengerName?: string;
}) {
  const time = duration(startedAt, completedAt);
  const headline = !isDriver
    ? `You made it to ${destination}`
    : passengers != null && passengers !== 1
      ? `You delivered ${passengers} passengers to ${destination}`
      : `You delivered ${passengerName || "your passenger"} to ${destination}`;

  return (
    <Wrap aria-label="Trip complete">
      <Copy>
        <h2>{headline}</h2>
        <p>{isDriver ? "Paid if no dispute" : "Thanks for riding with Kipita"}</p>
        <ul>
          {amount != null ? (
            <li className="money">
              <b>{formatCurrency(amount)}</b>
              {isDriver ? "to you" : "paid"}
            </li>
          ) : null}
          {time ? (
            <li>
              <b>{time}</b>
              on the road
            </li>
          ) : null}
          {seats > 0 ? (
            <li>
              <b>{seats}</b>
              {seats === 1 ? "seat" : "seats"}
            </li>
          ) : null}
        </ul>
      </Copy>
      <Window>
        <div className="art">
          <FinishArt destination={destination} />
        </div>
      </Window>
    </Wrap>
  );
}
