"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { Star } from "@/components/icons";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { rateBookingAction } from "@/lib/trips/journey-actions";

const Row = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  > span {
    display: grid;
    gap: 2px;
  }
  b {
    font-size: 15px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  small {
    font-size: 13px;
    color: ${nocturne.muted};
  }
`;

const Stars = styled.div`
  display: flex;
  gap: 2px;
`;

const StarBtn = styled.button<{ $on: boolean }>`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ $on }) => ($on ? nocturne.star : nocturne.line2)};
  cursor: pointer;
  transition:
    color ${dur.press} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

export function RateStars({
  bookingId,
  name,
  initial,
}: {
  bookingId: string;
  name: string;
  initial: number | null | undefined;
}) {
  const [score, setScore] = useState<number>(initial ?? 0);
  const [hover, setHover] = useState(0);
  const [done, setDone] = useState(!!initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const first = name.split(" ")[0] || name;

  function rate(n: number) {
    if (done || pending) return;
    setScore(n);
    setError("");
    startTransition(async () => {
      const r = await rateBookingAction(bookingId, n);
      if (r.ok) setDone(true);
      else {
        setScore(0);
        setError(r.error);
      }
    });
  }

  const shown = hover || score;

  return (
    <Row>
      <span>
        <b>{done ? `You rated ${first}` : `Rate ${first}`}</b>
        <small role={error ? "alert" : undefined}>{error || (done ? "Thanks for the rating" : "How was the ride?")}</small>
      </span>
      <Stars role="radiogroup" aria-label={`Rate ${name}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarBtn
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            $on={n <= shown}
            disabled={done || pending}
            onMouseEnter={() => !done && setHover(n)}
            onClick={() => rate(n)}
          >
            <Star size={24} weight="fill" />
          </StarBtn>
        ))}
      </Stars>
    </Row>
  );
}
