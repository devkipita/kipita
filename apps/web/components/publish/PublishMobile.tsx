"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { KENYAN_TOWNS, POPULAR_ROUTES, searchTowns } from "@kipita/shared";
import {
  CaretLeft,
  CaretRight,
  Car,
  Check,
  MagnifyingGlass,
  MapPin,
  Plus,
  SealCheck,
  Warning,
  X,
} from "@/components/icons";
import { useAppMode } from "@/components/nav/AppShell";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { createTripAction } from "@/lib/home/posts";
import { saveCarAction } from "@/lib/driver/cars";
import { carName } from "@/components/driver/CarDialog";
import { detectOrigin } from "@/lib/home/geo";
import { PLATE_ERROR, PLATE_EXAMPLE, formatPlate, isPlate } from "@/lib/home/plate";
import type { RidePreferences } from "@/lib/ride-detail";
import { prettyTime, todayISO } from "./WhenPicker";
import type { SavedCar } from "./draft";
import { clearDraft, loadDraft, saveDraft } from "./draft";

type PrefKey = keyof RidePreferences;
type Prefs = Record<PrefKey, boolean>;
type CarMode = "saved" | "new" | "none";

type Draft = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number | null;
  price: string;
  carMode: CarMode;
  savedPlate: string;
  make: string;
  model: string;
  plate: string;
  color: string;
  prefs: Prefs;
};

const STEPS = ["Destination", "Day", "Departure time", "Seats", "Price", "Car", "Ride details", "Review"] as const;

