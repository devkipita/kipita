"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import {
  Calendar,
  MagnifyingGlass,
  MapPin,
  Minus,
  NavigationArrow,
  Plus,
  Users,
  X,
} from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl } from "@/components/ui/primitives";
import { dayLabel, nairobiToday } from "@/lib/trips/format";
import { POPULAR_ROUTES } from "@/components/landing/data";
import { PlaceModal, pushRecent, type PlaceField } from "./PlaceModal";
import { RouteLine } from "./RouteLine";
import { MonthCalendar } from "./MonthCalendar";

const MAX_SEATS = 8;

export type SearchBarValue = {
  from: string;
  to: string;
  date: string;
  seats: number;
};

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.985); }
  to   { opacity: 1; transform: none; }
`;

const slotIn = keyframes`
  from { opacity: 0; transform: translateX(10px) scale(0.94); }
  to   { opacity: 1; transform: none; }
`;

const Card = styled.form`
  position: relative;
  z-index: 2;
  margin: 35px 0 28px;
  padding: 9px;
  border-radius: 24px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.cardShadow};

  @media (max-width: 640px) {
    margin: 25px 0 20px;
    padding: 8px;
    border-radius: 20px;
  }
`;

const Grid = styled.div<{ $compact?: boolean }>`
  display: ${({ $compact }) => ($compact ? "none" : "grid")};
  grid-template-columns: 1.15fr 1.15fr 0.95fr 0.95fr auto;
  gap: 7px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 760px) {
    display: none;
  }
