"use client";

import styled, { keyframes } from "styled-components";
import { RollingNumber } from "@/components/ui/Counter";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { ArrivedArt } from "./StageArt";
import { RateStars } from "./RateStars";

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.94); }
  to { opacity: 1; transform: none; }
`;

const fade = keyframes`
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to { opacity: 1; transform: none; }
`;

const Wrap = styled.section`
  position: relative;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  height: 100%;
  padding: 72px 24px 32px;
  background: ${nocturne.surface};
  text-align: center;
  overflow-y: auto;

  @media (max-width: 899px) {
    padding-top: 64px;
  }
`;

const Art = styled.div`
  width: min(320px, 80%);
  animation: ${rise} ${dur.max} ${ease.spring} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Copy = styled.div`
  display: grid;
  gap: 6px;
  animation: ${fade} ${dur.enter} ${ease.enter} 120ms both;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 3vw, 32px);
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  width: min(420px, 100%);
  margin: 0;
  animation: ${fade} ${dur.enter} ${ease.enter} 200ms both;

  div {
    display: grid;
    gap: 2px;
    padding: 12px 8px;
    border-radius: 16px;
    background: ${nocturne.surface2};
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
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Rate = styled.div`
  width: min(420px, 100%);
  padding: 14px 16px;
  border-radius: 16px;
  background: ${nocturne.surface2};
  text-align: left;
  animation: ${fade} ${dur.enter} ${ease.enter} 280ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return m > 0 ? m : null;
}

export function FinishScene({
  destination,
  startedAt,
  completedAt,
  amount,
  seats,
  isDriver,
  bookingId,
  otherName,
  rating,
}: {
  destination: string;
  startedAt: string | null;
  completedAt: string | null;
  amount: number;
  seats: number;
  isDriver: boolean;
  bookingId: string;
  otherName: string;
  rating: number | null | undefined;
}) {
  const mins = minutesBetween(startedAt, completedAt);

  return (
    <Wrap aria-label="Trip complete">
      <Art>
        <ArrivedArt />
      </Art>
      <Copy>
        <h2>{isDriver ? "Trip complete" : `You made it to ${destination}`}</h2>
        <p>{isDriver ? "The fare is on its way to you" : "Kipita released your fare to the driver"}</p>
      </Copy>
      <Stats>
        {mins != null && (
          <div>
            <dt>{mins >= 60 ? "hours on the road" : "minutes on the road"}</dt>
            <dd>
              <RollingNumber value={mins >= 60 ? Math.round((mins / 60) * 10) / 10 : mins} decimals={mins >= 60 ? 1 : 0} />
            </dd>
          </div>
        )}
        <div>
          <dt>{isDriver ? "KES to you" : "KES paid"}</dt>
          <dd>
            <RollingNumber value={amount} />
          </dd>
        </div>
        <div>
          <dt>{seats === 1 ? "seat" : "seats"}</dt>
          <dd>
            <RollingNumber value={seats} />
          </dd>
        </div>
      </Stats>
      <Rate>
        <RateStars bookingId={bookingId} name={otherName} initial={rating} />
      </Rate>
    </Wrap>
  );
}
