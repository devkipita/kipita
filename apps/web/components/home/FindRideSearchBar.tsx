"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { POPULAR_ROUTES } from "@kipita/shared";
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
import { dur, ease, nocturne } from "@/lib/nocturne";
import { tween } from "@/lib/motion";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { Popover } from "@/components/ui/Popover";
import { ButtonEl } from "@/components/ui/primitives";
import { Shimmer } from "@/components/ui/Shimmer";
import { Collapse } from "@/components/anim/Collapse";
import { useIsoLayoutEffect } from "@/components/anim/useIsoLayoutEffect";
import { lockScroll, unlockScroll } from "@/lib/ui/useScrollLock";
import { dayLabel, nairobiToday } from "@/lib/trips/format";
import { PlaceModal, pushRecent, type PlaceField } from "./PlaceModal";
import { RouteLine } from "./RouteLine";
import { MonthCalendar } from "./MonthCalendar";

const MAX_SEATS = 8;
const PILL_RADIUS = 16;
const PHONE = "(max-width: 760px)";
const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type SearchBarValue = {
  from: string;
  to: string;
  date: string;
  seats: number;
};

type SheetState = "closed" | "open" | "closing";

const hunt = keyframes`
  0%   { transform: translateX(0) rotate(0deg) scale(1); }
  28%  { transform: translateX(-3px) rotate(-14deg) scale(1.06); }
  62%  { transform: translateX(3px) rotate(11deg) scale(1.06); }
  100% { transform: translateX(0) rotate(0deg) scale(1.12); }
`;

const Card = styled.form`
  position: relative;
  z-index: 2;
  margin: 35px 0 28px;
  padding: 8px;
  border-radius: 24px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};

  @media (max-width: 640px) {
    margin: 25px 0 20px;
    border-radius: 20px;
  }
`;

const Grid = styled.div<{ $compact?: boolean }>`
  display: ${({ $compact }) => ($compact ? "none" : "flex")};
  align-items: stretch;
  flex-wrap: wrap;

  @media (max-width: 1100px) {
    row-gap: 8px;

    > * {
      flex: 1 1 100%;
    }
  }

  @media (max-width: 760px) {
    display: none;
  }
`;

const Fields = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1.15fr 1.15fr 0.95fr 0.95fr;
  margin-right: 8px;

  > * {
    position: relative;
  }
  > * + *::before {
    content: "";
    position: absolute;
    left: 0;
    top: 15px;
    bottom: 15px;
    width: 1px;
    background: ${nocturne.line};
    transition: opacity ${dur.press} ${ease.standard};
  }
  > *:hover::before,
  > *:focus-visible::before,
  > *:hover + *::before,
  > *:focus-visible + *::before {
    opacity: 0;
  }

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
    margin-right: 0;

    > *:nth-child(3)::before {
      display: none;
    }
  }
`;

const CTRL_H = 68;

const fieldGlyph = `
  flex: none;
  width: 21px;
  height: 21px;
  color: ${nocturne.accent};
`;

const collapsedBox = `
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 62px;
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: ${PILL_RADIUS}px;
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
    ${fieldGlyph}
    width: 28px;
    height: 28px;
    transition: transform ${dur.enter} ${ease.standard};
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  b {
    display: block;
    font-size: 20px;
    line-height: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b[data-empty="true"] {
    color: ${nocturne.muted2};
    font-weight: 600;
  }
  .go {
    flex: none;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 999px;
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
    font-size: 15px;
    font-weight: 700;
    transition:
      background ${dur.state} ${ease.standard},
      color ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};
  }

  @media (hover: hover) {
    &:hover > svg {
      animation: ${hunt} ${dur.max} ${ease.standard} both;
    }
    &:hover .go {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
    }
  }
  &:active .go {
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
    transform: scale(0.96);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover > svg {
      animation: none;
    }
    &:active .go {
      transform: none;
    }
  }

  @media (max-width: 400px) {
    gap: 10px;
    padding: 10px 12px;

    .go {
      padding: 0 14px;
      font-size: 14px;
    }
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const Sheet = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};
  will-change: clip-path;
`;

const Face = styled.div`
  position: absolute;
  z-index: 2;
  pointer-events: none;
`;

const SheetTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
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
  width: 48px;
  height: 48px;
  margin-left: -8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.cream};
  cursor: pointer;
  transition: background ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const SheetBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  padding: 16px;
`;

