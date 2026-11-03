"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import people from "../../public/landing/people-left.png";
import styled, { css, keyframes } from "styled-components";
import { KENYAN_TOWNS, POPULAR_ROUTES, searchTowns } from "@kipita/shared";
import {
  ArrowRight,
  CalendarBlank,
  Check,
  HandCoins,
  MagnifyingGlass,
  MapPin,
  Minus,
  Plus,
  SealCheck,
  ShieldCheck,
  Warning,
} from "@/components/icons";
import { useAppMode } from "@/components/nav/AppShell";
import { RollingNumber } from "@/components/ui/Counter";
import { nocturne } from "@/lib/nocturne";
import { formatKes } from "@/lib/rides";
import { createTripAction } from "@/lib/home/posts";
import { detectOrigin } from "@/lib/home/geo";
import type { RidePreferences } from "@/lib/ride-detail";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { DatePicker, TimePicker, prettyTime, todayISO } from "./WhenPicker";
import {
  BareField,
  BareInput,
  Choice,
  Choices,
  EditorLabel,
  CommitAction,
  Cross,
  LongArrow,
  Row,
  RULE,
  TextAction,
} from "./controls";

type Slot = "from" | "to" | "date" | "time" | "seats" | "fare" | "car";

export type SavedCar = {
  make: string;
  model: string;
  plate: string;
  color?: string;
};

type PrefKey = keyof RidePreferences;

/** The draft always has an answer for every preference, unlike a stored ride. */
type Prefs = Record<PrefKey, boolean>;

const PREF_ORDER: PrefKey[] = [
  "no_smoking",
  "pets",
  "luggage",
  "music",
  "silent_ride",
];

/** Each preference reads as a clause either way, so the line is always a sentence. */
const PREF_WORDS: Record<PrefKey, { on: string; off: string }> = {
  no_smoking: { on: "No smoking", off: "Smoking is fine" },
  pets: { on: "pets welcome", off: "no pets" },
  luggage: { on: "luggage fits", off: "no luggage" },
  music: { on: "music on", off: "no music" },
  silent_ride: { on: "a quiet ride", off: "chat welcome" },
};

const CAR_COLORS = [
  "White",
  "Silver",
  "Black",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Gold",
];

type Draft = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: string;
  make: string;
  model: string;
  plate: string;
  color: string;
  prefs: Prefs;
};

const FARES = [500, 800, 1200, 1600, 2000];
const ORDER: Slot[] = ["to", "from", "date", "time", "fare"];
const MAJOR = [
  "Nanyuki",
  "Nairobi",
  "Nyeri",
  "Nakuru",
  "Mombasa",
  "Eldoret",
  "Thika",
  "Naivasha",
  "Kisumu",
];

