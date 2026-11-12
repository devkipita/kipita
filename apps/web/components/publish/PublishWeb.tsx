"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { KENYAN_TOWNS, POPULAR_ROUTES, searchTowns } from "@kipita/shared";
import {
  ArrowRight,
  CalendarBlank,
  CaretLeft,
  Clock,
  MagnifyingGlass,
  Minus,
  Plus,
  SealCheck,
  ShieldCheck,
  Wallet,
  Warning,
  X,
} from "@/components/icons";
import { useAppMode } from "@/components/nav/AppShell";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { createTripAction } from "@/lib/home/posts";
import { detectOrigin } from "@/lib/home/geo";
import { PLATE_ERROR, PLATE_EXAMPLE, formatPlate, isPlate } from "@/lib/home/plate";
import type { RidePreferences } from "@/lib/ride-detail";
import { prettyTime } from "./WhenPicker";
import type { SavedCar } from "./draft";
import { clearDraft, loadDraft, saveDraft } from "./draft";

type PrefKey = keyof RidePreferences;
type Prefs = Record<PrefKey, boolean>;
type CarRow = { make: string; model: string; plate: string; color: string };
type Period = "morning" | "afternoon" | "evening";

type Draft = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number | null;
  price: string;
  prefs: Prefs;
};

const STEPS = ["Destination", "Day", "Departure time", "Seats", "Price", "Car", "Ride details", "Review"] as const;
const DAYS_AHEAD = 21;
const FARES = [1000, 1500, 2000, 2500];
const SEATS = [1, 2, 3, 4, 5, 6, 7, 8];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAJOR = ["Nanyuki", "Thika", "Nakuru", "Nyeri", "Naivasha", "Eldoret", "Kisumu", "Mombasa", "Meru", "Machakos", "Nairobi"];

/** The four quick times offered before anyone opens the time dialog. */
const QUICK_TIMES = ["06:00", "09:00", "13:00", "17:00"];

const PERIODS: { key: Period; label: string; range: string; from: number; to: number }[] = [
  { key: "morning", label: "Morning", range: "5 – 11:30 am", from: 5, to: 11 },
  { key: "afternoon", label: "Afternoon", range: "12 – 4:30 pm", from: 12, to: 16 },
  { key: "evening", label: "Evening", range: "5 – 9:30 pm", from: 17, to: 21 },
];

const COLOURS: { label: string; swatch: string }[] = [
  { label: "White", swatch: "#FFFFFF" },
  { label: "Silver", swatch: "#C9CDD0" },
  { label: "Black", swatch: "#1D1F1E" },
  { label: "Grey", swatch: "#7D8381" },
  { label: "Blue", swatch: "#2F5D9E" },
  { label: "Red", swatch: "#B23A2E" },
  { label: "Green", swatch: "#2F6B4C" },
];

type RuleIcon = "smoke" | "pet" | "bag" | "music" | "chat";

type Rule = {
  key: PrefKey;
  label: string;
  icon: RuleIcon;
  inverted: boolean;
  chipYes: string;
  chipNo: string;
};

