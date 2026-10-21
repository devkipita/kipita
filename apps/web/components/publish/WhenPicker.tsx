"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styled from "styled-components";
import { CalendarBlank, CaretLeft, CaretRight, Minus, Plus } from "@/components/icons";
import { MonthCalendar } from "@/components/home/MonthCalendar";
import { RollingNumber } from "@/components/ui/Counter";
import { nocturne } from "@/lib/nocturne";
import { Choice, Choices, RULE, TextAction } from "./controls";

const STRIP_DAYS = 7;
const PRESETS = ["06:00", "07:30", "09:00", "12:00", "15:00", "18:00"];

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoFor(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function prettyTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(Number.isFinite(m) ? m : 0)} ${h < 12 ? "am" : "pm"}`;
}

function partOfDay(hour: number) {
  if (hour < 5) return "overnight";
  if (hour < 12) return "in the morning";
  if (hour < 17) return "in the afternoon";
  if (hour < 21) return "in the evening";
  return "at night";
}

const Head = styled.div<{ $bare?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $bare }) => ($bare ? "flex-start" : "space-between")};
  gap: 12px;
  margin-bottom: 14px;
`;

const StripHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  .span {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted2};
  }
`;

const Label = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 17px;
  font-weight: 700;
  color: ${nocturne.cream};

  svg {
    color: ${nocturne.accent};
  }
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Nudge = styled.button`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid ${RULE};
  border-radius: 10px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    transform 0.12s ease;

  svg {
    transition: transform 0.18s ease;
  }
  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      background: ${nocturne.surface2};
    }
    &:hover svg {
      transform: scale(1.16);
    }
  }
  &:active {
    transform: scale(0.94);
    background: ${nocturne.surface3};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
    border-color: ${nocturne.accent};
  }
  @media (prefers-reduced-motion: reduce) {
    &:active,
    &:hover svg {
      transform: none;
    }
  }
`;

const Strip = styled.div`
  display: flex;
  gap: 8px;
  padding: 2px;
  margin: -2px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 759px) {
    margin-inline: calc(-1 * var(--page-pad, 18px));
    padding-inline: var(--page-pad, 18px);
    scroll-padding-inline: var(--page-pad, 18px);
  }

  @media (min-width: 760px) {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    overflow-x: visible;
  }
`;

const Day = styled.button<{ $on: boolean }>`
  flex: 0 0 auto;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 72px;
  padding: 6px 0 7px;

  @media (min-width: 760px) {
    width: auto;
  }
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.accent : RULE)};
  border-radius: 10px;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.12s ease,
    box-shadow 0.16s ease;

  .dow,
  .mon {
    font-size: 14px;
    font-weight: 600;
    color: ${({ $on }) => ($on ? nocturne.onGreenMuted : nocturne.muted)};
  }
  .num {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 26px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      background: ${({ $on }) => ($on ? nocturne.green : nocturne.sage)};
      color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.greenDeep)};
      box-shadow: none;
    }
    &:hover .dow,
    &:hover .mon {
      color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.greenDeep)};
    }
  }
  &:active {
    background: ${({ $on }) => ($on ? nocturne.greenDeep : nocturne.accent)};
    color: ${nocturne.onGreen};
    box-shadow: none;
  }
  &:active .dow,
  &:active .mon {
    color: ${nocturne.onGreenMuted};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
    border-color: ${nocturne.accent};
  }
  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const CalWrap = styled.div`
  max-width: 420px;
  margin-top: 14px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1.5px ${RULE};
`;

const Board = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  width: fit-content;
  max-width: 100%;
  padding: 14px 18px;
  border-radius: 16px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (max-width: 420px) {
    gap: 10px;
    padding: 12px;
  }
`;

const Digits = styled.div`
  display: flex;
  align-items: center;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 50px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;

  .colon {
    padding: 0 2px;
    transform: translateY(-0.05em);
  }

  @media (max-width: 420px) {
    font-size: 38px;
  }