const DAYS_AHEAD = 21;
const FARES = [500, 800, 1200, 1600, 2000, 2500];
const SEATS = [1, 2, 3, 4, 5, 6];
const TIMES = ["06:00", "07:00", "07:30", "08:00", "09:00", "12:00", "15:00", "17:00", "18:00"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** Named with the paint beside it — a driver picks a colour by seeing it. */
const CAR_COLORS: { label: string; swatch: string }[] = [
  { label: "White", swatch: "#FFFFFF" },
  { label: "Silver", swatch: "#C9CDD0" },
  { label: "Black", swatch: "#1D1F1E" },
  { label: "Grey", swatch: "#7D8381" },
  { label: "Blue", swatch: "#2F5D9E" },
  { label: "Red", swatch: "#B23A2E" },
  { label: "Green", swatch: "#2F6B4C" },
  { label: "Gold", swatch: "#C9A227" },
];
const MAJOR = ["Nairobi", "Nakuru", "Nyeri", "Nanyuki", "Naivasha", "Thika", "Eldoret", "Kisumu", "Mombasa", "Meru", "Machakos"];

type Rule = {
  key: PrefKey;
  label: string;
  inverted: boolean;
  yes: string;
  no: string;
  chipYes: string;
  chipNo: string;
  goodWhenYes: boolean;
};

const RULES: Rule[] = [
  { key: "no_smoking", label: "Smoking", inverted: true, yes: "Allowed", no: "Not allowed", chipYes: "Smoking OK", chipNo: "No smoking", goodWhenYes: false },
  { key: "pets", label: "Pets", inverted: false, yes: "Allowed", no: "Not allowed", chipYes: "Pets OK", chipNo: "No pets", goodWhenYes: false },
  { key: "luggage", label: "Room for luggage", inverted: false, yes: "One bag per passenger", no: "Hand luggage only", chipYes: "Luggage fits", chipNo: "Small bags only", goodWhenYes: true },
  { key: "music", label: "Music", inverted: false, yes: "On during the trip", no: "Quiet ride", chipYes: "Music on", chipNo: "Quiet ride", goodWhenYes: true },
  { key: "silent_ride", label: "Conversation", inverted: true, yes: "Happy to chat", no: "Prefer quiet", chipYes: "Chat welcome", chipNo: "Prefer quiet", goodWhenYes: true },
];

const pad = (n: number) => String(n).padStart(2, "0");

function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function dayPhrase(value: string) {
  if (!value) return "";
  const today = new Date();
  if (value === iso(today)) return "today";
  if (value === iso(plusDays(today, 1))) return "tomorrow";
  const d = new Date(`${value}T00:00:00`);
  return `on ${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function ruleOn(prefs: Prefs, rule: Rule) {
  return rule.inverted ? !prefs[rule.key] : prefs[rule.key];
}

function pickedCar(d: Draft, cars: SavedCar[]) {
  if (d.carMode === "saved") {
    const saved = cars.find((c) => c.plate === d.savedPlate) ?? cars[0];
    if (saved) return { make: saved.make, model: saved.model, plate: saved.plate, color: saved.color ?? "" };
  }
  if (d.carMode === "new") return { make: d.make, model: d.model, plate: d.plate, color: d.color };
  return null;
}

function carLine(d: Draft, cars: SavedCar[]) {
  const car = pickedCar(d, cars);
  if (!car || !car.plate.trim()) return "";
  return `${car.color} ${car.make} ${car.model}, ${car.plate}`.replace(/\s+/g, " ").trim();
}

function blankDraft(cars: SavedCar[]): Draft {
  return {
    from: "",
    to: "",
    date: "",
    time: "",
    seats: null,
    price: "",
    carMode: cars.length > 0 ? "saved" : "none",
    savedPlate: cars[0]?.plate ?? "",
    make: "",
    model: "",
    plate: "",
    color: "",
    prefs: { no_smoking: true, pets: false, luggage: true, music: true, silent_ride: false },
  };
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ring = css`
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Page = styled.main`
  /* A fixed column, not a long scrolling page: header, a scrolling middle, and
     the action bar flush at the bottom. As a sticky element the bar floated
     with content running behind and under it. dvh tracks the visible viewport;
     vh is the fallback for browsers without it. */
  height: calc(100vh - var(--topbar-h, 0px) - var(--bottom-bar-space, 0px));
  height: calc(100dvh - var(--topbar-h, 0px) - var(--bottom-bar-space, 0px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${nocturne.bg};
  color: ${nocturne.cream};
`;

const Header = styled.header`
  /* The scrolling now happens inside <Scroll>, so this is simply the first row
     of the column. As a sticky element with a top offset it detached from the
     app bar and left a white band above itself. */
  flex-shrink: 0;
  padding: 0;
  background: transparent;
`;

/** The step is still announced, just not drawn. */
const SrOnlyStep = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

/** A hairline of segments across the top of the page, flush under the app bar. */
const Progress = styled.nav`
  display: flex;
  gap: 3px;

  button {
    flex: 1;
    display: flex;
    align-items: flex-start;
    /* A 3px rule is too fine to hit, so the target is the padding around it. */
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
  }
  button span {
    width: 100%;
    height: 3px;
    background: ${nocturne.line};
    transition: background-color 0.3s ease;
  }
  button[data-on="true"] span {
    background: ${nocturne.lime};
  }
  button[data-reached="true"]:not([data-on="true"]) span {
    background: color-mix(in oklab, var(--n-lime) 45%, transparent);
  }
  button:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 1px;
  }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 24px 20px 28px;
`;

const Sentence = styled.p`
  margin: 0 0 28px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  /* 27px is the drawn size; it only shrinks on the narrowest phones, where a
     fixed 27px pushes long town names into an awkward one-word-per-line wrap. */
  font-size: clamp(22px, 7vw, 27px);
  font-weight: 500;
  line-height: 1.42;
  letter-spacing: -0.02em;
  text-wrap: pretty;
  color: ${nocturne.cream};
`;

const Filled = styled.button`
  display: inline;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 800;
  letter-spacing: inherit;
  text-align: left;
  color: ${nocturne.green};
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
  cursor: pointer;
  ${ring}
`;

const Asking = styled.span`
  display: inline-block;
  padding: 0 10px;
  border-radius: 10px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 22px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.01em;
`;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${rise} 0.22s ease-out;

  &:focus {
    outline: none;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
`;

const Note = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${nocturne.muted2};
`;

const Overline = styled.div`
  padding: 4px 2px 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid ${nocturne.line};
  border-radius: 14px;
  background: ${nocturne.surface};

  > svg {
    flex: none;
    color: ${nocturne.green};
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .kicker {
    font-size: 12px;
    font-weight: 600;
    color: ${nocturne.muted2};
  }
  .value {
    font-size: 15px;
    font-weight: 700;
  }
`;

const Ghost = styled.button`
  min-height: 44px;
  padding: 10px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: ${nocturne.green};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  ${ring}
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;

  > span {
    font-size: 15px;
    font-weight: 700;
  }
  > span.soft {
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.muted2};
  }
`;

const Box = styled.div<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 14px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  border-radius: 14px;
  background: ${nocturne.surface};

  &:focus-within {
    border-color: ${nocturne.green};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
  > svg {
    flex: none;
    color: ${nocturne.muted2};
  }
  .unit {
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 16px;
    color: ${nocturne.cream};
    scroll-margin-bottom: 180px;
  }
  input::placeholder {
    color: ${nocturne.muted3};
  }
`;

const TownRow = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 0 6px;
  border: 0;
  border-bottom: 1px solid ${nocturne.line2};
  background: ${({ $on }) => ($on ? nocturne.surface2 : "transparent")};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;

  .name {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
  }
  .meta {
    font-size: 13px;
    color: ${nocturne.muted2};
  }
  > svg {
    color: ${nocturne.muted3};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
  }
`;

const Pick = styled.button<{ $on: boolean; $h?: number; $size?: number }>`
  height: ${({ $h }) => $h ?? 48}px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  border-radius: 12px;
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font-family: inherit;
  font-size: ${({ $size }) => $size ?? 15}px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;
  ${ring}
`;

const Grid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  gap: 8px;
`;

const Calendar = styled.div`
  padding: 16px 12px 12px;
  border: 1px solid ${nocturne.line};
  border-radius: 18px;
  background: ${nocturne.surface};

  .month {
    padding: 0 6px 12px;
    font-size: 15px;
    font-weight: 700;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    text-align: center;
  }
  .wd {
    padding-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
`;

const Day = styled.button<{ $on: boolean; $today: boolean }>`
  height: 44px;
  padding: 0;
  border-radius: 12px;
  border: ${({ $on, $today }) => (!$on && $today ? `1.5px solid ${nocturne.green}` : "0")};
  background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $on, $today }) => ($on || $today ? 800 : 600)};
  cursor: pointer;

  &:disabled {
    color: ${nocturne.muted3};
    opacity: 0.55;
    cursor: default;
  }
  ${ring}
`;

const CarOption = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  border-radius: 16px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;

  .badge {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: ${nocturne.surface2};
    color: ${nocturne.green};
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    font-size: 16px;
    font-weight: 700;
  }
  .plate {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: ${nocturne.muted2};
  }
  .radio {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 11px;
    box-sizing: border-box;
    border: 2px solid ${({ $on }) => ($on ? nocturne.green : nocturne.muted3)};
  }
  .radio::after {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
  }
  ${ring}
`;

const Dashed = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 52px;
  border: 1.5px dashed ${nocturne.muted3};
  border-radius: 16px;
  background: transparent;
  color: ${nocturne.green};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  ${ring}
`;

const CarStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const NewCar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 4px;
  animation: ${rise} 0.24s ease-out;

  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  @media (min-width: 400px) {
    .pair {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
  }
  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
  }
  .missing {
    font-size: 14px;
    line-height: 1.4;
    color: ${nocturne.muted2};
  }
  .ready {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.green};
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Swatch = styled(Pick)<{ $sw: string }>`
  height: 44px;
  padding: 0 14px 0 8px;
  border-radius: 22px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 10px;
    background: ${({ $sw }) => $sw};
    /* Keeps white and black readable against either theme's chip. */
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  }
`;

const Plate = styled.input`
  width: 100%;
  height: 64px;
  box-sizing: border-box;
  padding: 0 16px;
  border: 2.5px solid ${nocturne.cream};
  border-radius: 10px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-align: center;
  text-transform: uppercase;
  scroll-margin-bottom: 180px;
  box-shadow: inset 0 0 0 3px ${nocturne.surface}, inset 0 0 0 4px ${nocturne.line};

  &::placeholder {
    color: ${nocturne.muted3};
    font-weight: 700;
  }
  &:focus {
    outline: none;
    border-color: ${nocturne.green};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.ring};
    outline-offset: 2px;
  }
