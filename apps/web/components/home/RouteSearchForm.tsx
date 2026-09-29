"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { CalendarBlank as CalendarDays, CaretDown as ChevronDown, Circle, Clock, CircleNotch as Loader2, MapPin, MagnifyingGlass as Search, SlidersHorizontal, Lightning as Zap } from "@/components/icons";
import { fetchTowns, type Town } from "@/lib/rides";
import type { RidePreferences } from "@/lib/ride-detail";
import { ROLE_COPY } from "@/lib/home/labels";
import type { AppMode } from "@/lib/home/mode";
import { ButtonEl } from "@/components/ui/primitives";
import {
  FieldBlock,
  FieldHead,
  Segmented,
  SegmentButton,
  Suggestions,
  TextInput,
} from "./fields";
import { ComfortToggles } from "./ComfortToggles";

export type SearchForm = {
  from: string;
  to: string;
  /** "YYYY-MM-DD", or null for "leaving now". */
  date: string | null;
  /** "HH:mm", or null for "leaving now". */
  departure_time: string | null;
  preferences: RidePreferences;
};

const Card = styled.section`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  padding: 20px;
  display: grid;
  gap: 16px;
`;

/* The from → to pair, joined by a dashed rail like the mobile planner. */
const Route = styled.div`
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  align-items: start;
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 15px;
  height: 100%;

  svg.start {
    color: ${({ theme }) => theme.color.primary};
    fill: ${({ theme }) => theme.color.primary};
  }
  .line {
    flex: 1;
    width: 0;
    min-height: 22px;
    margin: 5px 0;
    border-left: 2px dashed ${({ theme }) => theme.color.line};
  }
  svg.end {
    color: ${({ theme }) => theme.color.dangerText};
  }
`;

const Stops = styled.div`
  display: grid;
  gap: 10px;
  min-width: 0;
`;

const WhenRow = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Advanced = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 700;
  cursor: pointer;

  svg.lead {
    color: ${({ theme }) => theme.color.primary};
  }
  svg.chev {
    margin-left: auto;
    color: ${({ theme }) => theme.color.textSoft};
    transition: transform 0.18s ease;
  }
  &[aria-expanded="true"] svg.chev {
    transform: rotate(180deg);
  }
`;

const Submit = styled(ButtonEl)`
  width: 100%;