`;

const Spin = styled.span`
  position: relative;
  display: inline-flex;
  justify-content: center;
  min-width: 44px;
  padding: 2px 6px;
  border-radius: 8px;

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    text-align: center;
    color: transparent;
    caret-color: transparent;
    cursor: pointer;
  }
  input::selection {
    background: transparent;
  }
  .roll {
    display: inline-flex;
    transition: opacity 0.12s ease;
  }

  &:focus-within {
    background: rgba(255, 255, 255, 0.16);
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
  &:focus-within .roll {
    opacity: 0;
  }
  &:focus-within input {
    color: ${nocturne.onGreen};
    caret-color: ${nocturne.lime};
  }
`;

const Meridiem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  button {
    min-width: 56px;
    min-height: 44px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.04em;
    cursor: pointer;
  }
  button[aria-pressed="true"] {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  button[aria-pressed="false"] {
    background: rgba(255, 255, 255, 0.14);
    color: ${nocturne.onGreen};
  }
  button:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const Steps = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;

  button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: ${nocturne.onGreen};
    cursor: pointer;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.26);
  }
  button:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const PresetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px 28px;
  flex-wrap: wrap;
  margin-top: 18px;

  > ${Choices} {
    flex: 1 1 320px;
  }

  @media (max-width: 520px) {
    display: grid;
    gap: 16px;

    > ${Choices} {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;

const Readback = styled.p`
  margin: 14px 0 0;
  font-size: 16px;
  color: ${nocturne.muted};

  b {
    color: ${nocturne.cream};
    font-weight: 700;
  }
`;

export function DatePicker({
  value,
  onChange,
  hideLabel = false,
  calendar = false,
  onCloseCalendar,
}: {
  value: string;
  onChange: (iso: string) => void;
  hideLabel?: boolean;
  calendar?: boolean;
  onCloseCalendar?: () => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 4);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const days = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const iso = isoFor(i);
    const d = new Date(`${iso}T00:00:00`);
    return {
      iso,
      dow:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-KE", { weekday: "short" }),
      num: d.getDate(),
      mon: d.toLocaleDateString("en-KE", { month: "short" }),
      full: d.toLocaleDateString("en-KE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };
  });

  const current = Math.max(
    0,
    days.findIndex((d) => d.iso === value),
  );

  const nudge = (delta: number) =>
    strip.current?.scrollBy({ left: delta, behavior: "smooth" });

  function roving(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? Math.min(index + 1, days.length - 1)
        : event.key === "ArrowLeft"
          ? Math.max(index - 1, 0)
          : event.key === "Home"
            ? 0
            : days.length - 1;
    const target = days[next];
    if (!target) return;
    onChange(target.iso);
    const node = strip.current?.querySelector<HTMLButtonElement>(
      `[data-iso="${target.iso}"]`,
    );
    node?.focus();
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div>
      {!hideLabel && (
        <Head>
          <Label id="pick-day">
            <CalendarBlank size={19} aria-hidden />
            Which day?
          </Label>
        </Head>
      )}

      {scrollable && (
        <StripHead>
          <Nudge
            type="button"
            aria-label="Show earlier days"
            onClick={() => nudge(-252)}
          >
            <CaretLeft size={17} aria-hidden />
          </Nudge>
          <span className="span">
            {days[0]?.num} {days[0]?.mon} &ndash; {days[days.length - 1]?.num}{" "}
            {days[days.length - 1]?.mon}
          </span>
          <Nudge
            type="button"
            aria-label="Show later days"
            onClick={() => nudge(252)}
          >
            <CaretRight size={17} aria-hidden />
          </Nudge>
        </StripHead>
      )}

      <Strip
        ref={strip}
        role="radiogroup"
        aria-label={hideLabel ? "Which day do you leave?" : undefined}
        aria-labelledby={hideLabel ? undefined : "pick-day"}
      >
          {days.map((d, i) => (
            <Day
              key={d.iso}
              data-iso={d.iso}
              type="button"
              role="radio"
              aria-checked={value === d.iso}
              aria-label={d.full}
              tabIndex={i === current ? 0 : -1}
              $on={value === d.iso}
              onKeyDown={(e) => roving(e, i)}
              onClick={() => onChange(d.iso)}
            >
              <span className="dow">{d.dow}</span>
              <span className="num">{d.num}</span>
              <span className="mon">{d.mon}</span>
            </Day>
          ))}
      </Strip>

      {calendar && (
        <CalWrap>
          <MonthCalendar
            value={value}
            min={todayISO()}
            onChange={(iso) => {
              onChange(iso);
              onCloseCalendar?.();
            }}
          />
        </CalWrap>
      )}
    </div>
  );
}

function Part({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const editing = useRef(false);
  const span = max - min + 1;

  if (!editing.current && text !== String(value)) setText(String(value));

  function wrap(next: number) {
    const safe = ((((next - min) % span) + span) % span) + min;
    setText(String(safe));
    onChange(safe);
  }

  const tens = Math.floor(value / 10);

  return (
    <Spin>
      <span className="roll" aria-hidden="true">
        {(min === 0 || value >= 10) && (
          <RollingNumber value={tens} duration={420} />
        )}
        <RollingNumber value={value % 10} duration={420} />
      </span>
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={min === 0 ? pad(value) : String(value)}
        value={text}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            wrap(value + step);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            wrap(value - step);
          }
        }}
        onFocus={(e) => {
          editing.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(-2);
          setText(digits);
          const n = Number(digits);
          if (digits !== "" && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => {
          editing.current = false;
          const n = Math.max(min, Math.min(max, Number(text) || min));
          setText(String(n));
          onChange(n);
        }}
      />
    </Spin>
  );
}

export function TimePicker({
  value,
  onChange,
  onPick,
  hideLabel = false,
  action,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  onPick?: (hhmm: string) => void;
  hideLabel?: boolean;
  action?: ReactNode;
}) {
  const [hRaw, mRaw] = value.split(":");
  const hour24 = Math.max(0, Math.min(23, Number(hRaw) || 0));
  const minute = Math.max(0, Math.min(59, Number(mRaw) || 0));
  const pm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const set = (h12: number, m: number, afternoon: boolean) => {
    const h = (h12 % 12) + (afternoon ? 12 : 0);
    onChange(`${pad(h)}:${pad(m)}`);
  };

  function shift(mins: number) {
    const total = (((hour24 * 60 + minute + mins) % 1440) + 1440) % 1440;
    onChange(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  }

  return (
    <div>
      {!hideLabel && (
        <Head>
          <Label id="pick-time">What time do you leave?</Label>
        </Head>
      )}

      <Board
        role="group"
        aria-label={hideLabel ? "Departure time" : undefined}
        aria-labelledby={hideLabel ? undefined : "pick-time"}
      >
        <Digits>
          <Part
            value={hour12}
            min={1}
            max={12}
            step={1}
            label="Hour"
            onChange={(h) => set(h, minute, pm)}
          />
          <span className="colon" aria-hidden>
            :
          </span>
          <Part
            value={minute}
            min={0}
            max={59}
            step={5}
            label="Minutes"
            onChange={(m) => set(hour12, m, pm)}
          />
        </Digits>

        <Meridiem>
          <button
            type="button"
            aria-pressed={!pm}
            onClick={() => set(hour12, minute, false)}
          >
            AM
          </button>
          <button
            type="button"
            aria-pressed={pm}
            onClick={() => set(hour12, minute, true)}
          >
            PM
          </button>
        </Meridiem>

        <Steps>
          <button
            type="button"
            aria-label="Fifteen minutes earlier"
            onClick={() => shift(-15)}
          >
            <Minus size={19} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Fifteen minutes later"
            onClick={() => shift(15)}
          >
            <Plus size={19} aria-hidden />
          </button>
        </Steps>
      </Board>

      <Readback aria-live="polite">
        Leaving <b>{prettyTime(`${pad(hour24)}:${pad(minute)}`)}</b>{" "}
        {partOfDay(hour24)}. Tap a number to type it, or use the arrow keys.
      </Readback>

      <PresetRow>
        <Choices>
          {PRESETS.map((t) => (
            <Choice
              key={t}
              type="button"
              $on={value === t}
              aria-pressed={value === t}
              onClick={() => (onPick ? onPick(t) : onChange(t))}
            >
              {prettyTime(t)}
            </Choice>
          ))}
        </Choices>
        {action}
      </PresetRow>
    </div>
  );
}
