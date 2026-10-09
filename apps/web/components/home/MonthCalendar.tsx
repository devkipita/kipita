"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { CaretLeft, CaretRight } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: +match[1]!, m: +match[2]! - 1, d: +match[3]! };
}

const Wrap = styled.div`
  border-radius: 20px;
  background: ${nocturne.surface};
  padding: 16px 16px 10px;
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  margin-bottom: 14px;

  b {
    grid-column: 2;
    text-align: center;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
`;

const NavBtn = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.surface2};
  color: ${nocturne.accent};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: ${nocturne.surface3};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const Dow = styled.span`
  display: grid;
  place-items: center;
  height: 30px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const Day = styled.button<{ $on: boolean; $today: boolean }>`
  position: relative;
  height: 44px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : nocturne.line)};
  border-radius: 12px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $on, $today }) => ($on || $today ? 700 : 500)};
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;

  &:hover:not(:disabled) {
    border-color: ${nocturne.accent};
  }

  &:disabled {
    border-color: transparent;
    background: transparent;
    color: ${nocturne.muted3};
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }

  ${({ $today, $on }) =>
    $today && !$on
      ? `&::after {
           content: "";
           position: absolute;
           left: 50%;
           bottom: 7px;
           width: 4px;
           height: 4px;
           margin-left: -2px;
           border-radius: 50%;
           background: ${nocturne.ctaBg};
         }`
      : ""}
`;

export function MonthCalendar({
  value,
  min,
  onChange,
}: {
  value: string;
  min: string;
  onChange: (iso: string) => void;
}) {
  const selected = parseIso(value);
  const floor = parseIso(min);
  const start = selected ?? floor ?? { y: 2026, m: 0, d: 1 };
  const [view, setView] = useState({ y: start.y, m: start.m });

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    // Monday-first offset.
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const list: (number | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d += 1) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [view]);

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });

  const atFloor =
    !!floor && view.y === floor.y && view.m === floor.m;

  const step = (delta: number) =>
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  return (
    <Wrap>
      <Head>
        <NavBtn
          type="button"
          aria-label="Previous month"
          disabled={atFloor}
          onClick={() => step(-1)}
        >
          <CaretLeft size={18} aria-hidden />
        </NavBtn>
        <b>{monthLabel}</b>
        <NavBtn type="button" aria-label="Next month" onClick={() => step(1)}>
          <CaretRight size={18} aria-hidden />
        </NavBtn>
      </Head>

      <Grid role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((d) => (
          <Dow key={d} aria-hidden>
            {d.slice(0, 2)}
          </Dow>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <span key={`gap-${i}`} aria-hidden />;
          const iso = toIso(view.y, view.m, d);
          const disabled = iso < min;
          return (
            <Day
              key={iso}
              type="button"
              role="gridcell"
              $on={iso === value}
              $today={iso === min}
              aria-selected={iso === value}
              aria-label={new Date(view.y, view.m, d).toLocaleDateString("en-KE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              disabled={disabled}
              onClick={() => onChange(iso)}
            >
              {d}
            </Day>
          );
        })}
      </Grid>
    </Wrap>
  );
}