const TITLES: Record<Slot, string> = {
  from: "Where are you leaving from?",
  to: "Where are you going?",
  date: "Which day?",
  time: "What time do you leave?",
  seats: "How many seats?",
  fare: "What does a seat cost?",
  car: "Your car (optional)",
};

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function prettyDate(value: string) {
  if (!value) return "";
  if (value === todayISO()) return "today";
  if (value === plusDays(1)) return "tomorrow";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const land = keyframes`
  from { opacity: 0; transform: translateY(0.18em); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(40px, 7vh, 88px) max(22px, calc((100% - 880px) / 2)) 140px;
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (min-width: 1240px) {
    padding-inline: max(22px, calc((100% - 1080px) / 2));
  }
  @media (min-width: 1600px) {
    padding-inline: max(22px, calc((100% - 1260px) / 2));
  }
  @media (max-width: 640px) {
    padding: 20px 18px calc(120px + env(safe-area-inset-bottom));
  }
`;

const Sentence = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(29px, 5vw, 58px);
  font-weight: 500;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: ${nocturne.inkSoft};
  text-wrap: pretty;

  @media (min-width: 1400px) {
    font-size: clamp(58px, 4.4vw, 82px);
    line-height: 1.16;
  }
`;

const CarLine = styled.p`
  margin: clamp(26px, 3.4vh, 36px) 0 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(19px, 2.2vw, 27px);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: ${nocturne.inkSoft};
`;

const tokenBase = css`
  display: inline;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
  transition:
    color 0.16s ease,
    text-decoration-color 0.16s ease,
    text-decoration-thickness 0.16s ease;

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  &:active {
    color: ${nocturne.inkHover};
  }
`;

const Value = styled.button<{ $live: boolean }>`
  ${tokenBase}
  color: ${nocturne.ink};
  font-weight: 800;
  text-decoration-line: underline;
  text-decoration-thickness: ${({ $live }) => ($live ? "0.07em" : "0.05em")};
  text-underline-offset: 0.16em;
  text-decoration-skip-ink: none;
  text-decoration-color: ${({ $live }) =>
    $live ? nocturne.ink : "color-mix(in oklab, var(--n-ink) 55%, transparent)"};

  @media (hover: hover) {
    &:hover {
      text-decoration-thickness: 0.07em;
      text-decoration-color: ${nocturne.ink};
      color: ${nocturne.inkHover};
    }
  }

  > span {
    animation: ${land} 0.28s ease-out;
  }
`;

const Blank = styled.button<{ $live: boolean }>`
  ${tokenBase}
  display: inline-flex;
  align-items: baseline;
  gap: 0.14em;
  color: ${nocturne.ink};
  font-weight: 800;

  .gap {
    display: inline-block;
    width: 2.6em;
    height: 0.78em;
    border-bottom: 0.075em solid
      ${({ $live }) =>
        $live
          ? nocturne.ink
          : "color-mix(in oklab, var(--n-ink) 62%, transparent)"};
    transition: border-color 0.16s ease;
  }

  @media (hover: hover) {
    &:hover .gap {
      border-bottom-color: ${nocturne.ink};
    }
    &:hover {
      color: ${nocturne.inkHover};
    }
  }
`;

const PrefLine = styled.p`
  margin: 7px 0 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(19px, 2.2vw, 27px);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: ${nocturne.inkSoft};
`;

const Pref = styled.button<{ $on: boolean }>`
  ${tokenBase}
  color: ${({ $on }) => ($on ? nocturne.ink : nocturne.muted)};
  font-weight: ${({ $on }) => ($on ? 800 : 600)};
  text-decoration-line: underline;
  text-decoration-style: ${({ $on }) => ($on ? "solid" : "dotted")};
  text-decoration-thickness: ${({ $on }) => ($on ? "0.06em" : "0.05em")};
  text-underline-offset: 0.16em;
  text-decoration-skip-ink: none;
  text-decoration-color: ${({ $on }) =>
    $on ? nocturne.ink : "color-mix(in oklab, var(--n-muted) 70%, transparent)"};

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.ink};
      text-decoration-thickness: 0.08em;
      text-decoration-color: ${nocturne.ink};
    }
  }
`;

const Money = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 54ch;
  margin: 0;
  padding: 22px 0 0;
  border-top: 1.5px solid ${RULE};
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.accent};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    color: ${nocturne.cream};
    font-weight: 800;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  b > span {
    vertical-align: -0.26em;
  }
`;

const Editor = styled.section`
  margin-top: clamp(34px, 5vh, 54px);
  animation: ${rise} 0.22s ease-out;

  &:focus {
    outline: none;
  }
`;

const Close = styled.button`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-right: -10px;
  border: none;
  background: transparent;
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    color 0.16s ease,
    transform 0.18s ease;

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.green};
      transform: rotate(90deg);
    }
  }
  &:active {
    transform: rotate(90deg) scale(0.9);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const Search = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  padding-bottom: 6px;
  border-bottom: 2px solid ${RULE};
  cursor: text;

  svg {
    flex: none;
    color: ${nocturne.muted};
  }
  input {
    width: 100%;
    padding: 10px 0;
    border: none;
    background: transparent;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
  }
  input::placeholder {
    color: ${nocturne.muted2};
    font-weight: 500;
  }
  input:focus {
    outline: none;
  }
  &:hover,
  &:focus-within {
    border-bottom-color: ${nocturne.accent};
  }
`;

