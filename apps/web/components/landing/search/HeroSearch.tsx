"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  Calendar,
  CaretDown,
  CaretLeft,
  CaretRight,
  MapPin,
  Minus,
  NavigationArrow as Navigation,
  Plus,
  Users,
  X,
} from "@/components/icons";
import { themes } from "@/lib/theme";
import { scrollToFind, useSharedRideSearch } from "./RideSearchContext";

/** The landing is always dark, so it reads the dark theme's M3 roles. */
const c = themes.dark.color;

/** Roles under the short names this file's styles already use. */
const nocturne = {
  sage: c.primary,
  lime: c.primary,
  cream: c.onSurface,
  muted2: c.onSurfaceVariant,
  muted3: c.outline,
  greenDeep: c.onPrimary,
} as const;

const MAX_SEATS = 8;

const Wrap = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Dock = styled.div`
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto auto;
  grid-template-areas: "from to dates seats actions";
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 999px;
  background: ${c.surfaceContainerLow}e6;
  border: 1px solid ${c.outlineVariant};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "from to"
      "dates seats"
      "actions actions";
    border-radius: 28px;
    padding: 10px;
  }
  @media (max-width: 560px) {
    grid-template-areas:
      "from from"
      "to to"
      "dates seats"
      "actions actions";
  }
`;

const Slot = styled.div<{ $area: string }>`
  grid-area: ${({ $area }) => $area};
  position: relative;
  min-width: 0;

  @media (min-width: 1001px) {
    &[data-slot="to"]::before {
      content: "";
      position: absolute;
      left: -4px;
      top: 22%;
      bottom: 22%;
      width: 1px;
      background: ${c.outlineVariant};
    }
  }
  @media (max-width: 560px) {
    &[data-slot="to"]::before {
      content: "";
      position: absolute;
      top: -3px;
      left: 14px;
      right: 14px;
      height: 1px;
      background: ${c.outlineVariant};
    }
  }
`;