const RULES: Rule[] = [
  { key: "no_smoking", label: "Smoking", icon: "smoke", inverted: true, chipYes: "Smoking OK", chipNo: "No smoking" },
  { key: "pets", label: "Pets", icon: "pet", inverted: false, chipYes: "Pets OK", chipNo: "No pets" },
  { key: "luggage", label: "Room for luggage", icon: "bag", inverted: false, chipYes: "Luggage fits", chipNo: "Small bags only" },
  { key: "music", label: "Music", icon: "music", inverted: false, chipYes: "Music on", chipNo: "Quiet ride" },
  { key: "silent_ride", label: "Conversation", icon: "chat", inverted: true, chipYes: "Chat welcome", chipNo: "Prefer quiet" },
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

function shortDay(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

function dayPhrase(value: string) {
  if (!value) return "";
  const today = new Date();
  if (value === iso(today)) return "today";
  if (value === iso(plusDays(today, 1))) return "tomorrow";
  return `on ${shortDay(value)}`;
}

function pillDay(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  const today = new Date();
  const lead =
    value === iso(today)
      ? "Today"
      : value === iso(plusDays(today, 1))
        ? "Tomorrow"
        : d.toLocaleDateString("en-GB", { weekday: "short" });
  return `${lead} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

function periodOf(hhmm: string): Period {
  const h = Number(hhmm.split(":")[0]);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function carName(c: CarRow) {
  return `${c.color} ${c.make} ${c.model}`.replace(/\s+/g, " ").trim();
}

function ruleOn(prefs: Prefs, rule: Rule) {
  return rule.inverted ? !prefs[rule.key] : prefs[rule.key];
}

/** A rule reads well when it is the permissive option — except smoking and pets. */
function ruleIsGood(rule: Rule, on: boolean) {
  return rule.key === "no_smoking" || rule.key === "pets" ? !on : on;
}

function blankDraft(): Draft {
  return {
    from: "",
    to: "",
    date: "",
    time: "",
    seats: null,
    price: "",
    prefs: { no_smoking: true, pets: false, luggage: true, music: true, silent_ride: false },
  };
}

const RULE_PATHS: Record<RuleIcon, ReactNode> = {
  smoke: (
    <>
      <path d="M3 15h13v3H3z" />
      <path d="M19 15v3M21.5 15v3" />
      <path d="M17 11c0-2 2-2 2-4s-2-2-2-3" />
    </>
  ),
  pet: (
    <>
      <circle cx="5.5" cy="10" r="1.8" />
      <circle cx="9" cy="6" r="1.8" />
      <circle cx="15" cy="6" r="1.8" />
      <circle cx="18.5" cy="10" r="1.8" />
      <path d="M12 11c-3 0-5.5 4-5.5 6.5 0 1.5 1.2 2.5 2.7 2.5 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c1.5 0 2.7-1 2.7-2.5C17.5 15 15 11 12 11z" />
    </>
  ),
  bag: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 11v5M15 11v5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
};

function RuleGlyph({ icon }: { icon: RuleIcon }) {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {RULE_PATHS[icon]}
    </svg>
  );
}

function CarGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v2H3z" />
      <circle cx="7.5" cy="13.5" r="1" />
      <circle cx="16.5" cy="13.5" r="1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
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
  min-height: 100vh;
  background: ${nocturne.bg};
  color: ${nocturne.cream};
`;

const Layout = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 28px;

  @media (max-width: 640px) {
    padding: 20px 16px 56px;
    gap: 22px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .what {
    font-size: 14px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
`;

const HeadLeft = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const StepPill = styled.span`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1.5px solid ${nocturne.line};
  background: transparent;
  font-size: 13px;
  font-weight: 800;
  color: ${nocturne.green};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const Discard = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: ${nocturne.muted2};
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 10px;
  ${ring}

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
      color: ${nocturne.cream};
    }
  }
`;

const Sentence = styled.p`
  margin: 0;
  font-size: clamp(30px, 4.4vw, 68px);
  line-height: 1.28;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: ${nocturne.cream};
  text-wrap: pretty;
`;

const Filled = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
  cursor: pointer;
  text-decoration: underline;
  text-decoration-skip-ink: none;
  text-decoration-color: ${nocturne.muted3};
  text-decoration-thickness: 4px;
  text-underline-offset: 12px;
  ${ring}

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.green};
      text-decoration-color: ${nocturne.accent};
    }
  }
`;

const Asking = styled.span`
  display: inline-block;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-weight: 700;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 0.8em;
  line-height: 1.45;
  letter-spacing: -0.015em;
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${rise} 0.24s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FieldHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  label,
  > span:first-child {
    font-size: 16px;
    font-weight: 700;
  }
`;

const Eyebrow = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${nocturne.muted2};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Search = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 54px;
  max-width: 560px;
  padding: 0 16px;
  background: ${nocturne.surface};
  border: 1.5px solid ${nocturne.green};
  border-radius: 14px;

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
  }
`;

/** The one interactive shape this page is built from. */
const Chip = styled.button<{ $on?: boolean; $h?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: ${({ $h }) => $h ?? 44}px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  ${ring}

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.green};
      border-color: ${nocturne.green};
      color: ${nocturne.onGreen};
    }
  }
`;

const SeatChip = styled(Chip)`
  min-width: 56px;
  font-size: 16px;
  font-weight: 800;
`;

const CarChip = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 14px 0 6px;
  border-radius: 999px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${nocturne.surface};
  text-align: left;
  font: inherit;
  color: ${nocturne.cream};
  cursor: pointer;
  ${ring}

  .bubble {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${nocturne.surface2};
    color: ${nocturne.green};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .name {
    font-size: 16px;
    font-weight: 700;
  }
  .plate {
    font-size: 13px;
    color: ${nocturne.muted2};
    font-weight: 600;
    letter-spacing: 0.04em;
  }
`;

const Radio = styled.span<{ $on: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: 2px solid ${({ $on }) => ($on ? nocturne.green : nocturne.muted3)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
  }
`;

const AddCar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 52px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px dashed ${nocturne.muted3};
  background: transparent;
  color: ${nocturne.green};
  font: inherit;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  ${ring}

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
`;

const RuleChip = styled.button<{ $on: boolean; $h?: number }>`
  height: ${({ $h }) => $h ?? 48}px;
  padding: 0 18px 0 8px;
  border-radius: 24px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.surface2 : "transparent")};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease;
  ${ring}

  .glyph {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface3)};
    color: ${({ $on }) => ($on ? nocturne.lime : nocturne.greenDeep)};
  }
  .slash {
    position: absolute;
    width: 26px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
    transform: rotate(-45deg);
    box-shadow: 0 1.5px 0 0 ${({ $on }) => ($on ? nocturne.green : nocturne.surface3)};
  }

  @media (hover: hover) {
    &:hover {
      background-image: linear-gradient(${nocturne.ring}, ${nocturne.ring});
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
`;

const Button = styled.button<{ $tone: "go" | "publish" | "off" | "outline" }>`
  height: 52px;
  padding: 0 24px;
  flex-shrink: 0;
  white-space: nowrap;
  border-radius: 14px;
  border: ${({ $tone }) => ($tone === "outline" ? `1.5px solid ${nocturne.line}` : "0")};
  background: ${({ $tone }) =>
    $tone === "publish" ? nocturne.tan : $tone === "go" ? nocturne.green : $tone === "outline" ? nocturne.surface : nocturne.line2};
  color: ${({ $tone }) =>
    $tone === "publish" ? nocturne.ctaFg : $tone === "go" ? nocturne.onGreen : $tone === "outline" ? nocturne.cream : nocturne.muted3};
  font: inherit;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: ${({ $tone }) => ($tone === "off" ? "not-allowed" : "pointer")};
  ${ring}

  &:disabled {
    cursor: not-allowed;
  }
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background-image: linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08));
    }
  }