const FieldGroup = styled.div`
  border-radius: 18px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};

  && > * {
    position: relative;
    border-radius: 18px;
  }

  && > * + *::before {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    top: 0;
    height: 1px;
    background: ${nocturne.line};
    transition: opacity ${dur.press} ${ease.standard};
  }
  && > *:hover::before,
  && > *:focus-visible::before,
  && > *:hover + *::before,
  && > *:focus-visible + *::before {
    opacity: 0;
  }
`;

const label = `
  display: block;
  margin-bottom: 3px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const FieldButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: ${CTRL_H}px;
  padding: 9px 16px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  > svg {
    ${fieldGlyph}
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    ${label}
  }
  b {
    display: block;
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b[data-empty="true"] {
    color: ${nocturne.muted2};
    font-weight: 600;
  }
  b[data-fly] {
    position: relative;
    z-index: 3;
    transform-origin: 0 0;
  }

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &[aria-expanded="true"],
  &:focus-visible {
    background: ${nocturne.surface2};
    box-shadow: inset 0 0 0 2px ${nocturne.accent};
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
  gap: 6px;
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition:
    border-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  svg {
    flex: none;
  }
  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.outline};
    }
  }
  &:active {
    transform: scale(0.98);
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
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
  gap: 12px;
  min-height: ${CTRL_H}px;
  padding: 9px 16px;

  > svg {
    ${fieldGlyph}
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .lbl {
    ${label}
  }
  b {
    display: block;
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
`;

const Stepper = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;

  output {
    min-width: 24px;
    text-align: center;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Round = styled.button`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid ${nocturne.outline};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.surface2};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.94);
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
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const SeatsPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-width: 268px;
  padding: 10px 10px 10px 12px;

  .label b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .label span {
    font-size: 13px;
    color: ${nocturne.muted2};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: stretch;

  @media (max-width: 1100px) {
    justify-content: flex-end;
    padding: 4px 8px 4px 0;
  }
`;

const ClearSlot = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-columns: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-columns
    ${({ $open }) => ($open ? `${dur.enter} ${ease.enter}` : `${dur.exit} ${ease.exit}`)};

  > div {
    display: flex;
    min-width: 0;
    overflow: hidden;
    padding-right: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ClearBtn = styled.button<{ $shown: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: none;
  min-height: ${CTRL_H}px;
  padding: 0 18px;
  white-space: nowrap;
  border: 1px solid ${nocturne.outline};
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transform: scale(${({ $shown }) => ($shown ? 1 : 0.9)});
  transition:
    opacity ${({ $shown }) => ($shown ? `${dur.enter} ${ease.enter}` : `${dur.exit} ${ease.exit}`)},
    transform ${({ $shown }) => ($shown ? `${dur.enter} ${ease.enter}` : `${dur.exit} ${ease.exit}`)},
    background ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${nocturne.accent};
  }
  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
  @media (max-width: 1100px) {
    min-height: 58px;
  }
`;

const SheetClear = styled.div`
  display: flex;
  padding-top: 10px;

  button {
    min-height: 48px;
  }
`;

const Submit = styled.button`
  position: relative;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: ${CTRL_H}px;
  padding: 0 30px;
  border: 2px solid ${nocturne.ctaBg};
  border-radius: 16px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color ${dur.enter} ${ease.standard},
    border-radius ${dur.enter} ${ease.enter},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard},
    box-shadow ${dur.enter} ${ease.enter};

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: ${nocturne.green};
    clip-path: circle(0% at 50% 50%);
    transition:
      clip-path ${dur.max} ${ease.standard},
      border-radius ${dur.enter} ${ease.enter};
    pointer-events: none;
  }

  svg,
  .label {
    position: relative;
    z-index: 2;
  }

  @media (hover: hover) {
    &:hover:not(:disabled) {
      border-color: ${nocturne.green};
      border-radius: 999px;
      color: ${nocturne.onGreen};
      box-shadow: 0 14px 30px -14px color-mix(in oklab, ${nocturne.green} 72%, transparent);
    }
    &:hover:not(:disabled)::before {
      clip-path: circle(78% at 50% 50%);
      border-radius: 999px;
    }
    &:hover:not(:disabled) svg {
      animation: ${hunt} ${dur.max} ${ease.standard} both;
    }
  }

  &:active:not(:disabled) {
    border-color: ${nocturne.greenDeep};
    border-radius: 999px;
    color: ${nocturne.onGreen};
    transform: scale(0.97);
    box-shadow: none;
  }
  &:active:not(:disabled)::before {
    background: ${nocturne.greenDeep};
    clip-path: circle(78% at 50% 50%);
    border-radius: 999px;
    transition:
      clip-path ${dur.press} ${ease.exit},
      border-radius ${dur.press} ${ease.exit};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }

  @media (max-width: 1100px) {
    flex: 0 0 auto;
    min-width: 212px;
    min-height: 58px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition:
      border-color ${dur.state} ${ease.standard},
      color ${dur.state} ${ease.standard};

    &::before {
      transition: none;
    }
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
      border-radius: 16px;
    }
    &:hover:not(:disabled)::before {
      border-radius: 14px;
    }
    &:hover:not(:disabled) svg {
      animation: none;
    }
  }
