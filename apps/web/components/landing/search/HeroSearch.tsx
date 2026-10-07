"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  MapPin,
  Minus,
  NavigationArrow as Navigation,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "@/components/icons";
import { nocturne } from "../nocturne";
import { scrollToFind, useSharedRideSearch } from "./RideSearchContext";

const MAX_SEATS = 8;

const Wrap = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Card = styled.div`
  position: relative;
  z-index: 5;
  padding: 15px 16px 12px;
  border-radius: 24px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  box-shadow: ${nocturne.panelShadow};
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);

  @media (max-width: 640px) {
    padding: 13px;
    border-radius: 20px;
  }
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 8px 11px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${nocturne.accent};

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${nocturne.ctaBg};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.15fr 1.15fr 0.9fr 0.9fr auto;
  gap: 7px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const Slot = styled.div`
  position: relative;
  min-width: 0;
`;

const fieldBox = `
  min-height: 68px;
  background: ${nocturne.bg};
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 10px 13px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
`;

const Field = styled.label`
  ${fieldBox}
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  cursor: text;

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  &[data-tone="origin"] svg {
    color: ${nocturne.ctaBg};
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    background: ${nocturne.surface};
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  input {
    display: block;
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: 0;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    appearance: none;
    -webkit-appearance: none;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
    text-overflow: ellipsis;
    caret-color: ${nocturne.accent};
  }
  input:focus,
  input:focus-visible {
    outline: none;
    box-shadow: none;
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
    transition: background-color 9999s ease-out;
    box-shadow: 0 0 0 1000px ${nocturne.bg} inset;
  }
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Suggestions = styled.ul`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 40;
  min-width: max(100%, 240px);
  max-height: min(60vh, 320px);
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 18px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.panelShadow};

  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.14s ease;
  }
  button:hover,
  button[data-active="true"] {
    background: ${nocturne.bg};
  }
  button:focus-visible {
    background: ${nocturne.bg};
    outline: 2px solid ${nocturne.accent};
    outline-offset: -2px;
  }
  button[data-selected="true"] {
    color: ${nocturne.accent};
  }
  button[data-selected="true"]::after {
    content: "✓";
    margin-left: auto;
    font-weight: 700;
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  small {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: ${nocturne.muted2};
  }
`;

const Cell = styled.div`
  position: relative;
  min-width: 0;
`;

const PickerButton = styled.button`
  ${fieldBox}
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-width: 0;
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    flex: none;
    color: ${nocturne.accent};
    transition: transform 0.2s ease;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 15px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &[aria-expanded="true"] {
    border-color: ${nocturne.accent};
    background: ${nocturne.surface};
  }
  &[aria-expanded="true"] svg:last-child {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    background: ${nocturne.surface};
  }
  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const SeatsField = styled.div`
  ${fieldBox}
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    background: ${nocturne.surface};
  }
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
`;

const Cal = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 30;
  width: min(330px, 86vw);
  max-height: 70vh;
  overflow-y: auto;
  padding: 14px;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.panelShadow};
  color: ${nocturne.cream};

  @media (max-width: 640px) {
    left: auto;
    right: 0;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .head b {
    font-size: 15px;
    font-weight: 700;
    text-transform: capitalize;
  }
  .week,
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .week span {
    padding: 6px 0;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  .day {
    aspect-ratio: 1;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.14s ease,
      color 0.14s ease,
      transform 0.12s ease;
  }
  .day:hover:not(:disabled) {
    background: ${nocturne.bg};
  }
  .day:active:not(:disabled) {
    transform: scale(0.92);
  }
  .day:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 1px;
  }
  .day[data-today="true"] {
    box-shadow: inset 0 0 0 1.5px ${nocturne.accent};
  }
  .day[data-selected="true"] {
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
    font-weight: 700;
  }
  .day:disabled {
    color: ${nocturne.muted3};
    opacity: 0.4;
    cursor: default;
  }
  .now {
    width: 100%;
    margin-top: 12px;
    height: 40px;
    border: none;
    border-radius: 999px;
    background: ${nocturne.bg};
    color: ${nocturne.accent};
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.16s ease;
  }
  .now:hover {
    background: ${nocturne.line2};
  }
  .now:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Round = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    background 0.18s ease,
    transform 0.12s ease;

  &:hover:not(:disabled) {
    background: ${nocturne.line2};
  }
  &:active:not(:disabled) {
    transform: scale(0.92);
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: stretch;
  gap: 6px;

  @media (max-width: 960px) {
    grid-column: 1 / -1;
  }
`;