`;

const MAX_SUGGESTIONS = 6;

function todayLocalISO(): string {
  const now = new Date();
  // Local, not toISOString() — Kenya is UTC+3, so a UTC date is wrong before
  // 03:00 EAT. (`lib/rides.ts` has this bug; don't copy it.)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function nextQuarterHour(): { date: string; time: string } {
  const quarter = 1000 * 60 * 15;
  const slot = new Date(Math.ceil(Date.now() / quarter) * quarter);
  return {
    date: `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, "0")}-${String(
      slot.getDate(),
    ).padStart(2, "0")}`,
    time: `${String(slot.getHours()).padStart(2, "0")}:${String(
      slot.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

/**
 * Band 1 — the route planner. Web port of
 * `apps/mobile/src/components/shared/RouteSearchForm.tsx`.
 *
 * Unlike mobile there's no collapsed pill: a desktop viewport has room to show
 * the whole planner, and hiding it behind a tap would be a worse trade here.
 * The comfort options stay collapsed, as they are on mobile.
 */
export function RouteSearchForm({
  mode,
  busy,
  initial,
  onSearch,
}: {
  mode: AppMode;
  busy: boolean;
  initial?: Partial<SearchForm>;
  onSearch: (form: SearchForm) => void;
}) {
  const copy = ROLE_COPY[mode];

  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [when, setWhen] = useState<"now" | "later">(
    initial?.date ? "later" : "now",
  );
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.departure_time ?? "");
  const [preferences, setPreferences] = useState<RidePreferences>(
    initial?.preferences ?? {},
  );
  const [showComfort, setShowComfort] = useState(false);
  const [towns, setTowns] = useState<Town[]>([]);
  const [focused, setFocused] = useState<"from" | "to" | null>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchTowns().then((list) => {
      if (alive) setTowns(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!focused) return [];
    const typed = (focused === "from" ? from : to).trim().toLowerCase();
    const other = (focused === "from" ? to : from).trim().toLowerCase();
    if (typed.length < 1) return towns.slice(0, MAX_SUGGESTIONS);

    return towns
      .filter((town) => {
        if (town.name.toLowerCase() === other) return false;
        return (
          town.name.toLowerCase().includes(typed) ||
          (town.county ?? "").toLowerCase().includes(typed)
        );
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [focused, from, to, towns]);

  const canSearch = from.trim().length >= 2 && to.trim().length >= 2;

  function chooseWhen(next: "now" | "later") {
    setWhen(next);
    if (next !== "later") return;
    // Seed a concrete, editable slot rather than an empty picker.
    const slot = nextQuarterHour();
    setDate((d) => d || slot.date);
    setTime((t) => t || slot.time);
  }

  // Suggestion buttons call preventDefault on mousedown so the click lands
  // before the blur; the delay covers focus moving by keyboard.
  function closeSuggestions() {
    window.setTimeout(() => setFocused(null), 120);
  }

  function pick(town: Town) {
    if (focused === "from") {
      setFrom(town.name);
      toRef.current?.focus();
    } else {
      setTo(town.name);
      setFocused(null);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch || busy) return;
    onSearch({
      from: from.trim(),
      to: to.trim(),
      date: when === "later" ? date || null : null,
      departure_time: when === "later" ? time || null : null,
      preferences,
    });
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Route>
          <Rail>
            <Circle className="start" size={11} />
            <span className="line" />
            <MapPin className="end" size={16} />
          </Rail>
          <Stops>
            <TextInput
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onFocus={() => setFocused("from")}
              onBlur={closeSuggestions}
              placeholder="Leaving from…"
              aria-label="Leaving from"
              autoComplete="off"
            />
            <TextInput
              ref={toRef}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onFocus={() => setFocused("to")}
              onBlur={closeSuggestions}
              placeholder="Going to…"
              aria-label="Going to"
              autoComplete="off"
            />
          </Stops>
        </Route>

        {focused && suggestions.length > 0 && (
          <Suggestions style={{ marginTop: 10 }}>
            {suggestions.map((town) => (
              <li key={`${town.name}-${town.county ?? ""}`}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(town)}>
                  {town.name}
                  {town.county && <small>{town.county}</small>}
                </button>
              </li>
            ))}
          </Suggestions>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <FieldBlock>
            <FieldHead>
              <span className="k">When</span>
            </FieldHead>
            <Segmented>
              <SegmentButton
                type="button"
                $active={when === "now"}
                onClick={() => chooseWhen("now")}
              >
                <Zap size={15} /> Leaving now
              </SegmentButton>
              <SegmentButton
                type="button"
                $active={when === "later"}
                onClick={() => chooseWhen("later")}
              >
                <CalendarDays size={15} /> Pick a time
              </SegmentButton>
            </Segmented>
          </FieldBlock>

          {when === "later" && (
            <WhenRow>
              <FieldBlock>
                <FieldHead>
                  <label htmlFor="search-date">
                    <CalendarDays size={14} /> Date
                  </label>
                </FieldHead>
                <TextInput
                  id="search-date"
                  type="date"
                  min={todayLocalISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </FieldBlock>
              <FieldBlock>
                <FieldHead>
                  <label htmlFor="search-time">
                    <Clock size={14} /> Time
                  </label>
                </FieldHead>
                <TextInput
                  id="search-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </FieldBlock>
            </WhenRow>
          )}

          <div>
            <Advanced
              type="button"
              aria-expanded={showComfort}
              onClick={() => setShowComfort((v) => !v)}
            >
              <SlidersHorizontal className="lead" size={17} />
              {copy.preferencesLabel}
              <ChevronDown className="chev" size={18} />
            </Advanced>
            {showComfort && (
              <div style={{ marginTop: 10 }}>
                <ComfortToggles value={preferences} onChange={setPreferences} />
              </div>
            )}
          </div>

          <Submit type="submit" disabled={!canSearch || busy}>
            {busy ? (
              <>
                <Loader2 size={19} /> Searching…
              </>
            ) : (
              <>
                <Search size={19} /> {copy.searchCTA}
              </>
            )}
          </Submit>
        </div>
      </form>
    </Card>
  );
}