`;

const BackBtn = styled(Button).attrs({ $tone: "outline" as const })`
  padding: 0 20px;
  font-weight: 700;
  font-size: 15px;
`;

const Alert = styled.p<{ $tone?: "warn" }>`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $tone }) => ($tone === "warn" ? nocturne.muted : nocturne.danger)};
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(10, 38, 28, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
`;

const Dialog = styled.div<{ $w?: number }>`
  width: 100%;
  max-width: ${({ $w }) => $w ?? 400}px;
  max-height: 100%;
  overflow-y: auto;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  border-radius: 22px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 30px 80px -30px rgba(10, 38, 28, 0.6);
`;

const DialogHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  > span,
  > label {
    font-size: 17px;
    font-weight: 800;
  }
`;

const IconBtn = styled.button`
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: ${nocturne.surface3};
  color: ${nocturne.cream};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  ${ring}
`;

const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  text-align: center;

  .wd {
    font-size: 11px;
    font-weight: 700;
    color: ${nocturne.muted2};
    padding-bottom: 4px;
  }
`;

const Day = styled.button<{ $on: boolean; $today: boolean }>`
  height: 44px;
  border-radius: 12px;
  border: ${({ $on, $today }) => ($on ? "0" : $today ? `1.5px solid ${nocturne.green}` : "0")};
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface3)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $on, $today }) => ($on || $today ? 800 : 600)};
  padding: 0;
  cursor: pointer;
  ${ring}

  &:disabled {
    background: transparent;
    color: ${nocturne.muted3};
    cursor: default;
  }
`;

const Segments = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 3px;
  background: ${nocturne.surface3};
  border-radius: 12px;
`;

const Segment = styled.button<{ $on: boolean }>`
  height: 36px;
  border: 0;
  border-radius: 9px;
  background: ${({ $on }) => ($on ? nocturne.surface : "transparent")};
  box-shadow: ${({ $on }) => ($on ? `0 1px 2px rgba(15,59,44,.12), 0 0 0 1px ${nocturne.line}` : "none")};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 14px;
  font-weight: ${({ $on }) => ($on ? 800 : 600)};
  cursor: pointer;
  ${ring}
`;

const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
`;

const Slot = styled.button<{ $on: boolean }>`
  height: 42px;
  border-radius: 10px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  ${ring}

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const DialogFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid ${nocturne.line2};
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  height: 42px;
  border-radius: 12px;
  border: 1.5px solid ${nocturne.line};
  overflow: hidden;

  button {
    width: 40px;
    height: 100%;
    border: 0;
    background: transparent;
    color: ${nocturne.green};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  output {
    min-width: 72px;
    text-align: center;
    font-size: 15px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

const Solid = styled.button`
  height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  border: 0;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  ${ring}
`;

const Hollow = styled.button`
  height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1.5px solid ${nocturne.line};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  ${ring}
`;

const Money = styled.div`
  display: flex;
  align-items: stretch;
  height: 56px;
  border: 1.5px solid ${nocturne.green};
  border-radius: 14px;
  overflow: hidden;

  .unit {
    display: flex;
    align-items: center;
    padding: 0 16px;
    background: ${nocturne.surface3};
    font-weight: 800;
    color: ${nocturne.green};
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    padding: 0 16px;
    color: ${nocturne.cream};
  }
`;

const CarFields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;

  label {
    font-size: 14px;
    font-weight: 700;
  }
  > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
`;

const TextField = styled.input<{ $bad?: boolean; $plate?: boolean }>`
  height: 50px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1.5px solid ${({ $bad }) => ($bad ? nocturne.danger : nocturne.line)};
  background: ${nocturne.surface};
  font: inherit;
  font-size: 16px;
  font-weight: ${({ $plate }) => ($plate ? 800 : 600)};
  letter-spacing: ${({ $plate }) => ($plate ? "0.08em" : "normal")};
  color: ${nocturne.cream};
  outline: 0;
  box-sizing: border-box;
  ${ring}
`;

const Swatch = styled.button<{ $on: boolean; $sw: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 8px;
  border-radius: 19px;
  border: 1.5px solid ${({ $on }) => ($on ? nocturne.green : nocturne.line)};
  background: ${({ $on }) => ($on ? nocturne.surface2 : nocturne.surface)};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.cream};
  cursor: pointer;
  ${ring}

  i {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: ${({ $sw }) => $sw};
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
  }
`;

const Review = styled.section`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const CarLine = styled.p`
  margin: 0;
  font-size: clamp(18px, 1.8vw, 26px);
  line-height: 1.5;
  font-weight: 500;
  color: ${nocturne.muted};
  letter-spacing: -0.015em;

  button {
    text-decoration-thickness: 2px;
    text-underline-offset: 6px;
  }
`;

const EarnBar = styled.div`
  display: flex;
  align-items: center;
  gap: 24px 40px;
  flex-wrap: wrap;
  padding: 22px 26px;
  border-radius: 24px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  .sum {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 220px;
  }
  .lead {
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.onGreenMuted};
  }
  .total {
    font-size: clamp(28px, 3vw, 34px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: ${nocturne.lime};
  }
  .fine {
    font-size: 13px;
    color: ${nocturne.onGreenMuted};
  }
  .acts {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    flex-wrap: wrap;
  }
`;

const GhostOnGreen = styled.button`
  height: 56px;
  padding: 0 18px;
  border-radius: 28px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: ${nocturne.onGreen};
  font: inherit;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  ${ring}

  @media (hover: hover) {
    &:hover {
      border-color: #ffffff;
    }
  }
`;

const PublishBtn = styled.button`
  height: 56px;
  padding: 0 28px;
  border-radius: 28px;
  border: 0;
  background: ${nocturne.tan};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-weight: 800;
  font-size: 17px;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  cursor: pointer;
  ${ring}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background-image: linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12));
    }
  }
