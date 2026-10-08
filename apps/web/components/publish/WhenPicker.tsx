"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import { nocturne } from "@/lib/nocturne";

const DAYS = 21;
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const pad = (n: number) => String(n).padStart(2, "0");

function isoFor(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── Date: a horizontal strip of days you flick through ── */

const Strip = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Day = styled.button<{ $on: boolean }>`
  flex: 0 0 auto;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 72px;
  padding: 12px 0 10px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : nocturne.line)};
  border-radius: 16px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.bg)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  .dow {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .num {
    font-size: 23px;
    font-weight: 800;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .mon {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.75;
  }

  &:hover {
    border-color: ${nocturne.accent};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

/* ── Time: two snap-scrolling number columns ── */

const Wheel = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 18px 1fr;
  align-items: center;
  padding: 8px;
  border-radius: 18px;
  background: ${nocturne.bg};
  border: 1.5px solid ${nocturne.line};

  /* The band the centred value sits in. */
  &::before {
    content: "";
    position: absolute;
    left: 10px;
    right: 10px;
    top: 50%;
    height: 46px;
    margin-top: -23px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    pointer-events: none;
  }

  .colon {
    position: relative;
    z-index: 1;
    text-align: center;
    font-size: 22px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
`;

const Col = styled.div`
  position: relative;
  z-index: 1;
  height: 184px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  /* Half the track minus half a row, so the first and last can reach centre. */
  padding: 69px 0;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Num = styled.button<{ $on: boolean }>`
  display: block;
  width: 100%;
  height: 46px;
  scroll-snap-align: center;
  border: none;
  background: transparent;
  font: inherit;
  font-size: ${({ $on }) => ($on ? "24px" : "20px")};
  font-weight: ${({ $on }) => ($on ? 800 : 500)};
  font-variant-numeric: tabular-nums;
  color: ${({ $on }) => ($on ? nocturne.cream : nocturne.muted3)};
  cursor: pointer;
  transition:
    color 0.15s ease,
    font-size 0.15s ease;

  &:focus-visible {
    outline: none;
    color: ${nocturne.accent};
  }
`;

const Label = styled.span`
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const ROW = 46;

/**
 * Binds a column to a value in both directions: it centres on the value, and
 * commits whichever row ends up centred after a scroll. Selection has to come
 * from scroll position — a click alone is unreliable while the column is
 * snapping, which is how a 09 tap once committed as 07.
 */
function useWheel(
  value: number,
  list: number[],
  onPick: (next: number) => void,
) {
  const ref = useRef<HTMLDivElement>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const index = list.indexOf(value);
    if (index < 0) return;
    const top = index * ROW;
    if (Math.abs(el.scrollTop - top) < 2) return;
    programmatic.current = true;
    el.scrollTo({ top, behavior: "auto" });
    // Let the scroll event from this write pass before listening again.
    setTimeout(() => {
      programmatic.current = false;
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (programmatic.current) return;
      if (settling.current) clearTimeout(settling.current);
      settling.current = setTimeout(() => {
        const index = Math.round(el.scrollTop / ROW);
        const picked = list[Math.max(0, Math.min(list.length - 1, index))];
        if (picked !== undefined && picked !== value) onPick(picked);
      }, 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (settling.current) clearTimeout(settling.current);
    };
  }, [value, list, onPick]);

  return ref;
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const days = Array.from({ length: DAYS }, (_, i) => {
    const iso = isoFor(i);
    const d = new Date(`${iso}T00:00:00`);
    return {
      iso,
      dow: i === 0 ? "Today" : d.toLocaleDateString("en-KE", { weekday: "short" }),
      num: d.getDate(),
      mon: d.toLocaleDateString("en-KE", { month: "short" }),
    };
  });

  return (
    <div>
      <Label id="pick-day">Which day?</Label>
      <Strip role="radiogroup" aria-labelledby="pick-day">
        {days.map((d) => (
          <Day
            key={d.iso}
            type="button"
            role="radio"
            aria-checked={value === d.iso}
            $on={value === d.iso}
            onClick={() => onChange(d.iso)}
          >
            <span className="dow">{d.dow}</span>
            <span className="num">{d.num}</span>
            <span className="mon">{d.mon}</span>
          </Day>
        ))}
      </Strip>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hhmm: string) => void;
}) {
  const [hRaw, mRaw] = value.split(":");
  const hour = Number.isFinite(Number(hRaw)) ? Number(hRaw) : 7;
  const minute = MINUTES.includes(Number(mRaw)) ? Number(mRaw) : 0;

  const hourRef = useWheel(hour, HOURS, (h) =>
    onChange(`${pad(h)}:${pad(minute)}`),
  );
  const minRef = useWheel(minute, MINUTES, (m) =>
    onChange(`${pad(hour)}:${pad(m)}`),
  );

  return (
    <div>
      <Label id="pick-time">What time?</Label>
      <Wheel>
        <Col ref={hourRef} role="listbox" aria-label="Hour" tabIndex={-1}>
          {HOURS.map((h, i) => (
            <Num
              key={h}
              data-i={i}
              type="button"
              role="option"
              aria-selected={h === hour}
              $on={h === hour}
              onClick={() => onChange(`${pad(h)}:${pad(minute)}`)}
            >
              {pad(h)}
            </Num>
          ))}
        </Col>

        <span className="colon" aria-hidden>
          :
        </span>

        <Col ref={minRef} role="listbox" aria-label="Minute" tabIndex={-1}>
          {MINUTES.map((m, i) => (
            <Num
              key={m}
              data-i={i}
              type="button"
              role="option"
              aria-selected={m === minute}
              $on={m === minute}
              onClick={() => onChange(`${pad(hour)}:${pad(m)}`)}
            >
              {pad(m)}
            </Num>
          ))}
        </Col>
      </Wheel>
    </div>
  );
}