`;

const Switch = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 0 2px;
  border: 0;
  border-bottom: 1px solid ${nocturne.line2};
  background: transparent;
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;

  .text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .label {
    font-size: 16px;
    font-weight: 700;
  }
  .state {
    font-size: 13px;
    color: ${nocturne.muted2};
  }
  .track {
    position: relative;
    flex: none;
    width: 50px;
    height: 30px;
    border-radius: 15px;
    background: ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
    transition: background-color 0.2s ease;
  }
  .knob {
    position: absolute;
    top: 3px;
    left: ${({ $on }) => ($on ? "23px" : "3px")};
    width: 24px;
    height: 24px;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left 0.2s ease;
  }
  ${ring}
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid ${nocturne.line};
  border-radius: 17px;
  background: ${nocturne.surface};
  color: ${nocturne.muted};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  svg {
    color: ${({ $good }) => ($good ? nocturne.green : nocturne.tan)};
  }
  ${ring}
`;

const Payout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: ${nocturne.surface2};

  .line {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
    color: ${nocturne.cream};
  }
  .line svg {
    flex: none;
    width: 22px;
    height: 22px;
    color: ${nocturne.green};
  }
  .line .act {
    display: block;
    margin-top: 4px;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.green};
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
`;

const Alert = styled.div<{ $warn?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid ${nocturne.line};
  background: ${nocturne.surface};

  > svg {
    flex: none;
    margin-top: 1px;
    color: ${({ $warn }) => ($warn ? nocturne.tan : nocturne.green)};
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
  b {
    display: block;
    margin-bottom: 2px;
    font-size: 15px;
    color: ${nocturne.cream};
  }
`;

const Bar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 12px 16px 14px;
  border-top: 1px solid ${nocturne.line2};
  background: ${nocturne.bg};