`;

/* ── Mobile: one tap target that opens a full-screen search ── */

const collapsedBox = `
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 62px;
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: ${nocturne.bg};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
`;

const Collapsed = styled.button<{ $compact?: boolean }>`
  ${({ $compact }) => ($compact ? collapsedBox : "display: none;")}

  @media (max-width: 760px) {
    ${collapsedBox}
  }

  > svg {
    flex: none;
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    padding: 10px;
    border-radius: 999px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .kicker {
    display: block;
    margin-bottom: 2px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    display: block;
    margin-top: 3px;
    font-size: 14px;
    color: ${nocturne.muted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .go {
    flex: none;
    display: inline-flex;
    align-items: center;
    padding: 10px 18px;
    border-radius: 999px;
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
    font-size: 15px;
    font-weight: 700;
  }

  @media (max-width: 400px) {
    gap: 10px;
    padding: 10px 12px;
    > svg {
      padding: 8px;
    }
    .go {
      padding: 9px 14px;
      font-size: 14px;
    }
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const sheetIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
`;

/* Portalled to <body>: the search form is its own stacking context, so a
   fixed child could never rise above the top bar from inside it. Sits under
   Z.drawerOverlay so PlaceModal still opens on top. */
const Sheet = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};
  animation: ${sheetIn} 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SheetTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${nocturne.line};

  h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
`;

const SheetClose = styled.button`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: -8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.cream};
  cursor: pointer;

  &:hover {
    background: ${nocturne.surface2};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const SheetBody = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
`;

const NativeDate = styled.div`
  @media (min-width: 761px) {
    display: none;
  }
`;

const StyledDate = styled.div`
  @media (max-width: 760px) {
    display: none;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  && > * {
    position: relative;
    border: 2px solid transparent;
    border-radius: 16px;
    background: ${nocturne.surface};
    box-shadow: none;
    transition:
      border-color 0.16s ease,
      background 0.16s ease;
  }

  && > *:hover {
    border-color: ${nocturne.line};
  }

  && > *:focus-within,
  && > *:focus-visible {
    border-color: ${nocturne.accent};
    outline: none;
  }
`;

const QuickTitle = styled.p`
  margin: 22px 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const QuickList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QuickRoute = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;

  .pair {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
  }

  .price {
    flex: none;
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.muted};
  }

  &:hover {
    border-color: ${nocturne.line};
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
  }
`;

const SheetFoot = styled.div`
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid ${nocturne.line};
  background: ${nocturne.surface};

  button {
    width: 100%;
  }
`;

const SeatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 68px;
  padding: 9px 14px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: ${nocturne.bg};

  > svg {
    flex: none;
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    padding: 9px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
  }
  output {
    min-width: 22px;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const CTRL_H = 68;

/**
 * One focus treatment for every control: a 2px accent border plus a soft ring.
 * No `outline` on top of it — two rings read as a bug.
 */
const fieldBox = `
  min-height: ${CTRL_H}px;
  background: ${nocturne.bg};
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 9px 14px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
`;

const focusRing = `
  border-color: ${nocturne.accent};
  background: ${nocturne.surface};
  box-shadow: 0 0 0 4px ${nocturne.ring};
  outline: none;
`;

const Field = styled.label`
  ${fieldBox}
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  cursor: text;

  > svg {
    flex: none;
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    padding: 9px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &:focus-within {
    ${focusRing}
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  input {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    appearance: none;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    caret-color: ${nocturne.accent};
  }
  input:focus,
  input:focus-visible {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
`;

/**
 * A styled trigger over a real `<input type="date">`. The input keeps its own
 * label and keyboard behaviour; it is laid over the trigger at zero opacity so
 * the native picker still opens on click and on the keyboard.
 */
const DateField = styled.button`
  ${fieldBox}
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  > svg {
    flex: none;
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    padding: 9px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
    color: ${nocturne.cream};
  }
  b[data-empty="true"] {
    color: ${nocturne.muted3};
    font-weight: 500;
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    opacity: 0;
    cursor: pointer;
    font-size: 16px;
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &:focus-within {
    ${focusRing}
  }
`;

const DayChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    height: 40px;
    padding: 0 16px;
    border: 1.5px solid ${nocturne.line};
    border-radius: 999px;
    background: ${nocturne.bg};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  button:hover {
    border-color: ${nocturne.accent};
  }
  button[data-on="true"] {
    background: ${nocturne.accent};
    border-color: ${nocturne.accent};
    color: #fff;
  }
`;

const PickRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${nocturne.bg};
  border: 1px solid ${nocturne.line};
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  label {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
  }
  input {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 15px;
  }
`;

const Cell = styled.div`
  position: relative;
  min-width: 0;
`;

const Trigger = styled.button`
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

  > svg {
    flex: none;
    box-sizing: content-box;
    width: 22px;
    height: 22px;
    padding: 9px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.accent};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    display: block;
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
  }
  &:hover {
    border-color: ${nocturne.line};
    background: ${nocturne.surface};
  }
  &[aria-expanded="true"],
  &:focus-visible {
    ${focusRing}
  }
  svg:last-child {
    transition: transform 0.2s ease;
  }
  &[aria-expanded="true"] svg:last-child {
    transform: rotate(180deg);
  }
`;

const Pop = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  min-width: 268px;
  padding: 16px;
  border-radius: 18px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: ${nocturne.panelShadow};
  color: ${nocturne.cream};
  animation: ${popIn} 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: top right;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  @media (max-width: 640px) {
    left: 0;
    right: 0;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .label b {
    display: block;
    font-size: 16px;
    font-weight: 700;
  }
  .label span {
    font-size: 13px;
    color: ${nocturne.muted2};
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  output {
    min-width: 24px;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`;

const Round = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition: background 0.16s ease;

  &:hover:not(:disabled) {
    background: ${nocturne.surface2};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;

  @media (max-width: 1100px) {
    grid-column: 1 / -1;
  }
`;

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: none;
  min-height: ${CTRL_H}px;
  padding: 0 18px;
  overflow: hidden;
  white-space: nowrap;
  border: 2px solid ${nocturne.line};
  border-radius: 16px;
  background: transparent;
  color: ${nocturne.muted};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  animation: ${slotIn} 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    border-color: ${nocturne.accent};
    color: ${nocturne.cream};
  }
  &:focus-visible {
    ${focusRing}
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Submit = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: ${CTRL_H}px;
  padding: 0 30px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    filter 0.2s ease,
    box-shadow 0.18s ease;

  &:hover {
    filter: brightness(0.94);
  }
  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

function seatsLabel(n: number) {
  return `${n} ${n === 1 ? "passenger" : "passengers"}`;
}

function dateLabel(value: string) {
  if (!value) return "Today";
  return dayLabel(value);
}

export function FindRideSearchBar({
  value,
  busy,
  onSubmit,
  onClear,
  /** "compact" keeps the single-input form at every width (landing hero). */
  variant = "full",
  placeholder = "Where are you going?",
}: {
  value: SearchBarValue;
  busy?: boolean;
  onSubmit: (next: SearchBarValue) => void;
  onClear: () => void;
  variant?: "full" | "compact";
  placeholder?: string;
}) {
  const compact = variant === "compact";
  const [form, setForm] = useState<SearchBarValue>(value);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [placeField, setPlaceField] = useState<PlaceField | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const seatsRef = useRef<HTMLDivElement>(null);
  const seatsBtnRef = useRef<HTMLButtonElement>(null);
  const seatsPopId = useId();

  useEffect(() => setForm(value), [value]);

  useEffect(() => {
    if (!seatsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!seatsRef.current?.contains(e.target as Node)) setSeatsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSeatsOpen(false);
      seatsBtnRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [seatsOpen]);

  const dirty =
    Boolean(form.from.trim() || form.to.trim() || form.date) || form.seats > 1;

  function patch(next: Partial<SearchBarValue>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const collapsedSummary = [
    form.from.trim() ? `From ${form.from.trim()}` : "Anywhere",
    dateLabel(form.date),
    `${form.seats} ${form.seats === 1 ? "seat" : "seats"}`,
  ].join(" · ");

  // The sheet is a page, not a dialog-in-a-page: lock the body behind it.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  function runSearch() {
    setSeatsOpen(false);
    setSheetOpen(false);
    onSubmit(form);
  }

  return (
    <Card
      onSubmit={(e) => {
        e.preventDefault();
        setSeatsOpen(false);
        onSubmit(form);
      }}
      role="search"
      aria-label="Find a ride"
    >
      <Collapsed
        type="button"
        $compact={compact}
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
      >
        <MagnifyingGlass size={22} aria-hidden />
        <span className="text">
          <b>{form.to.trim() || placeholder}</b>
          <small>{collapsedSummary}</small>
        </span>
        <span className="go" aria-hidden>
          Search
        </span>
      </Collapsed>

      <Grid $compact={compact}>
        <Field data-tone="origin">
          <NavigationArrow size={20} aria-hidden />
          <span className="body">
            <span className="lbl">Leaving from</span>
            <input
              value={form.from}
              readOnly
              onClick={() => setPlaceField("from")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPlaceField("from");
                }
              }}
              placeholder="Where from?"
              aria-label="Leaving from"
              autoComplete="off"
            />
          </span>
        </Field>

        <Field>
          <MapPin size={20} aria-hidden />
          <span className="body">
            <span className="lbl">Going to</span>
            <input
              value={form.to}
              readOnly
              onClick={() => setPlaceField("to")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPlaceField("to");
                }
              }}
              placeholder="Where are you going?"
              aria-label="Going to"
              autoComplete="off"
            />
          </span>
        </Field>

        <DateField
          type="button"
          onClick={() => {
            setDraftDate(form.date);
            setDateOpen(true);
          }}
          aria-haspopup="dialog"
          aria-label="Choose travel date"
        >
          <Calendar size={20} aria-hidden />
          <span className="text">
            <span className="lbl">When</span>
            <b>{dateLabel(form.date)}</b>
          </span>
        </DateField>

        <Cell ref={seatsRef}>
          <Trigger
            ref={seatsBtnRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={seatsOpen}
            aria-controls={seatsOpen ? seatsPopId : undefined}
            onClick={() => setSeatsOpen((v) => !v)}
          >
            <Users size={20} aria-hidden />
            <span className="text">
              <span className="lbl">Passengers</span>
              <b>{seatsLabel(form.seats)}</b>
            </span>
          </Trigger>

          {seatsOpen && (
            <Pop id={seatsPopId} role="dialog" aria-label="Choose passengers">
              <div className="row">
                <span className="label">
                  <b>Passengers</b>
                  <span>Seats you need</span>
                </span>
                <span className="stepper">
                  <Round
                    type="button"
                    aria-label="One fewer passenger"
                    disabled={form.seats <= 1}
                    onClick={() => patch({ seats: Math.max(1, form.seats - 1) })}
                  >
                    <Minus size={16} aria-hidden />
                  </Round>
                  <output aria-live="polite">{form.seats}</output>
                  <Round
                    type="button"
                    aria-label="One more passenger"
                    disabled={form.seats >= MAX_SEATS}
                    onClick={() =>
                      patch({ seats: Math.min(MAX_SEATS, form.seats + 1) })
                    }
                  >
                    <Plus size={16} aria-hidden />
                  </Round>
                </span>
              </div>
            </Pop>
          )}
        </Cell>

        <Actions>
          {dirty && (
            <ClearBtn
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setForm({ from: "", to: "", date: "", seats: 1 });
                setSeatsOpen(false);
                onClear();
              }}
            >
              <X size={18} aria-hidden />
              <span className="word">Clear</span>
            </ClearBtn>
          )}
          <Submit type="submit" disabled={busy}>
            <MagnifyingGlass size={20} aria-hidden />
            {busy ? "Searching…" : "Search"}
          </Submit>
        </Actions>
      </Grid>

      {sheetOpen &&
        mounted &&
        createPortal(
        <Sheet role="dialog" aria-modal="true" aria-label="Search for a ride">
          <SheetTop>
            <SheetClose
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close search"
            >
              <X size={22} aria-hidden />
            </SheetClose>
            <h2>Find a ride</h2>
          </SheetTop>

          <SheetBody>
            <FieldGroup>
            <Field data-tone="origin">
              <NavigationArrow size={20} aria-hidden />
              <span className="body">
                <span className="lbl">Leaving from</span>
                <input
                  value={form.from}
                  readOnly
                  onClick={() => setPlaceField("from")}
                  placeholder="Where from?"
                  aria-label="Leaving from"
                />
              </span>
            </Field>

            <Field>
              <MapPin size={20} aria-hidden />
              <span className="body">
                <span className="lbl">Going to</span>
                <input
                  value={form.to}
                  readOnly
                  onClick={() => setPlaceField("to")}
                  placeholder="Where are you going?"
                  aria-label="Going to"
                />
              </span>
            </Field>

            <DateField
              type="button"
              onClick={() => {
                setDraftDate(form.date);
                setDateOpen(true);
              }}
              aria-haspopup="dialog"
              aria-label="Choose travel date"
            >
              <Calendar size={20} aria-hidden />
              <span className="text">
                <span className="lbl">When</span>
                <b>{dateLabel(form.date)}</b>
              </span>
            </DateField>

            <SeatsRow>
              <Users size={20} aria-hidden />
              <span className="text">
                <span className="lbl">Passengers</span>
                <b>{seatsLabel(form.seats)}</b>
              </span>
              <span className="stepper">
                <Round
                  type="button"
                  aria-label="One fewer passenger"
                  disabled={form.seats <= 1}
                  onClick={() => patch({ seats: Math.max(1, form.seats - 1) })}
                >
                  <Minus size={16} aria-hidden />
                </Round>
                <output aria-live="polite">{form.seats}</output>
                <Round
                  type="button"
                  aria-label="One more passenger"
                  disabled={form.seats >= MAX_SEATS}
                  onClick={() =>
                    patch({ seats: Math.min(MAX_SEATS, form.seats + 1) })
                  }
                >
                  <Plus size={16} aria-hidden />
                </Round>
              </span>
            </SeatsRow>
            </FieldGroup>

            {dirty && (
              <ClearBtn
                type="button"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  setForm({ from: "", to: "", date: "", seats: 1 });
                  onClear();
                }}
              >
                <X size={18} aria-hidden />
                <span className="word">Clear</span>
              </ClearBtn>
            )}

            <QuickTitle>Popular routes</QuickTitle>
            <QuickList>
              {POPULAR_ROUTES.map((r) => (
                <QuickRoute
                  key={`${r.from}-${r.to}`}
                  type="button"
                  onClick={() => patch({ from: r.from, to: r.to })}
                >
                  <span className="pair">
                    {r.from}
                    <RouteLine />
                    {r.to}
                  </span>
                  <span className="price">{r.price}</span>
                </QuickRoute>
              ))}
            </QuickList>
          </SheetBody>

          <SheetFoot>
            <Submit type="button" disabled={busy} onClick={runSearch}>
              <MagnifyingGlass size={20} aria-hidden />
              {busy ? "Searching…" : "Search rides"}
            </Submit>
          </SheetFoot>
        </Sheet>,
        document.body,
      )}

      <PlaceModal
        field={placeField}
        from={form.from}
        to={form.to}
        originCoords={null}
        onFieldChange={setPlaceField}
        onPickTown={(field, town) => {
          patch({ [field]: town.name });
          setPlaceField(field === "from" ? "to" : null);
        }}
        onPickRoute={(fromName, toName) => {
          patch({ from: fromName, to: toName });
          pushRecent(toName);
          setPlaceField(null);
        }}
        onSearch={() => {
          setPlaceField(null);
          onSubmit(form);
        }}
        searchLabel="Search"
        onClose={() => setPlaceField(null)}
      />

      <Drawer
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        size="md"
        title="When are you travelling?"
        description="Pick a day, or leave it on today."
        footer={
          <DrawerFooter>
            <ButtonEl type="button" $variant="ghost" onClick={() => setDateOpen(false)}>
              Cancel
            </ButtonEl>
            <ButtonEl
              type="button"
              $variant="primary"
              onClick={() => {
                patch({ date: draftDate });
                setDateOpen(false);
              }}
            >
              Apply
            </ButtonEl>
          </DrawerFooter>
        }
      >
        <DrawerBody>
          <DayChips role="group" aria-label="Quick dates">
            {Array.from({ length: 14 }, (_, i) => nairobiToday(i)).map((iso) => (
              <button
                key={iso}
                type="button"
                data-on={draftDate === iso || (!draftDate && iso === nairobiToday())}
                onClick={() => setDraftDate(iso)}
              >
                {dayLabel(iso)}
              </button>
            ))}
          </DayChips>
          <NativeDate>
            <PickRow>
              <Calendar size={18} aria-hidden />
              <label htmlFor="find-ride-date">Or choose another date</label>
              <input
                id="find-ride-date"
                type="date"
                min={nairobiToday()}
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </PickRow>
          </NativeDate>

          <StyledDate>
            <MonthCalendar
              value={draftDate || nairobiToday()}
              min={nairobiToday()}
              onChange={setDraftDate}
            />
          </StyledDate>
        </DrawerBody>
      </Drawer>
    </Card>
  );
}