const Field = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 9px 18px;
  border-radius: 999px;
  cursor: text;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease;

  svg {
    flex: none;
    color: ${nocturne.sage};
    transition: color 0.18s ease;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  &:focus-within {
    background: rgba(255, 255, 255, 0.1);
    box-shadow:
      inset 0 0 0 2px ${nocturne.sage},
      0 0 0 4px ${c.primary}29;
  }
  &:focus-within svg,
  &:focus-within small {
    color: ${nocturne.lime};
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  input {
    display: block;
    width: 100%;
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
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    caret-color: ${nocturne.lime};
    color-scheme: dark;
  }
  /* The field itself shows focus; a second box around the text is noise. */
  input:focus,
  input:focus-visible {
    outline: none;
    box-shadow: none;
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
    transition: color 0.18s ease;
  }
  input:focus::placeholder {
    color: ${nocturne.muted2};
  }
  input::selection {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  /* Browser autofill paints a pale box; keep it on theme. */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: ${nocturne.cream};
    caret-color: ${nocturne.lime};
    transition: background-color 9999s ease-out;
    box-shadow: 0 0 0 1000px ${c.surfaceContainerLow} inset;
  }
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Suggestions = styled.ul`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 40;
  min-width: max(100%, 240px);
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 20px;
  background: ${c.surfaceContainerHigh};
  border: 1px solid ${c.outlineVariant};
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);

  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 14px;
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
    background: rgba(255, 255, 255, 0.1);
  }
  button:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    outline: 2px solid ${nocturne.lime};
    outline-offset: -2px;
  }
  button[data-selected="true"] {
    color: ${nocturne.lime};
  }
  button[data-selected="true"]::after {
    content: "✓";
    margin-left: auto;
    font-weight: 700;
  }
  button:active {
    background: rgba(255, 255, 255, 0.16);
  }
  svg {
    flex: none;
    color: ${nocturne.sage};
  }
  small {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: ${nocturne.muted2};
  }
`;

const Panel = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  height: 54px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: ${c.surfaceContainerHighest};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.12s ease;

  svg {
    flex: none;
    color: ${nocturne.sage};
    transition:
      color 0.18s ease,
      transform 0.2s ease;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  small {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 14px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  &:active {
    transform: scale(0.985);
  }
  &[aria-expanded="true"] {
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 2px ${nocturne.sage};
  }
  &[aria-expanded="true"] svg:last-child {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 2px ${nocturne.sage},
      0 0 0 4px rgba(158, 197, 162, 0.16);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    svg {
      transition: none;
    }
  }
`;

const Cell = styled.div<{ $area: string }>`
  grid-area: ${({ $area }) => $area};
  position: relative;
  min-width: 0;

  @media (min-width: 1001px) {
    min-width: 190px;
  }
`;

const Cal = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 30;
  width: min(330px, 86vw);
  padding: 14px;
  border-radius: 24px;
  background: ${c.surfaceContainerHigh};
  border: 1px solid ${c.outlineVariant};
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
  color: ${nocturne.cream};

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
    background: rgba(255, 255, 255, 0.12);
  }
  .day:active:not(:disabled) {
    transform: scale(0.92);
  }
  .day:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 1px;
  }
  .day[data-today="true"] {
    box-shadow: inset 0 0 0 1.5px ${nocturne.sage};
  }
  .day[data-selected="true"] {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
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
    background: rgba(255, 255, 255, 0.08);
    color: ${nocturne.sage};
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.16s ease;
  }
  .now:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .now:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-width: 260px;
  padding: 14px 16px;
  border-radius: 20px;
  background: ${c.surfaceContainerHigh};
  border: 1px solid ${c.outlineVariant};
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
  color: ${nocturne.cream};

  .label b {
    display: block;
    font-size: 16px;
    font-weight: 700;
  }
  .label small {
    font-size: 13px;
    color: ${nocturne.muted2};
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  output {
    min-width: 22px;
    text-align: center;
    font-weight: 700;
    font-size: 16px;
  }
`;

const Round = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: ${c.surfaceContainerHighest};
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    background 0.18s ease,
    transform 0.12s ease;

  &:hover:not(:disabled) {
    background: ${c.outlineVariant};
  }
  &:active:not(:disabled) {
    transform: scale(0.92);
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 2px;
  }
`;

const Actions = styled.div`
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: 6px;

  @media (max-width: 1000px) {
    button:last-child {
      flex: 1;
    }
  }
`;

const SearchBtn = styled.button`
  flex: none;
  height: 54px;
  padding: 0 34px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease;

  &:hover {
    background: ${c.primaryFixed};
  }
  &:active {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${c.primaryFixedDim};
    cursor: progress;
    opacity: 0.8;
    transform: none;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.cream};
    outline-offset: 3px;
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
  return `${seats} ${seats === 1 ? "passenger" : "passengers"}`;
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
  const seatsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<"from" | "to" | null>(null);
  const [hi, setHi] = useState(-1);
  const [seatsOpen, setSeatsOpen] = useState(false);
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
    setSeatsOpen(false);
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

  useEffect(() => {
    if (!seatsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!seatsRef.current?.contains(e.target as Node)) setSeatsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeatsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [seatsOpen]);

  function submit() {
    if (!to.trim()) {
      toRef.current?.focus();
      return;
    }
    setSeatsOpen(false);
    setCalOpen(false);
    setActive(null);
    void search.run();
    scrollToFind();
  }

  function clear() {
    search.reset();
    search.setFrom("");
    search.setTo("");
    setSeatsOpen(false);
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
      <Dock role="search" aria-label="Find a ride">
        <Slot $area="from" data-slot="from">
          <Field>
            <Navigation size={18} />
            <span className="body">
              <small>From</small>
              <input
                value={from}
                placeholder={detecting ? "Detecting your town…" : "Where from?"}
                onChange={(e) => {
                  search.setFrom(e.target.value);
                  setHi(-1);
                }}
                onFocus={() => {
                  search.expand();
                  setSeatsOpen(false);
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

        <Slot $area="to" data-slot="to">
          <Field>
            <MapPin size={18} />
            <span className="body">
              <small>Where to</small>
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
                  setSeatsOpen(false);
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

        <Cell $area="dates" ref={datesRef}>
          <Panel
            type="button"
            aria-haspopup="dialog"
            aria-expanded={calOpen}
            onClick={toggleCalendar}
          >
            <Calendar size={20} />
            <span className="text">
              <small>Select dates</small>
              <b>{whenLabel(when)}</b>
            </span>
            <CaretDown size={16} />
          </Panel>

          {calOpen && (
            <Cal role="dialog" aria-label="Choose travel date">
              <div className="head">
                <Round
                  type="button"
                  aria-label="Previous month"
                  disabled={atCurrentMonth}
                  onClick={() => shiftMonth(-1)}
                >
                  <CaretLeft size={16} />
                </Round>
                <b>{monthTitle}</b>
                <Round
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                >
                  <CaretRight size={16} />
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

        <Cell $area="seats" ref={seatsRef}>
          <Panel
            type="button"
            aria-haspopup="dialog"
            aria-expanded={seatsOpen}
            onClick={() => {
              setActive(null);
              setCalOpen(false);
              setSeatsOpen((v) => !v);
            }}
          >
            <Users size={20} />
            <span className="text">
              <small>Passengers</small>
              <b>{seatsLabel(seats)}</b>
            </span>
            <CaretDown size={16} />
          </Panel>

          {seatsOpen && (
            <Menu role="dialog" aria-label="Passengers">
              <span className="label">
                <b>Passengers</b>
                <small>Seats you need</small>
              </span>
              <span className="stepper">
                <Round
                  type="button"
                  aria-label="Fewer passengers"
                  disabled={seats <= 1}
                  onClick={() => search.setSeats(seats - 1)}
                >
                  <Minus size={16} />
                </Round>
                <output aria-live="polite">{seats}</output>
                <Round
                  type="button"
                  aria-label="More passengers"
                  disabled={seats >= MAX_SEATS}
                  onClick={() => search.setSeats(seats + 1)}
                >
                  <Plus size={16} />
                </Round>
              </span>
            </Menu>
          )}
        </Cell>

        <Actions>
          {showClear && (
            <Round type="button" onClick={clear} aria-label="Clear search">
              <X size={18} />
            </Round>
          )}
          <SearchBtn type="button" onClick={submit} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </SearchBtn>
        </Actions>
      </Dock>
    </Wrap>
  );
}