`;

const DayChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid ${nocturne.outline};
    border-radius: 999px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background ${dur.state} ${ease.standard},
      border-color ${dur.state} ${ease.standard},
      color ${dur.state} ${ease.standard};
  }
  @media (hover: hover) {
    button:hover {
      border-color: ${nocturne.accent};
    }
  }
  button:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  button[aria-pressed="true"] {
    background: ${nocturne.green};
    border-color: ${nocturne.green};
    color: ${nocturne.onGreen};
  }
`;

const PickRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.outline};
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
    font-size: 16px;
  }
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

const ApplyDate = styled(ButtonEl)`
  flex: 1;
  justify-content: center;
`;

function seatsLabel(n: number) {
  return `${n} ${n === 1 ? "passenger" : "passengers"}`;
}

function dateLabel(value: string) {
  return value ? dayLabel(value) : "Any day";
}

function clipFor(r: DOMRect, box: DOMRect) {
  return `inset(${r.top - box.top}px ${box.right - r.right}px ${box.bottom - r.bottom}px ${r.left - box.left}px round ${PILL_RADIUS}px)`;
}

const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";

function SeatStepper({
  seats,
  onChange,
}: {
  seats: number;
  onChange: (n: number) => void;
}) {
  return (
    <Stepper>
      <Round
        type="button"
        aria-label="One fewer passenger"
        disabled={seats <= 1}
        onClick={() => onChange(Math.max(1, seats - 1))}
      >
        <Minus size={16} aria-hidden />
      </Round>
      <output aria-live="polite">{seats}</output>
      <Round
        type="button"
        aria-label="One more passenger"
        disabled={seats >= MAX_SEATS}
        onClick={() => onChange(Math.min(MAX_SEATS, seats + 1))}
      >
        <Plus size={16} aria-hidden />
      </Round>
    </Stepper>
  );
}

function PlaceButton({
  field,
  value,
  fly,
  buttonRef,
  textRef,
  onOpen,
}: {
  field: PlaceField;
  value: string;
  fly?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  textRef?: React.Ref<HTMLElement>;
  onOpen: (field: PlaceField, el: HTMLButtonElement) => void;
}) {
  const from = field === "from";
  const name = from ? "Leaving from" : "Going to";
  const empty = !value.trim();
  return (
    <FieldButton
      ref={buttonRef}
      type="button"
      aria-haspopup="dialog"
      aria-label={`${name}: ${empty ? "not set" : value}`}
      onClick={(e) => onOpen(field, e.currentTarget)}
    >
      {from ? <NavigationArrow size={20} aria-hidden /> : <MapPin size={20} aria-hidden />}
      <span className="body">
        <span className="lbl">{name}</span>
        <b ref={textRef} data-empty={empty} data-fly={fly ? "" : undefined}>
          {empty ? (from ? "Where from?" : "Where to?") : value}
        </b>
      </span>
    </FieldButton>
  );
}