`;


/** One short line each, mark first: the terms of publishing, scanned not read. */
const Terms = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
    color: ${nocturne.cream};
  }
  li > svg {
    flex: none;
    color: ${nocturne.green};
  }
`;

export function PublishWeb({
  savedCar = null,
  publishBeforeApproval = false,
  driverName = "",
}: {
  savedCar?: SavedCar | null;
  publishBeforeApproval?: boolean;
  driverName?: string;
}) {
  const { kycStatus, requireKyc } = useAppMode();
  const verified = kycStatus === "approved";
  const submitted = kycStatus === "approved" || kycStatus === "pending";
  const [awaiting, setAwaiting] = useState(false);

  const initialCars: CarRow[] = savedCar
    ? [{ make: savedCar.make, model: savedCar.model, plate: savedCar.plate, color: savedCar.color ?? "" }]
    : [];

  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [cars, setCars] = useState<CarRow[]>(initialCars);
  const [carIndex, setCarIndex] = useState(initialCars.length > 0 ? 0 : -1);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [editFrom, setEditFrom] = useState(false);
  const [guessed, setGuessed] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<Period>("morning");
  const [adding, setAdding] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newColour, setNewColour] = useState("");
  const [addTried, setAddTried] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [fareOpen, setFareOpen] = useState(false);
  const [error, setError] = useState<{ text: string; fix?: "kyc" } | null>(null);
  const [pending, startTransition] = useTransition();
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const router = useRouter();
  const moved = useRef(false);

  useEffect(() => {
    const saved = loadDraft();
    let start = 0;
    if (saved) {
      const base = blankDraft();
      setDraft({
        from: saved.from ?? "",
        to: saved.to ?? "",
        date: saved.date ?? "",
        time: saved.time ?? "",
        seats: saved.seats ?? null,
        price: saved.price ?? "",
        prefs: { ...base.prefs, ...saved.prefs },
      });
      if (saved.time) setPeriod(periodOf(saved.time));
      if (saved.carMode === "none") {
        setCarIndex(-1);
      } else if (saved.plate && saved.plate !== savedCar?.plate) {
        const row = { make: saved.make ?? "", model: saved.model ?? "", plate: saved.plate, color: saved.color ?? "" };
        setCars((list) => [...list, row]);
        setCarIndex(initialCars.length);
      }
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
  }, [savedCar]);

  const car = carIndex >= 0 ? (cars[carIndex] ?? null) : null;

  useEffect(() => {
    if (!ready) return;
    saveDraft({
      ...draft,
      carMode: !car ? "none" : savedCar && car.plate === savedCar.plate ? "saved" : "new",
      make: car?.make ?? "",
      model: car?.model ?? "",
      plate: car?.plate ?? "",
      color: car?.color ?? "",
      step,
      maxStep,
    });
  }, [ready, draft, car, savedCar, step, maxStep]);

  useEffect(() => {
    if (!moved.current) return;
    sentenceRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Escape closes whichever dialog is open, from anywhere on the page.
  useEffect(() => {
    if (!calOpen && !timeOpen && !fareOpen && !adding) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setCalOpen(false);
      setTimeOpen(false);
      setFareOpen(false);
      if (adding) closeAdd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calOpen, timeOpen, fareOpen, adding]);

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  }

  function go(next: number) {
    moved.current = true;
    if (next !== step) window.history.pushState({ ...window.history.state, publishStep: next }, "");
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    setEditFrom(false);
    setQuery("");
    setAdding(false);
  }

  function back() {
    if (step === 0) return;
    const here = (window.history.state as { publishStep?: unknown } | null)?.publishStep;
    if (here === step) window.history.back();
    else go(step - 1);
  }

  function reset() {
    clearDraft();
    moved.current = true;
    setDraft((d) => ({ ...blankDraft(), from: d.from }));
    setCars(initialCars);
    setCarIndex(initialCars.length > 0 ? 0 : -1);
    setStep(0);
    setMaxStep(0);
    window.history.replaceState({ ...window.history.state, publishStep: 0 }, "");
    setError(null);
    setQuery("");
    setEditFrom(false);
    setAdding(false);
  }

  const choosingFrom = editFrom || !draft.from;
  const seats = draft.seats ?? 1;
  const fare = Number(draft.price) || 0;

  const valid = [
    !!draft.from && !!draft.to && draft.from.toLowerCase() !== draft.to.toLowerCase(),
    !!draft.date,
    !!draft.time,
    !!draft.seats,
    fare > 0,
    !adding,
    true,
    true,
  ][step];

  function problem(): string | null {
    if (draft.from.toLowerCase() === draft.to.toLowerCase()) return "Pick two different towns.";
    if (new Date(`${draft.date}T${draft.time}:00`).getTime() <= Date.now())
      return "That departure time has already passed. Pick a later one.";
    return null;
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
    startTransition(async () => {
      const result = await createTripAction({
        from_location: draft.from.trim(),
        to_location: draft.to.trim(),
        departure_date: draft.date,
        departure_time: draft.time,
        seats_total: seats,
        price_per_seat: fare,
        preferences: draft.prefs,
        vehicle_make: car?.make.trim() || undefined,
        vehicle_model: car?.model.trim() || undefined,
        vehicle_plate: car?.plate.trim() || undefined,
        vehicle_color: car?.color.trim() || undefined,
      });
      if (!result.ok) {
        setError({ text: result.error, fix: result.fix });
        return;
      }
      clearDraft();
      moved.current = true;
      // No confirmation page: it only restated the review that was just
      // approved, and the ride itself is the better place to land.
      router.push(result.awaiting ? "/trips" : `/ride/${result.id}`);
    });
  }

  function next() {
    if (!valid) return;
    if (step === 7) {
      publish();
      return;
    }
    go(step + 1);
  }

  function saveNewCar() {
    const words = newModel.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || !isPlate(newPlate) || !newColour) {
      setAddTried(true);
      return;
    }
    const titled = words.map((w) => w[0]!.toUpperCase() + w.slice(1));
    const row: CarRow = {
      make: titled[0]!,
      model: titled.slice(1).join(" ") || titled[0]!,
      plate: newPlate,
      color: newColour,
    };
    setCarIndex(cars.length);
    setCars([...cars, row]);
    setAdding(false);
    setNewModel("");
    setNewPlate("");
    setNewColour("");
    setAddTried(false);
  }

  function closeAdd() {
    setAdding(false);
    setNewModel("");
    setNewPlate("");
    setNewColour("");
    setAddTried(false);
  }

  // ── The sentence. It is the page: every answer lands in it, and every
  //    answered part stays clickable so nothing needs a separate edit screen.
  const reach = step;
  const filled = (text: string, target: number, label: string) => (
    <Filled key={`${label}-${text}`} type="button" onClick={() => go(target)} aria-label={`${label}: ${text}. Change it.`}>
      {text}
    </Filled>
  );
  const ask = (text: string) => <Asking key={text}>{text}</Asking>;

  const sentence: ReactNode[] = ["I’m driving from "];
  if (!draft.from) {
    sentence.push(ask("pick a town"));
  } else {
    sentence.push(
      <Filled
        key="from"
        type="button"
        onClick={() => {
          go(0);
          setEditFrom(true);
          setQuery("");
        }}
        aria-label={`Leaving from: ${draft.from}. Change it.`}
      >
        {draft.from}
      </Filled>,
    );
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

  const carSentence: ReactNode[] =
    draft.from && reach >= 5 && (step === 5 || car)
      ? [" Look for my ", car && maxStep > 5 ? filled(`${carName(car)}, ${car.plate}`, 5, "Car") : ask("which car?"), "."]
      : [];

  const searching = query.trim().length > 0;
  const towns = useMemo(() => {
    const other = choosingFrom ? draft.to : draft.from;
    if (searching) return searchTowns(query, 6).filter((t) => t.name !== other);
    const here = KENYAN_TOWNS.find((t) => t.name === draft.from);
    const runs = !choosingFrom && draft.from ? POPULAR_ROUTES.filter((r) => r.from === draft.from).map((r) => r.to) : [];
    return [...new Set([...runs, ...MAJOR])]
      .flatMap((name) => KENYAN_TOWNS.filter((t) => t.name === name))
      .filter((t) => t.name !== other && (choosingFrom || t.county !== here?.county))
      .slice(0, 6);
  }, [query, searching, choosingFrom, draft.from, draft.to]);

  const typed = query.trim().replace(/\s+/g, " ");
  const exactMatch = towns.some((t) => t.name.toLowerCase() === typed.toLowerCase());

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
    return { cells, today: iso(today), tomorrow: iso(plusDays(today, 1)) };
  }, []);

  const exact = draft.time || "07:30";
  const exactLabel = prettyTime(exact);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = draft.date === calendar.today;
  const def = PERIODS.find((p) => p.key === period)!;
  const slots: string[] = [];
  for (let h = def.from; h <= def.to; h++) for (const m of [0, 30]) slots.push(`${pad(h)}:${pad(m)}`);

  function setTime(time: string) {
    patch({ time });
    setPeriod(periodOf(time));
  }

  const laterDay = !!draft.date && draft.date !== calendar.today && draft.date !== calendar.tomorrow;
  const quickHit = QUICK_TIMES.includes(draft.time);
  const customFare = fare > 0 && !FARES.includes(fare);
  const reviewing = step === 7;

  // A chip answer moves the flow on by itself, so the button only earns its
  // place where there is nothing to tap, or where the driver is going back
  // over an answer they already gave.
  const showCta = step === 5 || step === 6 || (valid && step < maxStep);
  const ctaTone: "go" | "off" = valid ? "go" : "off";

  const plateBad = addTried && !isPlate(newPlate);
  const modelBad = addTried && !newModel.trim();
  const addError = addTried
    ? !newModel.trim()
      ? "Add the make and model."
      : !isPlate(newPlate)
        ? PLATE_ERROR
        : !newColour
          ? "Pick a colour so passengers can spot your car."
          : ""
    : "";

  const ruleViews = RULES.map((rule) => {
    const on = ruleOn(draft.prefs, rule);
    return {
      rule,
      on,
      chip: on ? rule.chipYes : rule.chipNo,
      good: ruleIsGood(rule, on),
      toggle: () => patch({ prefs: { ...draft.prefs, [rule.key]: !draft.prefs[rule.key] } }),
    };
  });

  const total = fare > 0 ? formatKes(fare * seats) : "—";

  return (
    <Page>
      <Layout>
        <Head>
          <HeadLeft>
            <StepPill>{reviewing ? `${STEPS.length}/${STEPS.length}` : `${step + 1}/${STEPS.length}`}</StepPill>
            <span className="what">{reviewing ? "Check and publish" : "Publish a ride"}</span>
          </HeadLeft>
          <Discard type="button" onClick={reset}>
            <TrashIcon />
            Discard draft
          </Discard>
        </Head>

        {(
          <Sentence ref={sentenceRef} tabIndex={-1} aria-live="polite">
            {sentence}
            {!reviewing && carSentence}
          </Sentence>
        )}

        {reviewing && (
          <Review>
            {carSentence.length > 0 && <CarLine>{carSentence}</CarLine>}

            <Row>
              {ruleViews.map((r) => (
                <RuleChip key={r.rule.key} type="button" $on={r.on} $h={44} aria-pressed={r.on} title="Tap to change" onClick={r.toggle}>
                  <span className="glyph">
                    <RuleGlyph icon={r.rule.icon} />
                    {!r.on && <span className="slash" aria-hidden />}
                  </span>
                  {r.chip}
                </RuleChip>
              ))}
            </Row>

            <Terms>
              <li>
                <Wallet size={22} />
                Paid after the trip, minus Kipita’s fee
              </li>
              <li>
                <ShieldCheck size={22} />
                Free to publish. Passengers pay to book
              </li>
              {/* Verification sits with the other terms of publishing rather
                  than in a banner of its own. The action lives on the page
                  button, so this line only states it. */}
              {kycStatus !== "approved" && (
                <li>
                  <SealCheck size={22} />
                  {submitted
                    ? "Verification in review. It goes live once this clears"
                    : "Drivers are verified before publishing"}
                </li>
              )}
            </Terms>

            {error && (
              <Alert role="alert">
                <Warning size={16} weight="bold" />
                {error.text}
                {error.fix === "kyc" && (
                  <Hollow type="button" onClick={() => requireKyc(sendTrip)} style={{ height: 36 }}>
                    Verify to publish
                  </Hollow>
                )}
              </Alert>
            )}

            <EarnBar>
              <div className="sum">
                <span className="lead">{seats === 1 ? "You could earn" : `You could earn with all ${seats} seats filled`}</span>
                <span className="total">{total}</span>
                <span className="fine">Before Kipita’s fee · paid after the trip · free to publish</span>
              </div>
              <div className="acts">
                <GhostOnGreen type="button" onClick={back}>
                  <CaretLeft size={16} weight="bold" />
                  Back
                </GhostOnGreen>
                <PublishBtn type="button" onClick={publish} disabled={pending} aria-busy={pending}>
                  {pending && <ButtonOrb job="committing" />}
                  {pending ? "Publishing" : submitted ? "Publish ride" : "Verify to publish"}
                  {!pending && <ArrowRight size={20} weight="bold" />}
                </PublishBtn>
              </div>
            </EarnBar>
          </Review>
        )}

        {!reviewing && (
          <Step key={step}>
            {step === 0 && (
              <>
                <Field>
                  <FieldHead>
                    <label htmlFor="town">{choosingFrom ? "Where are you leaving from?" : "Where are you going?"}</label>
                    {editFrom && (
                      <Discard type="button" onClick={() => { setEditFrom(false); setQuery(""); }}>
                        Cancel
                      </Discard>
                    )}
                  </FieldHead>
                  <Search>
                    <MagnifyingGlass size={20} weight="bold" />
                    <input
                      id="town"
                      value={query}
                      autoComplete="off"
                      placeholder="Search a town or city"
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Search>
                </Field>
                <Field>
                  <Eyebrow>
                    {searching ? "Matches" : choosingFrom ? "Towns" : `Popular from ${draft.from.replace(" CBD", "")}`}
                  </Eyebrow>
                  <Row>
                    {searching && typed.length > 1 && !exactMatch && (
                      <Chip type="button" onClick={() => pickTown(typed.replace(/\b\w/g, (c) => c.toUpperCase()))}>
                        Use “{typed}”
                      </Chip>
                    )}
                    {towns.map((t) => (
                      <Chip
                        key={t.name}
                        type="button"
                        $on={!choosingFrom && draft.to === t.name}
                        onClick={() => pickTown(t.name)}
                      >
                        {t.name}
                      </Chip>
                    ))}
                  </Row>
                  {guessed && !editFrom && draft.from && (
                    <Alert $tone="warn">Starting from {draft.from}. Tap it in the sentence to change.</Alert>
                  )}
                </Field>
              </>
            )}

            {step === 1 && (
              <Field>
                <FieldHead>
                  <span>Day</span>
                </FieldHead>
                <Row>
                  <Chip
                    type="button"
                    $on={draft.date === calendar.today}
                    aria-pressed={draft.date === calendar.today}
                    onClick={() => { patch({ date: calendar.today }); go(2); }}
                  >
                    Today
                  </Chip>
                  <Chip
                    type="button"
                    $on={draft.date === calendar.tomorrow}
                    aria-pressed={draft.date === calendar.tomorrow}
                    onClick={() => { patch({ date: calendar.tomorrow }); go(2); }}
                  >
                    Tomorrow
                  </Chip>
                  <Chip type="button" $on={laterDay} aria-pressed={laterDay} onClick={() => setCalOpen(true)}>
                    <CalendarBlank size={16} weight="bold" />
                    {laterDay ? pillDay(draft.date) : "Pick a date"}
                  </Chip>
                </Row>
              </Field>
            )}

            {step === 2 && (
              <Field>
                <FieldHead>
                  <span>Time</span>
                </FieldHead>
                <Row>
                  {QUICK_TIMES.map((t) => (
                    <Chip
                      key={t}
                      type="button"
                      $on={draft.time === t}
                      disabled={isToday && minutes(t) <= nowMin + 15}
                      onClick={() => { setTime(t); go(3); }}
                    >
                      {prettyTime(t)}
                    </Chip>
                  ))}
                  <Chip
                    type="button"
                    $on={!!draft.time && !quickHit}
                    aria-pressed={!!draft.time && !quickHit}
                    onClick={() => setTimeOpen(true)}
                  >
                    <Clock size={16} weight="bold" />
                    {draft.time && !quickHit ? prettyTime(draft.time) : "Other time"}
                  </Chip>
                </Row>
              </Field>
            )}

            {step === 3 && (
              <Field>
                <FieldHead>
                  <span>Seats you’re offering</span>
                </FieldHead>
                <Row>
                  {SEATS.map((n) => (
                    <SeatChip
                      key={n}
                      type="button"
                      $on={draft.seats === n}
                      aria-label={`${n} ${n === 1 ? "seat" : "seats"}`}
                      onClick={() => { patch({ seats: n }); go(4); }}
                    >
                      {n}
                    </SeatChip>
                  ))}
                </Row>
              </Field>
            )}

            {step === 4 && (
              <Field>
                <FieldHead>
                  <span>Price per seat</span>
                </FieldHead>
                <Row>
                  {FARES.map((f) => (
                    <Chip key={f} type="button" $on={fare === f} onClick={() => { patch({ price: String(f) }); go(5); }}>
                      {formatKes(f)}
                    </Chip>
                  ))}
                  <Chip type="button" $on={customFare} onClick={() => setFareOpen(true)}>
                    {customFare ? formatKes(fare) : "Other amount"}
                  </Chip>
                </Row>
              </Field>
            )}

            {step === 5 && (
              <Field>
                <FieldHead>
                  <span>Which car are you driving?</span>
                </FieldHead>
                <Row>
                  {cars.map((c, i) => (
                    <CarChip key={c.plate} type="button" $on={carIndex === i} onClick={() => setCarIndex(i)}>
                      <span className="bubble">
                        <CarGlyph />
                      </span>
                      <span className="text">
                        <span className="name">{carName(c)}</span>
                        <span className="plate">{c.plate}</span>
                      </span>
                      <Radio $on={carIndex === i} aria-hidden>
                        <i />
                      </Radio>
                    </CarChip>
                  ))}
                  <AddCar type="button" onClick={() => { setAdding(true); setAddTried(false); }}>
                    <Plus size={18} weight="bold" />
                    Add a car
                  </AddCar>
                </Row>
                {cars.length === 0 && (
                  <Alert $tone="warn">A ride without a car still publishes, but passengers find you faster with one.</Alert>
                )}
              </Field>
            )}

            {step === 6 && (
              <Field>
                <FieldHead>
                  <span>Tap to change what passengers see</span>
                </FieldHead>
                <Row>
                  {ruleViews.map((r) => (
                    <RuleChip key={r.rule.key} type="button" $on={r.on} aria-pressed={r.on} onClick={r.toggle}>
                      <span className="glyph">
                        <RuleGlyph icon={r.rule.icon} />
                        {!r.on && <span className="slash" aria-hidden />}
                      </span>
                      {r.chip}
                    </RuleChip>
                  ))}
                </Row>
              </Field>
            )}

            {error && (
              <Alert role="alert">
                <Warning size={16} weight="bold" />
                {error.text}
              </Alert>
            )}

            <Actions>
              {step > 0 && (
                <BackBtn type="button" onClick={back}>
                  <CaretLeft size={18} weight="bold" />
                  Back
                </BackBtn>
              )}
              {showCta && (
                <Button type="button" $tone={ctaTone} disabled={!valid} onClick={next}>
                  Continue
                  <ArrowRight size={18} weight="bold" />
                </Button>
              )}
            </Actions>
          </Step>
        )}

      </Layout>

      {calOpen && (
        <Backdrop onClick={() => setCalOpen(false)}>
          <Dialog role="dialog" aria-modal="true" aria-label="Pick a date" onClick={(e) => e.stopPropagation()}>
            <DialogHead>
              <span>Pick a date</span>
              <IconBtn type="button" aria-label="Close" onClick={() => setCalOpen(false)}>
                <X size={16} weight="bold" />
              </IconBtn>
            </DialogHead>
            <DayGrid>
              {WEEKDAYS.map((w) => (
                <div key={w} className="wd" aria-hidden>
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
                  onClick={() => { patch({ date: c.iso }); setCalOpen(false); go(2); }}
                >
                  {c.day}
                </Day>
              ))}
            </DayGrid>
            <Alert $tone="warn">Rides can be posted up to three weeks ahead.</Alert>
          </Dialog>
        </Backdrop>
      )}

      {timeOpen && (
        <Backdrop onClick={() => setTimeOpen(false)}>
          <Dialog role="dialog" aria-modal="true" aria-label="Pick a time" onClick={(e) => e.stopPropagation()}>
            <DialogHead>
              <span>Pick a time</span>
              <IconBtn type="button" aria-label="Close" onClick={() => setTimeOpen(false)}>
                <X size={16} weight="bold" />
              </IconBtn>
            </DialogHead>
            <Segments role="tablist" aria-label="Part of the day">
              {PERIODS.map((p) => (
                <Segment key={p.key} type="button" role="tab" aria-selected={period === p.key} $on={period === p.key} onClick={() => setPeriod(p.key)}>
                  {p.label}
                </Segment>
              ))}
            </Segments>
            <SlotGrid>
              {slots.map((s) => (
                <Slot
                  key={s}
                  type="button"
                  $on={draft.time === s}
                  disabled={isToday && minutes(s) <= nowMin + 15}
                  onClick={() => setTime(s)}
                >
                  {prettyTime(s).replace(/ (am|pm)$/, "")}
                </Slot>
              ))}
            </SlotGrid>
            <DialogFoot>
              <Stepper role="group" aria-label="Exact time">
                <button type="button" aria-label="5 minutes earlier" onClick={() => setTime(fromMinutes(minutes(exact) - 5))}>
                  <Minus size={14} weight="bold" />
                </button>
                <output aria-live="polite">{exactLabel}</output>
                <button type="button" aria-label="5 minutes later" onClick={() => setTime(fromMinutes(minutes(exact) + 5))}>
                  <Plus size={14} weight="bold" />
                </button>
              </Stepper>
              <Solid
                type="button"
                onClick={() => {
                  if (!draft.time) setTime(exact);
                  setTimeOpen(false);
                  go(3);
                }}
              >
                Done
              </Solid>
            </DialogFoot>
          </Dialog>
        </Backdrop>
      )}

      {fareOpen && (
        <Backdrop onClick={() => setFareOpen(false)}>
          <Dialog $w={380} role="dialog" aria-modal="true" aria-label="Your price per seat" onClick={(e) => e.stopPropagation()}>
            <DialogHead>
              <label htmlFor="fare">Your price per seat</label>
            </DialogHead>
            <Money>
              <span className="unit">KES</span>
              <input
                id="fare"
                autoFocus
                inputMode="numeric"
                placeholder="Enter amount"
                value={fare > 0 ? fare.toLocaleString("en-US") : ""}
                onChange={(e) => patch({ price: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              />
            </Money>
            <DialogFoot style={{ justifyContent: "flex-end", borderTop: 0, paddingTop: 0 }}>
              <Hollow type="button" onClick={() => setFareOpen(false)}>
                Cancel
              </Hollow>
              <Solid
                type="button"
                onClick={() => {
                  if (fare <= 0) return;
                  setFareOpen(false);
                  go(5);
                }}
              >
                Use this price
              </Solid>
            </DialogFoot>
          </Dialog>
        </Backdrop>
      )}

      {adding && (
        <Backdrop onClick={closeAdd}>
          <Dialog $w={520} role="dialog" aria-modal="true" aria-label="Add a car" onClick={(e) => e.stopPropagation()}>
            <DialogHead>
              <span>Add a car</span>
              <IconBtn type="button" aria-label="Cancel adding a car" onClick={closeAdd}>
                <X size={18} weight="bold" />
              </IconBtn>
            </DialogHead>
            <CarFields>
              <div>
                <label htmlFor="carModel">Make and model</label>
                <TextField
                  id="carModel"
                  value={newModel}
                  placeholder="Toyota Fielder"
                  autoComplete="off"
                  $bad={modelBad}
                  onChange={(e) => setNewModel(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="carPlate">Number plate</label>
                <TextField
                  id="carPlate"
                  value={newPlate}
                  placeholder={PLATE_EXAMPLE}
                  autoComplete="off"
                  maxLength={8}
                  $plate
                  $bad={plateBad}
                  onChange={(e) => setNewPlate(formatPlate(e.target.value))}
                />
              </div>
            </CarFields>
            <Field>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Colour</span>
              <Row>
                {COLOURS.map((c) => (
                  <Swatch
                    key={c.label}
                    type="button"
                    $on={newColour === c.label}
                    $sw={c.swatch}
                    aria-pressed={newColour === c.label}
                    onClick={() => setNewColour(c.label)}
                  >
                    <i aria-hidden />
                    {c.label}
                  </Swatch>
                ))}
              </Row>
            </Field>
            {addError && (
              <Alert role="alert">
                <Warning size={16} weight="bold" />
                {addError}
              </Alert>
            )}
            <DialogFoot style={{ justifyContent: "flex-end" }}>
              <Hollow type="button" onClick={closeAdd}>
                Cancel
              </Hollow>
              <Solid type="button" onClick={saveNewCar}>
                Save car
              </Solid>
            </DialogFoot>
          </Dialog>
        </Backdrop>
      )}
    </Page>
  );
}