const Hint = styled.p`
  margin: 18px 0 8px;
  font-size: 15px;
  color: ${nocturne.muted};
`;

const Seats = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto !important;

  output {
    min-width: 2ch;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 42px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
  > span {
    font-size: 16px;
    color: ${nocturne.muted};
  }
`;

const Round = styled.button`
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1.5px solid ${RULE};
  border-radius: 8px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    transform 0.12s ease;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.surface2};
      border-color: ${nocturne.accent};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.94);
    background: ${nocturne.surface3};
  }
  &:disabled {
    color: ${nocturne.muted2};
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
    border-color: ${nocturne.accent};
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  max-width: 520px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Narrow = styled.div`
  max-width: 260px;
  margin-top: 18px;
`;

const Finish = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 26px;
  margin-top: clamp(34px, 6vh, 60px);

  > * {
    margin: 0;
  }

  @media (max-width: 640px) {
    align-self: stretch;
    gap: 24px;
  }
`;

const Act = styled.div`
  flex: 0 0 auto;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const Gate = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 54ch;

  > svg {
    flex: none;
    margin-top: 3px;
    color: ${nocturne.accent};
  }

  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
  p b {
    display: block;
    margin-bottom: 3px;
    font-size: 17px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 60px;
  padding: 0 34px;
  border: none;
  border-radius: 999px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  transition:
    color 0.16s ease 0.34s,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.24s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${nocturne.green};
    clip-path: circle(0% at 50% 50%);
    transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  svg {
    overflow: visible;
  }
  svg .shaft {
    transform-origin: 0% 50%;
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  svg .head {
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @media (hover: hover) {
    &:hover:not(:disabled)::before {
      clip-path: circle(72% at 50% 50%);
    }
    &:hover:not(:disabled) {
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px
        color-mix(in oklab, var(--n-green) 80%, transparent);
    }
    &:hover:not(:disabled) svg .shaft {
      transform: scaleX(1.55);
    }
    &:hover:not(:disabled) svg .head {
      transform: translateX(5px);
    }
  }
  &:active:not(:disabled)::before {
    clip-path: circle(72% at 50% 50%);
    transition: clip-path 0.24s cubic-bezier(0.3, 0, 0.2, 1);
  }
  &:active:not(:disabled) {
    color: ${nocturne.onGreen};
    transition-delay: 0s;
    transform: translateY(1px);
    box-shadow: none;
  }
  &:active:not(:disabled) svg .head {
    transform: translateX(10px);
  }
  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
    &:hover:not(:disabled)::before {
      clip-path: circle(100% at 50% 50%);
    }
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
    svg .shaft,
    svg .head {
      transition: none;
    }
  }

  @media (max-width: 640px) {
    width: 100%;
    min-height: 62px;
  }
`;

const Note = styled.p`
  margin: 12px 0 0;
  max-width: 32ch;
  font-size: 14px;
  line-height: 1.45;
  color: ${nocturne.muted2};
`;

const Err = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 54ch;

  > svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.ctaBg};
  }
  > div {
    min-width: 0;
  }
  p {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.5;
    color: ${nocturne.cream};
  }
  button {
    margin-top: 14px;
  }
`;

const Guess = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  font-size: 15px;
  color: ${nocturne.muted2};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Said = styled.strong`
  color: ${nocturne.cream};
  font-weight: 800;
`;

const Glue = styled.span`
  white-space: nowrap;
`;

const Ticket = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 26px 0 0;
  padding: clamp(22px, 3vw, 32px);
  border-radius: 24px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  .route {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(27px, 3.6vw, 44px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .route svg {
    flex: none;
    color: ${nocturne.lime};
  }
  .when {
    margin-top: 6px;
    font-size: clamp(18px, 2vw, 22px);
    font-weight: 700;
  }
  .seats {
    font-size: 16px;
    color: ${nocturne.onGreenMuted};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 20px;
  margin-top: 32px;
`;

const Share = styled.a`
  display: inline-flex;
  align-items: center;
  min-height: 60px;
  padding: 0 26px;
  border-radius: 999px;
  background: transparent;
  color: ${nocturne.cream};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1.5px ${RULE};

  &:hover {
    box-shadow: inset 0 0 0 1.5px ${nocturne.accent};
    background: ${nocturne.surface2};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Crew = styled.div`
  width: min(300px, 70%);
  margin: clamp(24px, 4vh, 40px) auto 0;
  pointer-events: none;

  @media (min-width: 900px) {
    width: 100%;
    margin: 0;
  }
`;

const Body = styled.div`
  min-width: 0;
`;

const Live = styled.div`
  display: grid;
  gap: clamp(24px, 4vw, 56px);
  align-items: center;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) minmax(240px, 360px);
  }

  .tick {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    margin-bottom: 22px;
    border-radius: 999px;
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
  }
  h2 {
    margin: 0;
    font-size: clamp(2.1rem, 5vw, 3.2rem);
    font-weight: 800;
    line-height: 1.02;
    letter-spacing: -0.042em;
    color: ${nocturne.cream};
  }
  p {
    max-width: 44ch;
    margin: 20px 0 0;
    font-size: 17px;
    line-height: 1.6;
    color: ${nocturne.muted};
  }
`;

function TownPicker({
  value,
  other,
  origin,
  takeFocus,
  onPick,
}: {
  value: string;
  other: string;
  origin: string;
  takeFocus: boolean;
  onPick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (takeFocus) ref.current?.focus();
  }, [takeFocus]);

  const searching = query.trim().length > 0;

  const list = useMemo(() => {
    if (searching) {
      return searchTowns(query, 6).filter((t) => t.name !== other);
    }
    const here = KENYAN_TOWNS.find((t) => t.name === origin);
    const runs = origin
      ? POPULAR_ROUTES.filter((r) => r.from === origin).map((r) => r.to)
      : [];
    const names = [...new Set([...runs, ...MAJOR])];
    return names
      .flatMap((name) => {
        const town = KENYAN_TOWNS.find((t) => t.name === name);
        return town ? [town] : [];
      })
      .filter((t) => t.name !== other && t.county !== here?.county)
      .slice(0, 6);
  }, [query, searching, other, origin]);

  return (
    <div>
      <Search>
        <MagnifyingGlass size={20} aria-hidden />
        <input
          ref={ref}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a town"
          aria-label="Search for a town"
          autoComplete="off"
          spellCheck={false}
        />
      </Search>
      <Choices style={{ marginTop: 16 }}>
        {list.map((town) => (
          <Choice
            key={town.name}
            type="button"
            $on={town.name === value}
            onClick={() => onPick(town.name)}
          >
            {town.name}
            {searching && town.county !== town.name && (
              <small>, {town.county}</small>
            )}
          </Choice>
        ))}
      </Choices>
      {list.length === 0 && <Hint>No town matches “{query.trim()}”.</Hint>}
    </div>
  );
}

export function PublishDeclaration({
  savedCar = null,
}: {
  savedCar?: SavedCar | null;
}) {
  const router = useRouter();
  const { driverReady, requireKyc } = useAppMode();
  const [draft, setDraft] = useState<Draft>({
    from: "",
    to: "",
    date: "",
    time: "",
    seats: 3,
    price: "",
    make: savedCar?.make ?? "",
    model: savedCar?.model ?? "",
    plate: savedCar?.plate ?? "",
    color: savedCar?.color ?? "",
    prefs: {
      luggage: true,
      pets: false,
      silent_ride: false,
      music: true,
      no_smoking: true,
    },
  });
  const [active, setActive] = useState<Slot | null>("to");
  const [touched, setTouched] = useState(false);
  const [guessed, setGuessed] = useState(false);
  const [calendar, setCalendar] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    detectOrigin(abort.signal)
      .then((origin) => {
        if (!origin) return;
        setDraft((d) => (d.from ? d : { ...d, from: origin.town.name }));
        setGuessed(true);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, []);
  const [error, setError] = useState<{ text: string; fix?: "kyc" } | null>(
    null,
  );
  const [doneId, setDoneId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || active === "from" || active === "to") return;
    editorRef.current?.focus({ preventScroll: true });
  }, [active]);

  const filledIn = (d: Draft, slot: Slot) => {
    if (slot === "from") return d.from !== "";
    if (slot === "to") return d.to !== "";
    if (slot === "date") return d.date !== "";
    if (slot === "time") return d.time !== "";
    if (slot === "fare") return Number(d.price) > 0;
    if (slot === "car") return d.plate.trim() !== "";
    return true;
  };

  const filled = (slot: Slot) => filledIn(draft, slot);

  const blanks = ORDER.filter((slot) => !filled(slot));
  const earnings =
    Number(draft.price) > 0 ? Number(draft.price) * draft.seats : 0;

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  }

  function open(slot: Slot) {
    setActive(slot);
    setTouched(true);
  }

  function advance(from: Slot, just?: Partial<Draft>) {
    const after = { ...draft, ...just };
    const isBlank = (slot: Slot) => !filledIn(after, slot);
    const index = ORDER.indexOf(from);
    const next =
      ORDER.slice(index + 1).find(isBlank) ?? ORDER.find(isBlank) ?? null;
    if (!next) {
      setActive(null);
      return;
    }
    if (next === from) return;
    open(next);
  }

  function problem(): string | null {
    if (draft.from.toLowerCase() === draft.to.toLowerCase())
      return "Pick two different towns.";
    if (draft.date === todayISO()) {
      const [h, m] = draft.time.split(":").map(Number);
      const now = new Date();
      if (h * 60 + m <= now.getHours() * 60 + now.getMinutes())
        return "That time has already passed today. Pick a later one.";
    }
    const anyCar = draft.make.trim() || draft.model.trim() || draft.plate.trim();
    if (anyCar) {
      if (!draft.make.trim()) return "Add the car make.";
      if (!draft.model.trim()) return "Add the car model.";
      if (draft.plate.trim().length < 4)
        return "Add the number plate so passengers can find you.";
    }
    return null;
  }

  function publish() {
    if (blanks.length > 0) {
      open(blanks[0]!);
      return;
    }
    const wrong = problem();
    if (wrong) {
      setError({ text: wrong });
      return;
    }
    if (!driverReady) {
      requireKyc();
      return;
    }
    startTransition(async () => {
      const result = await createTripAction({
        from_location: draft.from.trim(),
        to_location: draft.to.trim(),
        departure_date: draft.date,
        departure_time: draft.time,
        seats_total: draft.seats,
        price_per_seat: Number(draft.price),
        preferences: draft.prefs,
        vehicle_make: draft.make.trim() || undefined,
        vehicle_model: draft.model.trim() || undefined,
        vehicle_plate: draft.plate.trim() || undefined,
        vehicle_color: draft.color.trim() || undefined,
      });
      if (!result.ok) {
        setError({ text: result.error, fix: result.fix });
        return;
      }
      setDoneId(result.id);
    });
  }

  if (doneId) {
    const link =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/ride/${doneId}`;
    const shareText = `I'm driving ${draft.from} to ${draft.to} ${prettyDate(
      draft.date,
    )} at ${prettyTime(draft.time)}. ${draft.seats} ${
      draft.seats === 1 ? "seat" : "seats"
    } at ${formatKes(Number(draft.price))} each on Kipita. ${link}`;

    return (
      <Page>
        <Live>
          <Body>
          <span className="tick" aria-hidden>
            <Check size={26} />
          </span>
          <h2>Your ride is live</h2>

          <Ticket>
            <span className="route">
              {draft.from} <ArrowRight size={28} aria-hidden /> {draft.to}
            </span>
            <span className="when">
              {prettyDate(draft.date)} at {prettyTime(draft.time)}
            </span>
            <span className="seats">
              {draft.seats} {draft.seats === 1 ? "seat" : "seats"} at{" "}
              {formatKes(Number(draft.price))} each
            </span>
          </Ticket>

          <p>
            Passengers searching this road can see it now. We will tell you the
            moment someone books.
          </p>

          <Actions>
            <Primary type="button" onClick={() => router.push(`/ride/${doneId}`)}>
              View your ride <LongArrow size={32} />
            </Primary>
            <Share
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send it to a WhatsApp group
            </Share>
          </Actions>
          </Body>

          <Crew aria-hidden>
            <Image
              src={people}
              alt=""
              sizes="(max-width: 900px) 300px, 360px"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </Crew>
        </Live>
      </Page>
    );
  }

  const tok = (slot: Slot, label: string) =>
    filled(slot) ? (
      <Value
        key={`${slot}-v`}
        type="button"
        $live={active === slot}
        aria-label={`${TITLES[slot]} Currently ${label}. Change it.`}
        onClick={() => open(slot)}
      >
        <span>{label}</span>
      </Value>
    ) : (
      <Blank
        key={`${slot}-b`}
        type="button"
        $live={active === slot}
        aria-label={TITLES[slot]}
        onClick={() => open(slot)}
      >
        ?<span className="gap" aria-hidden />
      </Blank>
    );

  const hasCar = draft.plate.trim() !== "";
  const relativeDay = draft.date === todayISO() || draft.date === plusDays(1);
  const done = blanks.length === 0;
  const last: Slot = shownSlot("fare")
    ? "fare"
    : shownSlot("time")
      ? "time"
      : shownSlot("date")
        ? "date"
        : "to";

  function shownSlot(slot: Slot) {
    if (filled(slot) || active === slot) return true;
    return ORDER.indexOf(slot) < ORDER.indexOf(blanks[0] ?? "fare");
  }

  function shown(slot: Slot) {
    if (filled(slot) || active === slot) return true;
    return ORDER.indexOf(slot) < ORDER.indexOf(blanks[0] ?? "fare");
  }

  return (
    <Page>
      <Sentence>
        I’m driving{" "}
        {shown("from") && <>from {tok("from", draft.from)} </>}
        to{" "}
        <Glue>
          {tok("to", draft.to)}
          {last === "to" ? "." : ""}
        </Glue>
        {shown("date") && (
          <>
            {relativeDay ? " " : " on "}
            <Glue>
              {tok("date", prettyDate(draft.date))}
              {last === "date" ? "." : ""}
            </Glue>
          </>
        )}
        {shown("time") && (
          <>
            {" at "}
            <Glue>
              {tok("time", prettyTime(draft.time))}
              {last === "time" ? "." : ","}
            </Glue>
          </>
        )}
        {shown("fare") && (
          <>
            {" with "}
            {tok("seats", String(draft.seats))}{" "}
            {draft.seats === 1 ? "seat" : "seats"} at{" "}
            <Glue>
              {tok("fare", draft.price ? formatKes(Number(draft.price)) : "")}{" "}
              each.
            </Glue>
          </>
        )}
      </Sentence>

      {guessed && draft.from && (!draft.to || active === "from") && (
        <Guess>
          <MapPin size={19} aria-hidden />
          We guessed {draft.from} from your connection. Tap it to change.
        </Guess>
      )}

      {done && (
        <>
          <CarLine>
            Look for my{" "}
            {tok(
              "car",
              hasCar
                ? `${draft.color} ${draft.make} ${draft.model}, ${draft.plate}`
                    .replace(/\s+/g, " ")
                    .trim()
                : "",
            )}
            .
          </CarLine>

          <PrefLine>
            {PREF_ORDER.map((key, i) => (
              <Fragment key={key}>
                {i > 0 && ", "}
                <Pref
                  type="button"
                  $on={draft.prefs[key]}
                  aria-pressed={draft.prefs[key]}
                  onClick={() =>
                    patch({
                      prefs: { ...draft.prefs, [key]: !draft.prefs[key] },
                    })
                  }
                >
                  {draft.prefs[key] ? PREF_WORDS[key].on : PREF_WORDS[key].off}
                </Pref>
              </Fragment>
            ))}
            .
          </PrefLine>
        </>
      )}


      {active && (
        <>
          <Editor ref={editorRef} tabIndex={-1} aria-label={TITLES[active]}>
            <EditorLabel>
              <h2>{TITLES[active]}</h2>
              <span className="tools">
                {active === "date" && (
                  <Choice
                    type="button"
                    $on={calendar}
                    aria-expanded={calendar}
                    onClick={() => setCalendar((c) => !c)}
                  >
                    <CalendarBlank size={17} aria-hidden />
                    {calendar ? "Close the calendar" : "Another day"}
                  </Choice>
                )}
                <Close
                  type="button"
                  aria-label="Close this editor"
                  onClick={() => setActive(null)}
                >
                  <Cross size={27} />
                </Close>
              </span>
            </EditorLabel>

            {(active === "from" || active === "to") && (
              <>
                <TownPicker
                  key={active}
                  takeFocus={touched}
                  value={active === "from" ? draft.from : draft.to}
                  other={active === "from" ? draft.to : draft.from}
                  origin={active === "to" ? draft.from : ""}
                  onPick={(name) => {
                    const just =
                      active === "from" ? { from: name } : { to: name };
                    patch(just);
                    advance(active, just);
                  }}
                />
              </>
            )}

            {active === "date" && (
              <DatePicker
                hideLabel
                calendar={calendar}
                onCloseCalendar={() => setCalendar(false)}
                value={draft.date}
                onChange={(date) => {
                  patch({ date });
                  advance("date", { date });
                }}
              />
            )}

            {active === "time" && (
              <>
                <TimePicker
                  hideLabel
                  value={draft.time || "07:00"}
                  onChange={(time) => patch({ time })}
                  onPick={(time) => {
                    patch({ time });
                    advance("time", { time });
                  }}
                  action={
                    <CommitAction
                      type="button"
                      onClick={() => {
                        const time = draft.time || "07:00";
                        patch({ time });
                        advance("time", { time });
                      }}
                    >
                      Use this time <LongArrow />
                    </CommitAction>
                  }
                />
              </>
            )}

            {active === "seats" && (
              <Row>
                <Seats>
                  <Round
                    type="button"
                    aria-label="One fewer seat"
                    disabled={draft.seats <= 1}
                    onClick={() => patch({ seats: draft.seats - 1 })}
                  >
                    <Minus size={19} aria-hidden />
                  </Round>
                  <output aria-live="polite" aria-label={`${draft.seats} seats`}>
                    <RollingNumber value={draft.seats} duration={360} />
                  </output>
                  <Round
                    type="button"
                    aria-label="One more seat"
                    disabled={draft.seats >= 8}
                    onClick={() => patch({ seats: draft.seats + 1 })}
                  >
                    <Plus size={19} aria-hidden />
                  </Round>
                  <span>on sale to passengers</span>
                </Seats>
                <CommitAction type="button" onClick={() => advance("seats")}>
                  Use {draft.seats} {draft.seats === 1 ? "seat" : "seats"}{" "}
                  <LongArrow />
                </CommitAction>
              </Row>
            )}

            {active === "fare" && (
              <>
                <Choices>
                {FARES.map((f) => (
                    <Choice
                      key={f}
                      type="button"
                      $on={Number(draft.price) === f}
                      onClick={() => {
                        const just = { price: String(f) };
                        patch(just);
                        advance("fare", just);
                      }}
                    >
                      {formatKes(f)}
                    </Choice>
                  ))}
                </Choices>
                <Row>
                  <BareField>
                    <span>Or name your own, in shillings</span>
                    <BareInput
                      type="text"
                      inputMode="numeric"
                      value={draft.price}
                      placeholder="e.g. 950"
                      onChange={(e) =>
                        patch({ price: e.target.value.replace(/\D/g, "") })
                      }
                      aria-label="Fare per seat in Kenyan shillings"
                    />
                  </BareField>
                  <CommitAction type="button" onClick={() => advance("fare")}>
                    Use this fare <LongArrow />
                  </CommitAction>
                </Row>
              </>
            )}

            {active === "car" && (
              <>
                <Pair>
                  <BareField>
                    <span>Make</span>
                    <BareInput
                      value={draft.make}
                      placeholder="Toyota"
                      onChange={(e) => patch({ make: e.target.value })}
                    />
                  </BareField>
                  <BareField>
                    <span>Model</span>
                    <BareInput
                      value={draft.model}
                      placeholder="Axio"
                      onChange={(e) => patch({ model: e.target.value })}
                    />
                  </BareField>
                </Pair>
                <BareField as="div">
                  <span>Colour</span>
                  <Choices>
                    {CAR_COLORS.map((name) => (
                      <Choice
                        key={name}
                        type="button"
                        $on={draft.color === name}
                        aria-pressed={draft.color === name}
                        onClick={() =>
                          patch({ color: draft.color === name ? "" : name })
                        }
                      >
                        {name}
                      </Choice>
                    ))}
                  </Choices>
                </BareField>

                <Row>
                  <BareField>
                    <span>Number plate</span>
                    <BareInput
                      value={draft.plate}
                      placeholder="KDA 123A"
                      maxLength={12}
                      autoCapitalize="characters"
                      spellCheck={false}
                      onChange={(e) =>
                        patch({ plate: e.target.value.toUpperCase() })
                      }
                    />
                  </BareField>
                  <CommitAction type="button" onClick={() => setActive(null)}>
                    Save this car <Check size={18} aria-hidden />
                  </CommitAction>
                </Row>
                <Hint>
                  We keep this car on your account, so your next ride is already
                  filled in.
                </Hint>
              </>
            )}
          </Editor>
        </>
      )}

      <Finish>
        {earnings > 0 && (
          <Money>
            <li>
              <HandCoins size={28} aria-hidden />
              <span>
                Fill all {draft.seats} {draft.seats === 1 ? "seat" : "seats"}{" "}
                and passengers pay{" "}
                <b>
                  KES <RollingNumber value={earnings} duration={800} />
                </b>
                . Kipita’s fee comes off before your payout, after the journey.
              </span>
            </li>
            <li>
              <ShieldCheck size={28} aria-hidden />
              <span>
                Nothing is charged to you. Passengers pay when they book.
              </span>
            </li>
          </Money>
        )}
        {done && !driverReady && (
          <Gate>
            <SealCheck size={26} aria-hidden />
            <p>
              <b>Kipita needs your licence first</b>
              It is a one-time check, and it takes about a minute. Your ride is
              kept exactly as you wrote it.
            </p>
          </Gate>
        )}

        {error && (
          <Err role="alert">
            <Warning size={21} aria-hidden />
            <div>
              <p>{error.text}</p>
              {error.fix === "kyc" && (
                <CommitAction type="button" onClick={requireKyc}>
                  Add your licence <LongArrow />
                </CommitAction>
              )}
            </div>
          </Err>
        )}

        <Act>
          {done ? (
            <>
              <Primary type="button" onClick={publish} disabled={pending} aria-busy={pending}>
                {pending ? (
                  <><ButtonOrb job="committing" /> Publishing…</>
                ) : driverReady ? (
                  <>
                    Publish this ride <LongArrow size={30} />
                  </>
                ) : (
                  <>
                    Verify, then publish <LongArrow size={30} />
                  </>
                )}
              </Primary>
            </>
          ) : (
            !active && (
              <TextAction type="button" onClick={() => open(blanks[0]!)}>
                Carry on
              </TextAction>
            )
          )}
        </Act>
      </Finish>
    </Page>
  );
}