export function FindRideSearchBar({
  value,
  busy,
  onSubmit,
  onClear,
  openSignal = 0,
  variant = "full",
  placeholder = "Where to?",
}: {
  value: SearchBarValue;
  busy?: boolean;
  onSubmit: (next: SearchBarValue) => void;
  onClear: () => void;
  openSignal?: number;
  variant?: "full" | "compact";
  placeholder?: string;
}) {
  const compact = variant === "compact";
  const reduce = useReducedMotion();
  const [form, setForm] = useState<SearchBarValue>(value);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [placeField, setPlaceField] = useState<PlaceField | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [sheet, setSheet] = useState<SheetState>("closed");
  const [mounted, setMounted] = useState(false);

  const seatsBtnRef = useRef<HTMLButtonElement>(null);
  const toBtnRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const pillTextRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const runs = useRef<AnimationPlaybackControls[]>([]);
  const nested = useRef(false);
  nested.current = placeField !== null || dateOpen;

  useEffect(() => setMounted(true), []);
  useEffect(() => setForm(value), [value]);

  const dirty = Boolean(form.from.trim() || form.to.trim() || form.date) || form.seats > 1;

  function patch(next: Partial<SearchBarValue>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  const stopRuns = () => {
    runs.current.forEach((r) => r.stop());
    runs.current = [];
  };

  const openSheet = useCallback(() => setSheet("open"), []);
  const closeSheet = useCallback(() => {
    setSheet((s) => (s === "open" ? "closing" : s));
  }, []);

  const locked = sheet !== "closed";
  useEffect(() => {
    if (!locked) return;
    lockScroll();
    return () => unlockScroll();
  }, [locked]);

  useEffect(() => {
    if (sheet !== "open") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !nested.current) closeSheet();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  useIsoLayoutEffect(() => {
    if (sheet !== "open") return;
    const root = sheetRef.current;
    const face = faceRef.current;
    const text = flyRef.current;
    const pill = pillRef.current?.getBoundingClientRect();
    const pillText = pillTextRef.current?.getBoundingClientRect();
    if (!root || !face || !text) return;
    stopRuns();
    closeRef.current?.focus({ preventScroll: true });

    if (reduce || !pill || !pillText || pill.width === 0) {
      face.style.opacity = "0";
      runs.current = [animate(root, { opacity: [0, 1] }, tween.state)];
      return;
    }

    const box = root.getBoundingClientRect();
    Object.assign(face.style, {
      left: `${pill.left - box.left}px`,
      top: `${pill.top - box.top}px`,
      width: `${pill.width}px`,
      height: `${pill.height}px`,
      opacity: "1",
    });
    const end = text.getBoundingClientRect();
    const from = {
      x: pillText.left - end.left,
      y: pillText.top - end.top,
      scale: pillText.height / end.height,
    };
    root.style.clipPath = clipFor(pill, box);
    text.style.transform = `translate(${from.x}px, ${from.y}px) scale(${from.scale})`;

    runs.current = [
      animate(root, { clipPath: [clipFor(pill, box), FULL_CLIP] }, tween.enter),
      animate(face, { opacity: [1, 0] }, tween.exit),
      animate(text, { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1] }, tween.enter),
    ];
  }, [sheet]);

  useIsoLayoutEffect(() => {
    if (sheet !== "closing") return;
    const root = sheetRef.current;
    const face = faceRef.current;
    const text = flyRef.current;
    const finish = () => {
      setSheet((s) => (s === "closing" ? "closed" : s));
      pillRef.current?.focus({ preventScroll: true });
    };
    if (!root || !face || !text) return finish();
    stopRuns();

    const pill = pillRef.current?.getBoundingClientRect();
    const pillText = pillTextRef.current?.getBoundingClientRect();
    if (reduce || !pill || !pillText || pill.width === 0) {
      const fade = animate(root, { opacity: 0 }, tween.exit);
      runs.current = [fade];
      void fade.then(finish);
      return;
    }

    const box = root.getBoundingClientRect();
    Object.assign(face.style, {
      left: `${pill.left - box.left}px`,
      top: `${pill.top - box.top}px`,
      width: `${pill.width}px`,
      height: `${pill.height}px`,
    });
    const prior = text.style.transform;
    text.style.transform = "none";
    const end = text.getBoundingClientRect();
    text.style.transform = prior;
    const target = {
      x: pillText.left - end.left,
      y: pillText.top - end.top,
      scale: pillText.height / end.height,
    };

    const all = [
      animate(root, { clipPath: clipFor(pill, box) }, tween.exit),
      animate(face, { opacity: 1 }, tween.exit),
      animate(text, target, tween.exit),
    ];
    runs.current = all;
    void Promise.all(all).then(finish);
  }, [sheet]);

  useEffect(() => () => stopRuns(), []);

  const lastSignal = useRef(openSignal);
  useEffect(() => {
    if (openSignal === lastSignal.current) return;
    lastSignal.current = openSignal;
    if (window.matchMedia(PHONE).matches) {
      openSheet();
      return;
    }
    toBtnRef.current?.focus({ preventScroll: true });
    toBtnRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    setPlaceField("to");
  }, [openSignal, openSheet]);

  function openPlace(field: PlaceField, el: HTMLButtonElement) {
    el.focus({ preventScroll: true });
    setPlaceField(field);
  }

  function openDate(el: HTMLButtonElement) {
    el.focus({ preventScroll: true });
    setDraftDate(form.date);
    setDateOpen(true);
  }

  function clearAll() {
    setForm({ from: "", to: "", date: "", seats: 1 });
    setSeatsOpen(false);
    onClear();
  }

  function runSearch(next: SearchBarValue = form) {
    setSeatsOpen(false);
    closeSheet();
    onSubmit(next);
  }

  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (el) => el.offsetParent !== null,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const pillEmpty = !form.to.trim();
  const sheetShown = sheet !== "closed";

  return (
    <Card
      onSubmit={(e) => {
        e.preventDefault();
        runSearch();
      }}
      role="search"
      aria-label="Find a ride"
    >
      <Collapsed
        ref={pillRef}
        type="button"
        $compact={compact}
        onClick={openSheet}
        aria-haspopup="dialog"
        aria-expanded={sheetShown}
        aria-label={pillEmpty ? "Search rides" : `Search rides to ${form.to}`}
      >
        <MagnifyingGlass size={28} aria-hidden />
        <span className="text">
          <b ref={pillTextRef} data-empty={pillEmpty}>
            {pillEmpty ? placeholder : form.to}
          </b>
        </span>
        <span className="go" aria-hidden>
          Search
        </span>
      </Collapsed>

      <Grid $compact={compact}>
        <Fields>
          <PlaceButton field="from" value={form.from} onOpen={openPlace} />
          <PlaceButton field="to" value={form.to} buttonRef={toBtnRef} onOpen={openPlace} />
          <FieldButton
            type="button"
            onClick={(e) => openDate(e.currentTarget)}
            aria-haspopup="dialog"
            aria-label={`When: ${dateLabel(form.date)}`}
          >
            <Calendar size={20} aria-hidden />
            <span className="body">
              <span className="lbl">When</span>
              <b>{dateLabel(form.date)}</b>
            </span>
          </FieldButton>
          <FieldButton
            ref={seatsBtnRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={seatsOpen}
            aria-label={`Passengers: ${seatsLabel(form.seats)}`}
            onClick={() => setSeatsOpen((v) => !v)}
          >
            <Users size={20} aria-hidden />
            <span className="body">
              <span className="lbl">Passengers</span>
              <b>{seatsLabel(form.seats)}</b>
            </span>
          </FieldButton>
        </Fields>

        <Actions>
          <ClearSlot $open={dirty} inert={!dirty} aria-hidden={!dirty}>
            <div>
              <ClearBtn type="button" $shown={dirty} onClick={clearAll}>
                <X size={18} aria-hidden />
                Clear search
              </ClearBtn>
            </div>
          </ClearSlot>
          <Submit type="submit" disabled={busy}>
            <MagnifyingGlass size={20} aria-hidden />
            <span className="label">{busy ? "Searching…" : "Search"}</span>
          </Submit>
        </Actions>
      </Grid>

      <Popover
        open={seatsOpen}
        onClose={() => setSeatsOpen(false)}
        anchorRef={seatsBtnRef}
        label="Passengers"
        role="dialog"
        align="end"
      >
        <SeatsPanel>
          <span className="label">
            <b>Passengers</b>
            <span>Seats you need</span>
          </span>
          <SeatStepper seats={form.seats} onChange={(seats) => patch({ seats })} />
        </SeatsPanel>
      </Popover>

      {sheetShown &&
        mounted &&
        createPortal(
          <Sheet
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search for a ride"
            onKeyDown={trapTab}
          >
            <Face ref={faceRef} aria-hidden>
              <Collapsed as="div" $compact={compact}>
                <MagnifyingGlass size={28} aria-hidden />
                <span className="text" />
                <span className="go">Search</span>
              </Collapsed>
            </Face>

            <SheetTop>
              <SheetClose ref={closeRef} type="button" onClick={closeSheet} aria-label="Close search">
                <X size={22} aria-hidden />
              </SheetClose>
              <h2>Find a ride</h2>
            </SheetTop>

            <SheetBody>
              <FieldGroup>
                <PlaceButton field="from" value={form.from} onOpen={openPlace} />
                <PlaceButton field="to" value={form.to} fly textRef={flyRef} onOpen={openPlace} />
                <FieldButton
                  type="button"
                  onClick={(e) => openDate(e.currentTarget)}
                  aria-haspopup="dialog"
                  aria-label={`When: ${dateLabel(form.date)}`}
                >
                  <Calendar size={20} aria-hidden />
                  <span className="body">
                    <span className="lbl">When</span>
                    <b>{dateLabel(form.date)}</b>
                  </span>
                </FieldButton>
                <SeatsRow>
                  <Users size={20} aria-hidden />
                  <span className="body">
                    <span className="lbl">Passengers</span>
                    <b>{seatsLabel(form.seats)}</b>
                  </span>
                  <SeatStepper seats={form.seats} onChange={(seats) => patch({ seats })} />
                </SeatsRow>
              </FieldGroup>

              <Collapse open={dirty}>
                <SheetClear>
                  <ClearBtn type="button" $shown={dirty} onClick={clearAll}>
                    <X size={18} aria-hidden />
                    Clear search
                  </ClearBtn>
                </SheetClear>
              </Collapse>

              <QuickTitle>Popular routes</QuickTitle>
              <QuickList>
                {POPULAR_ROUTES.slice(0, 5).map((r) => (
                  <QuickRoute
                    key={`${r.from}-${r.to}`}
                    type="button"
                    aria-label={`${r.from} to ${r.to}`}
                    onClick={() => patch({ from: r.from, to: r.to })}
                  >
                    {r.from}
                    <RouteLine />
                    {r.to}
                  </QuickRoute>
                ))}
              </QuickList>
            </SheetBody>

            <SheetFoot>
              <Submit type="button" disabled={busy} onClick={() => runSearch()}>
                <MagnifyingGlass size={20} aria-hidden />
                <span className="label">{busy ? "Searching…" : "Search rides"}</span>
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
          setPlaceField(field === "from" && !form.to.trim() ? "to" : null);
        }}
        onPickRoute={(fromName, toName) => {
          patch({ from: fromName, to: toName });
          pushRecent(toName);
          setPlaceField(null);
        }}
        onSearch={() => {
          setPlaceField(null);
          runSearch();
        }}
        searchLabel="Search"
        onClose={() => setPlaceField(null)}
      />

      <Drawer
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        size="md"
        title="When are you travelling?"
        footer={
          <DrawerFooter>
            <ApplyDate
              type="button"
              $variant="primary"
              onClick={() => {
                patch({ date: draftDate });
                setDateOpen(false);
              }}
            >
              {draftDate ? `Travel on ${dayLabel(draftDate)}` : "Show any day"}
            </ApplyDate>
          </DrawerFooter>
        }
      >
        <DrawerBody>
          <DayChips role="group" aria-label="Quick dates">
            <button type="button" aria-pressed={!draftDate} onClick={() => setDraftDate("")}>
              Any day
            </button>
            {Array.from({ length: 14 }, (_, i) => nairobiToday(i)).map((iso) => (
              <button
                key={iso}
                type="button"
                aria-pressed={draftDate === iso}
                onClick={() => setDraftDate(iso)}
              >
                {dayLabel(iso)}
              </button>
            ))}
          </DayChips>
          <NativeDate>
            <PickRow>
              <Calendar size={18} aria-hidden />
              <label htmlFor="find-ride-date">Another date</label>
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
              value={draftDate}
              min={nairobiToday()}
              onChange={setDraftDate}
            />
          </StyledDate>
        </DrawerBody>
      </Drawer>
    </Card>
  );
}

const SkPill = styled.div`
  display: none;

  @media (max-width: 760px) {
    display: block;
  }
`;

const SkField = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: ${CTRL_H}px;
  padding: 9px 16px;

  .body {
    display: grid;
    gap: 7px;
    flex: 1;
    min-width: 0;
  }
`;

const SkSubmit = styled.div`
  flex: 1;
  min-width: 150px;

  > div {
    height: ${CTRL_H}px;
  }

  @media (max-width: 1100px) {
    flex: 0 0 auto;
    min-width: 212px;

    > div {
      height: 58px;
    }
  }
`;

function SkeletonField() {
  return (
    <SkField>
      <Shimmer $w="21px" $h="21px" $r="6px" />
      <span className="body">
        <Shimmer $w="74px" $h="10px" />
        <Shimmer $w="70%" $h="14px" />
      </span>
    </SkField>
  );
}

export function SearchBarSkeleton() {
  return (
    <Card as="div" aria-hidden>
      <SkPill>
        <Shimmer $h="62px" $r={`${PILL_RADIUS}px`} />
      </SkPill>
      <Grid>
        <Fields>
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </Fields>
        <Actions>
          <SkSubmit>
            <Shimmer $h="100%" $r="16px" />
          </SkSubmit>
        </Actions>
      </Grid>
    </Card>
  );
}
