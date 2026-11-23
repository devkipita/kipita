"use client";

import styled, { css } from "styled-components";
import { LEAST_CAR_SEATS, MOST_CAR_SEATS } from "@kipita/shared";
import { nocturne } from "@/lib/nocturne";

const COUNTS = Array.from({ length: MOST_CAR_SEATS - LEAST_CAR_SEATS + 1 }, (_, i) => LEAST_CAR_SEATS + i);

const ring = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;

  .ask {
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .hint {
    margin: -4px 0 0;
    font-size: 13px;
    color: ${nocturne.muted};
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const Chip = styled.button<{ $on: boolean }>`
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.surface2 : nocturne.surface)};
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  color: ${nocturne.cream};
  cursor: pointer;
  ${ring}

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

/**
 * Asks how many seats a car has. The count includes the driver's seat, the way people say it ("a
 * 7-seater"); the passengers it carries are one fewer. Used wherever a car is added and for a saved car
 * that has not been asked yet.
 */
export function CarSeatsPicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  /** unique on the page; labels the group */
  id: string;
  value: number | null;
  onChange: (seats: number) => void;
  disabled?: boolean;
}) {
  return (
    <Wrap>
      <span className="ask" id={id}>
        How many seats does it have?
      </span>
      <p className="hint">Count yours too.</p>
      <div className="row" role="radiogroup" aria-labelledby={id}>
        {COUNTS.map((n) => (
          <Chip
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} seats`}
            $on={value === n}
            disabled={disabled}
            onClick={() => onChange(n)}
          >
            {n}
          </Chip>
        ))}
      </div>
    </Wrap>
  );
}