`;

const press = css`
  transition:
    transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    background-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const BarBtn = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 52px;
  padding: 0 16px;
  border: 2px solid ${nocturne.green};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.green};
  font: inherit;
  font-family: var(--font-manrope), sans-serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 2px 6px -3px rgba(15, 59, 44, 0.35);
  ${press}
  ${ring}

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
`;

const Cta = styled.button<{ $tone: "go" | "publish" | "off" }>`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 52px;
  padding: 0 16px;
  border: 2px solid transparent;
  border-radius: 999px;
  font: inherit;
  font-family: var(--font-manrope), sans-serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  background: ${({ $tone }) => ($tone === "publish" ? nocturne.ctaBg : $tone === "go" ? nocturne.green : nocturne.surface3)};
  color: ${({ $tone }) => ($tone === "publish" ? nocturne.ctaFg : $tone === "go" ? nocturne.onGreen : nocturne.muted3)};
  ${press}
  ${ring}

  .go {
    display: inline-flex;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @media (hover: hover) {
    &:hover:not(:disabled) .go {
      transform: translateX(3px);
    }
  }
  &:disabled {
    cursor: progress;
  }
  @media (prefers-reduced-motion: reduce) {
    .go {
      transition: none;
    }
  }
`;

export function PublishMobile({
  savedCars: initialCars = [],
  publishBeforeApproval = false,
}: {
  savedCars?: SavedCar[];
  publishBeforeApproval?: boolean;
}) {
  const { kycStatus, requireKyc } = useAppMode();
  const submitted = kycStatus === "approved" || kycStatus === "pending";
  const willWait = kycStatus !== "approved" && !publishBeforeApproval;

  const [savedCars, setSavedCars] = useState<SavedCar[]>(initialCars);
  const savedPlates = initialCars.map((c) => c.plate).join(",");
  const [savingCar, setSavingCar] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => blankDraft(initialCars));
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [editFrom, setEditFrom] = useState(false);
  const [guessed, setGuessed] = useState(false);
  const [query, setQuery] = useState("");
  const [otherTime, setOtherTime] = useState(false);
  const [error, setError] = useState<{ text: string; fix?: "kyc" } | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const saved = loadDraft();
    let start = 0;
    if (saved) {
      const known = initialCars.find((c) => c.plate === saved.plate);
      const carMode: CarMode = known
        ? "saved"
        : saved.carMode === "new" || (!saved.carMode && saved.plate)
          ? "new"
          : saved.carMode === "none" || initialCars.length === 0
            ? "none"
            : "saved";
      const base = blankDraft(initialCars);
      setDraft({
        ...base,
        from: saved.from ?? "",
        to: saved.to ?? "",
        date: saved.date ?? "",
        time: saved.time ?? "",
        seats: saved.seats ?? null,
        price: saved.price ?? "",
        carMode,
        savedPlate: known?.plate ?? base.savedPlate,
        make: carMode === "new" ? (saved.make ?? "") : "",
        model: carMode === "new" ? (saved.model ?? "") : "",
        plate: carMode === "new" ? (saved.plate ?? "") : "",
        color: carMode === "new" ? (saved.color ?? "") : "",
        prefs: { ...base.prefs, ...saved.prefs },
      });
      start = Math.min(Math.max(saved.step ?? 0, 0), STEPS.length - 1);
      setStep(start);
      setMaxStep(Math.min(Math.max(saved.maxStep ?? start, start), STEPS.length - 1));
    }
    window.history.replaceState({ ...window.history.state, publishStep: start }, "");
    setReady(true);

    const onPop = (e: PopStateEvent) => {
      const target = (e.state as { publishStep?: unknown } | null)?.publishStep;
      if (typeof target !== "number") return;
      moved.current = true;
      setStep(target);
      setEditFrom(false);
      setQuery("");
      setOtherTime(false);
    };
    window.addEventListener("popstate", onPop);

    const abort = new AbortController();
    detectOrigin(abort.signal)
      .then((origin) => {
        if (!origin) return;
        setDraft((d) => (d.from ? d : { ...d, from: origin.town.name }));
        setGuessed(true);
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("popstate", onPop);
      abort.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPlates]);

  useEffect(() => {
    if (!ready) return;
    const car = pickedCar(draft, savedCars);
    saveDraft({
      from: draft.from,
      to: draft.to,
      date: draft.date,
      time: draft.time,
      seats: draft.seats,
      price: draft.price,
      carMode: draft.carMode,
      make: car?.make ?? "",
      model: car?.model ?? "",
      plate: car?.plate ?? "",
      color: car?.color ?? "",
      prefs: draft.prefs,
      step,
      maxStep,
    });
  }, [draft, step, maxStep, savedCars, ready]);

  useEffect(() => {
    if (!moved.current) return;
    panelRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  }

  function go(next: number) {
    moved.current = true;
    if (next !== step) {
      window.history.pushState({ ...window.history.state, publishStep: next }, "");
    }
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    setEditFrom(false);
    setQuery("");
    setOtherTime(false);
  }

  function back() {
    if (step === 0) return;
    const here = (window.history.state as { publishStep?: unknown } | null)?.publishStep;
    if (here === step) {
      window.history.back();
      return;
    }
    go(step - 1);
  }

  const choosingFrom = editFrom || !draft.from;
  const seats = draft.seats ?? 1;
  const fare = Number(draft.price) || 0;
  const car = carLine(draft, savedCars);

  function carProblem(): string | null {
    if (draft.carMode !== "new") return null;
    if (!draft.make.trim()) return "Add the car make.";
    if (!draft.model.trim()) return "Add the car model.";
    if (!draft.plate.trim()) return "Add the number plate so passengers can find you.";
    if (!isPlate(draft.plate)) return PLATE_ERROR;
    return null;
  }

  const valid = [
    !!draft.from && !!draft.to && draft.from.toLowerCase() !== draft.to.toLowerCase(),
    !!draft.date,
    !!draft.time,
    !!draft.seats,
    fare > 0,
    carProblem() === null,
    true,
    true,
  ][step];

  function problem(): string | null {
    if (draft.from.toLowerCase() === draft.to.toLowerCase()) return "Pick two different towns.";
    if (new Date(`${draft.date}T${draft.time}:00`).getTime() <= Date.now())
      return "That time has already passed. Pick a later one.";
    return carProblem();
  }

  function publish() {
    const wrong = problem();
    if (wrong) {
      setError({ text: wrong });
      return;
    }
    if (!submitted) {
      requireKyc(sendTrip);
      return;
    }
    sendTrip();
  }

  function sendTrip() {
    const vehicle = pickedCar(draft, savedCars);
    startTransition(async () => {
      const result = await createTripAction({
        from_location: draft.from.trim(),
        to_location: draft.to.trim(),
        departure_date: draft.date,
        departure_time: draft.time,
        seats_total: seats,
        price_per_seat: fare,
        preferences: draft.prefs,
        vehicle_make: vehicle?.make.trim() || undefined,
        vehicle_model: vehicle?.model.trim() || undefined,
        vehicle_plate: vehicle?.plate.trim() || undefined,
        vehicle_color: vehicle?.color.trim() || undefined,
      });
      if (!result.ok) {
        setError({ text: result.error, fix: result.fix });
        return;
      }
      clearDraft();
      moved.current = true;
      // No confirmation page: it only restated the review that was just
      // approved, and the ride itself is the better place to land.
      window.location.assign(result.awaiting ? "/trips" : `/ride/${result.id}`);
    });
  }

  async function next() {
    if (!valid || savingCar) return;
    if (step === 7) {
      publish();
      return;
    }
    if (step === 5 && draft.carMode === "new") {
      setSavingCar(true);
      const result = await saveCarAction({ make: draft.make, model: draft.model, plate: draft.plate, color: draft.color });
      setSavingCar(false);
      if (!result.ok) {
        setError({ text: result.error });
        return;
      }
      setSavedCars((list) => [result.car, ...list.filter((c) => c.plate !== result.car.plate)]);
      patch({ carMode: "saved", savedPlate: result.car.plate, make: "", model: "", plate: "", color: "" });
    }
    go(step + 1);
  }

  const reach = step;

  const filled = (text: string, target: number, label: string) => (
    <Filled type="button" onClick={() => go(target)} aria-label={`${label}: ${text}. Change it.`}>
      {text}
    </Filled>
  );
  const ask = (text: string) => <Asking>{text}</Asking>;

  const sentence: ReactNode[] = ["I’m driving from "];
  if (!draft.from) {
    sentence.push(ask("pick a town"));
  } else {
    sentence.push(filled(draft.from, 0, "Leaving from"));
    sentence.push(" to ");
    sentence.push(draft.to ? filled(draft.to, 0, "Going to") : ask("where to?"));
  }
  if (draft.from && reach >= 1) {
    sentence.push(" ");
    sentence.push(draft.date ? filled(dayPhrase(draft.date), 1, "Day") : ask("which day?"));
  }
  if (reach >= 2) {
    sentence.push(" at ");
    sentence.push(draft.time ? filled(prettyTime(draft.time), 2, "Time") : ask("what time?"));
  }
  if (reach >= 3) {
    sentence.push(", with ");
    sentence.push(draft.seats ? filled(`${draft.seats} ${draft.seats === 1 ? "seat" : "seats"}`, 3, "Seats") : ask("how many seats?"));
  }
  if (reach >= 4) {
    sentence.push(" at ");
    sentence.push(fare > 0 ? filled(formatKes(fare), 4, "Price per seat") : ask("what price?"));
    sentence.push(" each");
  }
  if (draft.from) sentence.push(".");
  if (draft.from && reach >= 5 && (car || step === 5)) {
    sentence.push(" Look for my ");
    sentence.push(car ? filled(car, 5, "Car") : ask("which car?"));
    sentence.push(".");
  }

  const searching = query.trim().length > 0;
  const towns = useMemo(() => {
    const other = choosingFrom ? draft.to : draft.from;
    if (searching) return searchTowns(query, 8).filter((t) => t.name !== other);
    const here = KENYAN_TOWNS.find((t) => t.name === draft.from);
    const runs = !choosingFrom && draft.from ? POPULAR_ROUTES.filter((r) => r.from === draft.from).map((r) => r.to) : [];
    return [...new Set([...runs, ...MAJOR])]
      .flatMap((name) => KENYAN_TOWNS.filter((t) => t.name === name))
      .filter((t) => t.name !== other && (choosingFrom || t.county !== here?.county))
      .slice(0, 6);
  }, [query, searching, choosingFrom, draft.from, draft.to]);

  function pickTown(name: string) {
    if (choosingFrom) {
      patch({ from: name });
      setGuessed(false);
      setEditFrom(false);
      setQuery("");
      return;
    }
    patch({ to: name });
    setQuery("");
    if (draft.from && draft.from.toLowerCase() !== name.toLowerCase()) go(1);
  }

  const calendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = plusDays(today, DAYS_AHEAD - 1);
    const start = plusDays(today, -((today.getDay() + 6) % 7));
    const end = plusDays(last, 6 - ((last.getDay() + 6) % 7));
    const cells: { iso: string; day: number; off: boolean; today: boolean; label: string }[] = [];
    for (let d = new Date(start); d <= end; d = plusDays(d, 1)) {
      cells.push({
        iso: iso(d),
        day: d.getDate(),
        off: d < today || d > last,
        today: iso(d) === iso(today),
        label: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
      });
    }
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { month: "long" });
    const month =
      today.getMonth() === last.getMonth()
        ? `${fmt(today)} ${today.getFullYear()}`
        : `${fmt(today)} – ${fmt(last)} ${last.getFullYear()}`;
    return { cells, month, today: iso(today), tomorrow: iso(plusDays(today, 1)) };
  }, []);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const times = draft.date === calendar.today ? TIMES.filter((t) => minutesOf(t) > nowMin + 15) : TIMES;

  const ctaTone: "go" | "publish" | "off" = step === 7 ? "publish" : valid ? "go" : "off";
  const ctaLabel =
    step === 7
      ? pending
        ? "Publishing…"
        : submitted
          ? "Publish ride"
          : "Verify to publish"
      : "Continue";

  return (
    <Page>
      {/* Just the line, sitting under the app bar. Each segment is still the
          way back to that step, so the arrow and the cross were two more
          controls earning nothing. */}
      <Header>
        <Progress aria-label="Steps">
          {STEPS.map((name, i) => (
            <button
              key={name}
              type="button"
              data-on={i <= step}
              data-reached={i <= maxStep}
              aria-current={i === step ? "step" : undefined}
              aria-label={`Step ${i + 1} of ${STEPS.length}: ${name}`}
              disabled={i > maxStep || i === step}
              onClick={() => go(i)}
            >
              <span />
            </button>
          ))}
        </Progress>
        <SrOnlyStep aria-live="polite">
          {`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
        </SrOnlyStep>
      </Header>

      <Scroll>
        <Sentence>{sentence.map((part, i) => (typeof part === "string" ? part : <span key={i}>{part}</span>))}</Sentence>

        {(
          <Panel ref={panelRef} tabIndex={-1} aria-label={STEPS[step]} key={step}>
            {step === 0 && (
              <>
                <Card>
                  <MapPin size={20} />
                  <div className="text">
                    <span className="kicker">{guessed ? "Leaving from · based on your location" : "Leaving from"}</span>
                    <span className="value">{draft.from || "Choose a town below"}</span>
                  </div>
                  {draft.from && (
                    <Ghost type="button" onClick={() => { setEditFrom((v) => !v); setQuery(""); }}>
                      {editFrom ? "Cancel" : "Change"}
                    </Ghost>
                  )}
                </Card>
                <FieldLabel>
                  <span>{choosingFrom ? "Where are you leaving from?" : "Where are you going?"}</span>
                  <Box $on>
                    <MagnifyingGlass size={20} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a town or city" autoComplete="off" spellCheck={false} />
                  </Box>
                </FieldLabel>
                <div>
                  <Overline>{searching ? "Matches" : choosingFrom ? "Towns" : `Popular from ${draft.from.replace(" CBD", "")}`}</Overline>
                  {towns.map((t) => (
                    <TownRow key={t.name} type="button" $on={!choosingFrom && draft.to === t.name} onClick={() => pickTown(t.name)}>
                      <span className="name">{t.name}</span>
                      {t.county !== t.name && <span className="meta">{t.county}</span>}
                      <CaretRight size={18} />
                    </TownRow>
                  ))}
                  {towns.length === 0 && <Note>No town matches “{query.trim()}”.</Note>}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Grid $cols={2}>
                  <Pick type="button" $on={draft.date === calendar.today} onClick={() => { patch({ date: calendar.today }); go(2); }}>
                    Today
                  </Pick>
                  <Pick type="button" $on={draft.date === calendar.tomorrow} onClick={() => { patch({ date: calendar.tomorrow }); go(2); }}>
                    Tomorrow
                  </Pick>
                </Grid>
                <Calendar>
                  <div className="month">{calendar.month}</div>
                  <div className="grid">
                    {WEEKDAYS.map((w, i) => (
                      <div key={i} className="wd" aria-hidden>
                        {w}
                      </div>
                    ))}
                    {calendar.cells.map((c) => (
                      <Day
                        key={c.iso}
                        type="button"
                        disabled={c.off}
                        aria-label={c.label}
                        aria-pressed={draft.date === c.iso}
                        $on={draft.date === c.iso}
                        $today={c.today}
                        onClick={() => { patch({ date: c.iso }); go(2); }}
                      >
                        {c.day}
                      </Day>
                    ))}
                  </div>
                </Calendar>
                <Note>Rides can be posted up to three weeks ahead.</Note>
              </>
            )}

            {step === 2 && (
              <>
                <Heading>Tap the time you leave</Heading>
                <Grid $cols={3}>
                  {times.map((t) => (
                    <Pick key={t} type="button" $on={draft.time === t} $h={52} onClick={() => { patch({ time: t }); go(3); }}>
                      {prettyTime(t)}
                    </Pick>
                  ))}
                </Grid>
                {otherTime || times.length === 0 ? (
                  <FieldLabel>
                    <span className="soft">Any other time</span>
                    <Box $on={!!draft.time && !times.includes(draft.time)}>
                      <input type="time" step={300} value={draft.time} onChange={(e) => patch({ time: e.target.value })} aria-label="Departure time" />
                    </Box>
                  </FieldLabel>
                ) : (
                  <Ghost type="button" style={{ alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => setOtherTime(true)}>
                    Another time
                  </Ghost>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Heading>How many seats are you offering?</Heading>
                <Grid $cols={3}>
                  {SEATS.map((n) => (
                    <Pick key={n} type="button" $on={draft.seats === n} $h={64} $size={24} aria-label={`${n} ${n === 1 ? "seat" : "seats"}`} onClick={() => { patch({ seats: n }); go(4); }}>
                      {n}
                    </Pick>
                  ))}
                </Grid>
                <Note>Count passenger seats only. Keep one free if you need the space for luggage.</Note>
              </>
            )}

            {step === 4 && (
              <>
                <Heading>Price per seat</Heading>
                <Grid $cols={3}>
                  {FARES.map((f) => (
                    <Pick key={f} type="button" $on={fare === f} onClick={() => patch({ price: String(f) })}>
                      {formatKes(f)}
                    </Pick>
                  ))}
                </Grid>
                <FieldLabel>
                  <span className="soft">Or enter your own price</span>
                  <Box $on={fare > 0 && !FARES.includes(fare)}>
                    <span className="unit">KES</span>
                    <input
                      inputMode="numeric"
                      value={FARES.includes(fare) || !fare ? "" : fare.toLocaleString("en-US")}
                      placeholder="950"
                      aria-label="Price per seat in Kenyan shillings"
                      onChange={(e) => patch({ price: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      style={{ fontSize: 17, fontWeight: 700 }}
                    />
                  </Box>
                </FieldLabel>
              </>
            )}

            {step === 5 && (
              <>
                <Heading>Which car are you driving?</Heading>
                <CarStack role="radiogroup" aria-label="Car">
                  {savedCars.map((saved) => {
                    const on = draft.carMode === "saved" && (pickedCar(draft, savedCars)?.plate ?? "") === saved.plate;
                    return (
                      <CarOption key={saved.plate} type="button" role="radio" aria-checked={on} $on={on} onClick={() => patch({ carMode: "saved", savedPlate: saved.plate })}>
                        <span className="badge">
                          <Car size={24} />
                        </span>
                        <span className="text">
                          <span className="name">{carName({ color: saved.color ?? "", make: saved.make, model: saved.model })}</span>
                          <span className="plate">{saved.plate}</span>
                        </span>
                        <span className="radio" aria-hidden />
                      </CarOption>
                    );
                  })}
                  {draft.carMode === "new" ? (
                    <CarOption as="div" $on aria-hidden>
                      <span className="badge">
                        <Car size={24} />
                      </span>
                      <span className="text">
                        <span className="name">
                          {[draft.color, draft.make, draft.model].filter(Boolean).join(" ") || "Your car"}
                        </span>
                        <span className="plate">{draft.plate.trim() || "Plate goes here"}</span>
                      </span>
                      <span className="radio" aria-hidden />
                    </CarOption>
                  ) : (
                    <Dashed type="button" onClick={() => patch({ carMode: "new" })}>
                      <Plus size={18} weight="bold" />
                      {savedCars.length > 0 ? "Add a car" : "Add your car"}
                    </Dashed>
                  )}
                </CarStack>

                {draft.carMode === "new" && (
                  <NewCar>
                    <div className="pair">
                      <FieldLabel>
                        <span className="soft">Make</span>
                        <Box>
                          <input
                            value={draft.make}
                            placeholder="Toyota"
                            autoFocus
                            autoComplete="off"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            maxLength={40}
                            onChange={(e) => patch({ make: e.target.value })}
                          />
                        </Box>
                      </FieldLabel>
                      <FieldLabel>
                        <span className="soft">Model</span>
                        <Box>
                          <input
                            value={draft.model}
                            placeholder="Axio"
                            autoComplete="off"
                            autoCapitalize="words"
                            enterKeyHint="next"
                            maxLength={40}
                            onChange={(e) => patch({ model: e.target.value })}
                          />
                        </Box>
                      </FieldLabel>
                    </div>

                    <FieldLabel as="div">
                      <span className="soft" id="car-colour">Colour</span>
                      <div className="colors" role="group" aria-labelledby="car-colour">
                        {CAR_COLORS.map((c) => (
                          <Swatch
                            key={c.label}
                            type="button"
                            $on={draft.color === c.label}
                            $sw={c.swatch}
                            aria-pressed={draft.color === c.label}
                            onClick={() => patch({ color: draft.color === c.label ? "" : c.label })}
                          >
                            <i aria-hidden />
                            {c.label}
                          </Swatch>
                        ))}
                      </div>
                    </FieldLabel>

                    <FieldLabel>
                      <span className="soft">Number plate</span>
                      <Plate
                        value={draft.plate}
                        placeholder={PLATE_EXAMPLE}
                        maxLength={8}
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="done"
                        aria-invalid={draft.plate.trim().length > 0 && !isPlate(draft.plate)}
                        aria-describedby="plate-help"
                        onChange={(e) => patch({ plate: formatPlate(e.target.value) })}
                      />
                      <span className="soft" id="plate-help">
                        {draft.plate.trim().length > 0 && !isPlate(draft.plate) ? PLATE_ERROR : "Three letters, three numbers, one letter."}
                      </span>
                    </FieldLabel>

                    <div className="foot">
                      {carProblem() ? (
                        <span className="missing" aria-live="polite">
                          Still needed:{" "}
                          {[
                            !draft.make.trim() && "make",
                            !draft.model.trim() && "model",
                            !isPlate(draft.plate) && "plate",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      ) : (
                        <span className="ready" aria-live="polite">
                          <Check size={16} weight="bold" /> Car ready
                        </span>
                      )}
                      <Ghost type="button" onClick={() => patch({ carMode: savedCars.length > 0 ? "saved" : "none", make: "", model: "", plate: "", color: "" })}>
                        {savedCars.length > 0 ? "Use saved car" : "Skip for now"}
                      </Ghost>
                    </div>
                  </NewCar>
                )}

                {draft.carMode !== "new" && (
                  <Note>
                    {savedCars.length > 0
                      ? "Passengers use the plate to find you at pickup."
                      : "Optional. Passengers use the plate to find you at pickup."}
                  </Note>
                )}
              </>
            )}

            {step === 6 && (
              <div>
                <Heading style={{ paddingBottom: 6 }}>What should passengers know?</Heading>
                {RULES.map((rule) => {
                  const on = ruleOn(draft.prefs, rule);
                  return (
                    <Switch
                      key={rule.key}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      $on={on}
                      onClick={() => patch({ prefs: { ...draft.prefs, [rule.key]: !draft.prefs[rule.key] } })}
                    >
                      <span className="text">
                        <span className="label">{rule.label}</span>
                        <span className="state">{on ? rule.yes : rule.no}</span>
                      </span>
                      <span className="track" aria-hidden>
                        <span className="knob" />
                      </span>
                    </Switch>
                  );
                })}
              </div>
            )}

            {step === 7 && (
              <>
                <Chips>
                  {RULES.map((rule) => {
                    const on = ruleOn(draft.prefs, rule);
                    const good = on === rule.goodWhenYes;
                    return (
                      <Chip key={rule.key} type="button" $good={good} onClick={() => go(6)}>
                        {good ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                        {on ? rule.chipYes : rule.chipNo}
                      </Chip>
                    );
                  })}
                </Chips>
                {kycStatus !== "approved" && (
                  <Payout>
                    <div className="line">
                      <SealCheck size={22} />
                      <span>
                        {kycStatus === "pending"
                          ? "Verification in review. It goes live once this clears"
                          : kycStatus === "rejected"
                            ? "Verification unsuccessful"
                            : "Drivers are verified before publishing"}
                      </span>
                    </div>
                  </Payout>
                )}
                {error && (
                  <Alert $warn role="alert">
                    <Warning size={20} />
                    <div>
                      <p style={{ fontWeight: 600 }}>{error.text}</p>
                      {error.fix === "kyc" && (
                        <Ghost type="button" onClick={() => requireKyc(sendTrip)} style={{ paddingLeft: 0 }}>
                          {kycStatus === "rejected" ? "Resubmit documents" : "Add documents"}
                        </Ghost>
                      )}
                    </div>
                  </Alert>
                )}
              </>
            )}
          </Panel>
        )}
      </Scroll>

      <Bar className="bar">
        {step > 0 && (
          <BarBtn type="button" onClick={back}>
            <CaretLeft size={18} weight="bold" />
            Back
          </BarBtn>
        )}
        {valid && (
          <Cta type="button" $tone={ctaTone} disabled={pending || savingCar} aria-busy={pending || savingCar} onClick={() => void next()}>
            {(pending || savingCar) && <ButtonOrb job="committing" />}
            {ctaLabel}
            {!pending && !savingCar && (
              <span className="go" aria-hidden>
                <CaretRight size={18} weight="bold" />
              </span>
            )}
          </Cta>
        )}
      </Bar>
    </Page>
  );
}