const ClearBtn = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 44px;
  border: 1px solid ${nocturne.line};
  border-radius: 15px;
  background: transparent;
  color: ${nocturne.muted2};
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: ${nocturne.bg};
    color: ${nocturne.cream};
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const SearchBtn = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 68px;
  padding: 0 27px;
  border: none;
  border-radius: 15px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    filter 0.2s ease,
    transform 0.15s ease;

  &:hover {
    filter: brightness(0.94);
    transform: translateY(-2px);
  }
  &:active {
    transform: translateY(0);
  }
  &:disabled {
    cursor: progress;
    opacity: 0.7;
    transform: none;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (max-width: 960px) {
    min-height: 62px;
  }
  @media (max-width: 640px) {
    min-height: 53px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Hint = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 8px 0;
  font-size: 11px;
  color: ${nocturne.muted2};

  svg {
    flex: none;
  }
  @media (max-width: 640px) {
    overflow: hidden;
    font-size: 9px;
    white-space: nowrap;
  }
`;

function whenLabel(when: { mode: "now" } | { mode: "schedule"; date: string }) {
  if (when.mode === "now") return "Today";
  const dt = new Date(`${when.date}T00:00:00`);
  return dt.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function seatsLabel(seats: number) {
  return `${seats} ${seats === 1 ? "seat" : "seats"}`;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Local YYYY-MM-DD; toISOString() would shift the day for UTC+3 users. */
function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Day numbers for a month grid that starts on Monday; null pads the first row. */
function monthCells(y: number, m: number): (number | null)[] {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

export function HeroSearch() {
  const search = useSharedRideSearch();
  const { from, to, when, seats, towns, detecting, phase } = search;

  const rootRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<"from" | "to" | null>(null);
  const [hi, setHi] = useState(-1);
  const [calOpen, setCalOpen] = useState(false);
  const [today, setToday] = useState("");
  const [view, setView] = useState({ y: 0, m: 0 });

  useEffect(() => {
    const now = new Date();
    setToday(iso(now.getFullYear(), now.getMonth(), now.getDate()));
    setView({ y: now.getFullYear(), m: now.getMonth() });
  }, []);

  useEffect(() => {
    if (!calOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!datesRef.current?.contains(e.target as Node)) setCalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [calOpen]);

  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const matches = useMemo(() => {
    if (!active) return [];
    const q = (active === "from" ? from : to).trim().toLowerCase();
    const other = (active === "from" ? to : from).trim().toLowerCase();
    return towns
      .filter((t) => {
        const name = t.name.toLowerCase();
        return name !== other && (!q || name.includes(q));
      })
      .slice(0, 6);
  }, [active, from, to, towns]);

  function pick(field: "from" | "to", name: string) {
    setHi(-1);
    if (field === "from") {
      search.setFrom(name);
      setActive("to");
      requestAnimationFrame(() => toRef.current?.focus());
    } else {
      search.setTo(name);
      setActive(null);
    }
  }

  /** Arrow keys move through suggestions; Enter picks one, else searches. */
  function onFieldKey(field: "from" | "to", e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!matches.length) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHi((i) => (i + step + matches.length) % matches.length);
      return;
    }
    if (e.key === "Enter") {
      if (active === field && hi >= 0 && matches[hi]) {
        e.preventDefault();
        pick(field, matches[hi].name);
        return;
      }
      submit();
    }
  }

  function shiftMonth(by: number) {
    setView(({ y, m }) => {
      const d = new Date(y, m + by, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function toggleCalendar() {
    setActive(null);
    if (!calOpen && when.mode === "schedule") {
      const [y, m] = when.date.split("-").map(Number);
      if (y && m) setView({ y, m: m - 1 });
    }
    setCalOpen((v) => !v);
  }

  function chooseDay(day: number) {
    search.setWhen({ mode: "schedule", date: iso(view.y, view.m, day) });
    setCalOpen(false);
  }

  function submit() {
    if (!to.trim()) {
      toRef.current?.focus();
      return;
    }
    setCalOpen(false);
    setActive(null);
    void search.run();
    scrollToFind();
  }

  function clear() {
    search.reset();
    search.setFrom("");
    search.setTo("");
    setCalOpen(false);
  }

  const showClear =
    Boolean(from || to) ||
    when.mode === "schedule" ||
    seats > 1 ||
    phase !== "idle";

  const searching = phase === "searching";

  const nowMonth = new Date(`${today || "2000-01-01"}T00:00:00`);
  const atCurrentMonth =
    view.y < nowMonth.getFullYear() ||
    (view.y === nowMonth.getFullYear() && view.m <= nowMonth.getMonth());
  const monthTitle = new Date(view.y, view.m, 1).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });

  return (
    <Wrap ref={rootRef}>
      <Card role="search" aria-label="Find a ride">
        <Eyebrow>Plan your next trip</Eyebrow>

        <Grid>
          <Slot>
            <Field data-tone="origin">
              <Navigation size={20} />
              <span className="body">
                <small>Leaving from</small>
                <input
                  value={from}
                  placeholder={detecting ? "Detecting your town…" : "Where from?"}
                  onChange={(e) => {
                    search.setFrom(e.target.value);
                    setHi(-1);
                  }}
                  onFocus={() => {
                    search.expand();
                    setCalOpen(false);
                    setHi(-1);
                    setActive("from");
                  }}
                  onKeyDown={(e) => onFieldKey("from", e)}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={active === "from" && matches.length > 0}
                  aria-autocomplete="list"
                  aria-label="Origin town"
                />
              </span>
            </Field>
            {active === "from" && matches.length > 0 && (
              <Suggestions role="listbox">
                {matches.map((t, i) => (
                  <li
                    key={`${t.name}-${t.county ?? ""}`}
                    role="option"
                    aria-selected={i === hi}
                  >
                    <button
                      type="button"
                      data-active={i === hi}
                      data-selected={
                        t.name.toLowerCase() === from.trim().toLowerCase()
                      }
                      onMouseEnter={() => setHi(i)}
                      onClick={() => pick("from", t.name)}
                    >
                      <MapPin size={16} />
                      <span>
                        {t.name}
                        {t.county &&
                        t.county.toLowerCase() !== t.name.toLowerCase() ? (
                          <small>{t.county}</small>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </Suggestions>
            )}
          </Slot>

          <Slot>
            <Field>
              <MapPin size={20} />
              <span className="body">
                <small>Going to</small>
                <input
                  ref={toRef}
                  value={to}
                  placeholder="Where are you going?"
                  onChange={(e) => {
                    search.setTo(e.target.value);
                    setHi(-1);
                  }}
                  onFocus={() => {
                    search.expand();
                    setCalOpen(false);
                    setHi(-1);
                    setActive("to");
                  }}
                  onKeyDown={(e) => onFieldKey("to", e)}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={active === "to" && matches.length > 0}
                  aria-autocomplete="list"
                  aria-label="Destination town"
                />
              </span>
            </Field>
            {active === "to" && matches.length > 0 && (
              <Suggestions role="listbox">
                {matches.map((t, i) => (
                  <li
                    key={`${t.name}-${t.county ?? ""}`}
                    role="option"
                    aria-selected={i === hi}
                  >
                    <button
                      type="button"
                      data-active={i === hi}
                      data-selected={
                        t.name.toLowerCase() === to.trim().toLowerCase()
                      }
                      onMouseEnter={() => setHi(i)}
                      onClick={() => pick("to", t.name)}
                    >
                      <MapPin size={16} />
                      <span>
                        {t.name}
                        {t.county &&
                        t.county.toLowerCase() !== t.name.toLowerCase() ? (
                          <small>{t.county}</small>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </Suggestions>
            )}
          </Slot>

          <Cell ref={datesRef}>
            <PickerButton
              type="button"
              aria-haspopup="dialog"
              aria-expanded={calOpen}
              onClick={toggleCalendar}
            >
              <Calendar size={20} />
              <span className="text">
                <small>When</small>
                <b>{whenLabel(when)}</b>
              </span>
              <CaretDown size={16} />
            </PickerButton>

            {calOpen && (
              <Cal role="dialog" aria-label="Choose travel date">
                <div className="head">
                  <Round
                    type="button"
                    aria-label="Previous month"
                    disabled={atCurrentMonth}
                    onClick={() => shiftMonth(-1)}
                  >
                    <CaretLeft size={14} />
                  </Round>
                  <b>{monthTitle}</b>
                  <Round
                    type="button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                  >
                    <CaretRight size={14} />
                  </Round>
                </div>

                <div className="week" aria-hidden="true">
                  {WEEKDAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid">
                  {monthCells(view.y, view.m).map((day, i) => {
                    if (day === null) return <span key={`pad-${i}`} />;
                    const value = iso(view.y, view.m, day);
                    return (
                      <button
                        key={value}
                        type="button"
                        className="day"
                        disabled={Boolean(today) && value < today}
                        data-today={value === today}
                        data-selected={
                          when.mode === "schedule" && when.date === value
                        }
                        aria-label={new Date(
                          view.y,
                          view.m,
                          day,
                        ).toLocaleDateString("en-KE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        onClick={() => chooseDay(day)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="now"
                  onClick={() => {
                    search.setWhen({ mode: "now" });
                    setCalOpen(false);
                  }}
                >
                  Leave today
                </button>
              </Cal>
            )}
          </Cell>

          <SeatsField>
            <Users size={20} />
            <span className="text">
              <small>Passengers</small>
              <b aria-live="polite">{seatsLabel(seats)}</b>
            </span>
            <Stepper>
              <Round
                type="button"
                aria-label="Fewer passengers"
                disabled={seats <= 1}
                onClick={() => search.setSeats(seats - 1)}
              >
                <Minus size={14} />
              </Round>
              <Round
                type="button"
                aria-label="More passengers"
                disabled={seats >= MAX_SEATS}
                onClick={() => search.setSeats(seats + 1)}
              >
                <Plus size={14} />
              </Round>
            </Stepper>
          </SeatsField>

          <Actions>
            {showClear && (
              <ClearBtn type="button" onClick={clear} aria-label="Clear search">
                <X size={18} />
              </ClearBtn>
            )}
            <SearchBtn type="button" onClick={submit} disabled={searching}>
              <MagnifyingGlass size={20} />
              {searching ? "Searching…" : "Search"}
            </SearchBtn>
          </Actions>
        </Grid>

        <Hint>
          <ShieldCheck size={16} />
          Verified drivers · Secure M-Pesa payments · Free cancellation
        </Hint>
      </Card>
    </Wrap>
  );
}
