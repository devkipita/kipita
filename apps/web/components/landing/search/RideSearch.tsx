"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  Calendar,
  CaretDown as ChevronDown,
  MapPin,
  NavigationArrow as Navigation,
  MagnifyingGlass as Search,
} from "@/components/icons";
import { nocturne } from "../nocturne";
import { useSharedRideSearch } from "./RideSearchContext";
import { RideResults } from "./RideResults";

/* ══════════════ layout ══════════════ */

const Wrap = styled.div`
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

/* Smoothly reveals its content by animating the grid track from 0fr → 1fr —
   height-agnostic and buttery, no magic max-height numbers. */
const Reveal = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-4px")});
  transition:
    grid-template-rows 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.4s ease,
    transform 0.4s ease;

  > div {
    overflow: hidden;
    min-height: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Pill = styled.div<{ $expanded: boolean }>`
  position: relative;
  background: ${nocturne.surface};
  border: 1px solid
    ${({ $expanded }) => ($expanded ? nocturne.green : nocturne.line)};
  border-radius: ${({ $expanded }) => ($expanded ? "28px" : "999px")};
  padding: ${({ $expanded }) => ($expanded ? "8px" : "6px 6px 6px 8px")};
  box-shadow: ${({ $expanded }) =>
    $expanded
      ? "0 30px 70px rgba(0, 0, 0, 0.45)"
      : "0 12px 30px rgba(0,0,0,0.28)"};
  transition:
    border-radius 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    border-color 0.3s ease,
    box-shadow 0.4s ease,
    padding 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The always-visible destination row + When control. */
const MainRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Field = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 20px;
  cursor: text;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  @media (max-width: 640px) {
    gap: 10px;
    padding: 11px 8px;
  }
`;

const Pin = styled.span<{ $tone: "from" | "to" }>`
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => ($tone === "from" ? nocturne.sage : nocturne.lime)};
  background: ${nocturne.greenDeep};
`;

const FieldBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;

  small {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${nocturne.muted3};
  }
`;

const Input = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: 17px;
  font-weight: 600;
  color: ${nocturne.cream};

  &::placeholder {
    color: ${nocturne.muted2};
    font-weight: 500;
  }

  /* Double '&' out-specifies the Root :focus-visible outline so the field
     stays borderless when focused. */
  &&:focus,
  &&:focus-visible {
    outline: none;
    box-shadow: none;
  }
`;

const AutoBadge = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${nocturne.greenDeep};
  background: ${nocturne.sage};
`;

const Spinner = styled.span`
  flex: none;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid ${nocturne.line};
  border-top-color: ${nocturne.sage};
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/* Dotted connector between the from and to rows. */
const Connector = styled.div`
  height: 1px;
  margin: 2px 10px 2px 24px;
  background: repeating-linear-gradient(
    to right,
    ${nocturne.line} 0 5px,
    transparent 5px 11px
  );

  @media (max-width: 640px) {
    margin: 2px 8px 2px 22px;
  }
`;

/* ══════════════ When control ══════════════ */

const WhenBtn = styled.button<{ $active: boolean }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active ? nocturne.green : nocturne.line)};
  background: ${({ $active }) =>
    $active ? nocturne.greenDeep : "transparent"};
  color: ${nocturne.cream};
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  svg:first-child {
    color: ${nocturne.sage};
  }

  &:hover {
    border-color: ${nocturne.green};
  }
`;

const WhenPop = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 20;
  width: min(280px, 82vw);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 18px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
`;

const WhenOpt = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: none;
  background: ${({ $active }) =>
    $active ? nocturne.greenDeep : "transparent"};
  color: ${nocturne.cream};
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  svg {
    color: ${nocturne.sage};
  }
`;

const DateField = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${nocturne.bg};
  border: 1px solid ${nocturne.line};

  svg {
    color: ${nocturne.sage};
    flex: none;
  }

  input {
    width: 100%;
    border: none;
    background: transparent;
    color: ${nocturne.cream};
    font-family: inherit;
    font-size: 15px;

    &:focus {
      outline: none;
    }

    &::-webkit-calendar-picker-indicator {
      filter: invert(0.8);
      cursor: pointer;
    }
  }
`;

/* ══════════════ Suggestions ══════════════ */

const Suggestions = styled.ul`
  position: absolute;
  left: 8px;
  right: 8px;
  top: calc(100% + 8px);
  z-index: 15;
  margin: 0;
  padding: 8px;
  list-style: none;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: ${nocturne.surface};
  border: 1px solid ${nocturne.line};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  max-height: 316px;
  overflow-y: auto;
  overscroll-behavior: contain;

  /* Subtle, themed scrollbar instead of the chunky native one. */
  scrollbar-width: thin;
  scrollbar-color: ${nocturne.green} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${nocturne.green};
    border-radius: 999px;
    border: 2px solid ${nocturne.surface};
    background-clip: padding-box;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${nocturne.sage};
  }
`;

const Suggestion = styled.li`
  button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${nocturne.cream};
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover,
    &:focus-visible {
      background: ${nocturne.greenDeep};
    }

    span {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    small {
      font-size: 12px;
      font-weight: 500;
      color: ${nocturne.muted3};
    }

    svg {
      color: ${nocturne.tan};
      flex: none;
    }
  }
`;

/* ══════════════ Search button ══════════════ */

const SearchBtn = styled.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  padding: 17px 24px;
  border-radius: 999px;
  border: none;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-family: inherit;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  transition:
    background 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultsSpacer = styled.div`
  padding-top: 26px;
`;

/* ══════════════ component ══════════════ */

function whenLabel(when: { mode: "now" } | { mode: "schedule"; date: string }) {
  if (when.mode === "now") return "Today";
  const dt = new Date(`${when.date}T00:00:00`);
  return dt.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function RideSearch() {
  const search = useSharedRideSearch();
  const {
    expanded,
    from,
    to,
    when,
    towns,
    detecting,
    fromAutofilled,
    phase,
    outcome,
  } = search;

  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [today, setToday] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  // Close popovers on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setActiveField(null);
        setWhenOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveField(null);
        setWhenOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const query = activeField === "from" ? from : to;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Don't suggest the town already chosen in the other field.
    const other = (activeField === "from" ? to : from).trim().toLowerCase();
    const list = towns.filter((t) => {
      const name = t.name.toLowerCase();
      if (name === other) return false;
      return q ? name.includes(q) : true;
    });
    return list.slice(0, 5);
  }, [query, towns, activeField, from, to]);

  const showSuggestions = activeField !== null && matches.length > 0;

  function openSearch() {
    search.expand();
    setActiveField("to");
    // Focus the destination input on the next frame (after the reveal starts).
    requestAnimationFrame(() => toInputRef.current?.focus());
  }

  function pick(field: "from" | "to", name: string) {
    if (field === "from") {
      search.setFrom(name);
      setActiveField("to");
      requestAnimationFrame(() => toInputRef.current?.focus());
    } else {
      search.setTo(name);
      setActiveField(null);
      void search.run({ to: name });
    }
  }

  const canSearch = to.trim().length > 0;

  return (
    <Wrap ref={rootRef}>
      <Pill $expanded={expanded}>
        {/* From — revealed on expand */}
        <Reveal $open={expanded}>
          <div inert={!expanded}>
            <MainRow>
              <Field
                onClick={() => {
                  setActiveField("from");
                  setWhenOpen(false);
                }}
              >
                <Pin $tone="from">
                  <Navigation size={15} />
                </Pin>
                <FieldBody>
                  <small>From</small>
                  <Input
                    value={from}
                    placeholder={
                      detecting ? "Detecting your town…" : "Where from?"
                    }
                    onChange={(e) => search.setFrom(e.target.value)}
                    onFocus={() => {
                      setActiveField("from");
                      setWhenOpen(false);
                    }}
                    aria-label="Origin town"
                    autoComplete="off"
                  />
                </FieldBody>
                {detecting ? (
                  <Spinner aria-label="Detecting location" />
                ) : fromAutofilled ? (
                  <AutoBadge>Auto</AutoBadge>
                ) : null}
              </Field>
            </MainRow>
            <Connector />
          </div>
        </Reveal>

        {/* To — always visible; the collapsed pill */}
        <MainRow>
          <Field
            onClick={() => {
              if (!expanded) openSearch();
              else {
                setActiveField("to");
                setWhenOpen(false);
              }
            }}
          >
            <Pin $tone="to">
              <MapPin size={15} />
            </Pin>
            <FieldBody>
              {expanded ? <small>Going to</small> : null}
              <Input
                ref={toInputRef}
                value={to}
                placeholder="Where are you going?"
                onChange={(e) => search.setTo(e.target.value)}
                onFocus={() => {
                  if (!expanded) openSearch();
                  setActiveField("to");
                  setWhenOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSearch) {
                    setActiveField(null);
                    void search.run();
                  }
                }}
                aria-label="Destination town"
                aria-expanded={showSuggestions}
                aria-controls={listId}
                autoComplete="off"
              />
            </FieldBody>
          </Field>

          <WhenBtn
            type="button"
            $active={when.mode === "schedule"}
            onClick={() => {
              setWhenOpen((o) => !o);
              setActiveField(null);
            }}
            aria-label="Choose when to travel"
            aria-expanded={whenOpen}
          >
            <Calendar size={16} />
            {whenLabel(when)}
            <ChevronDown size={15} />
          </WhenBtn>
        </MainRow>

        {whenOpen ? (
          <WhenPop>
            <WhenOpt
              type="button"
              $active={when.mode === "now"}
              onClick={() => {
                search.setWhen({ mode: "now" });
                setWhenOpen(false);
              }}
            >
              <Navigation size={16} />
              Leave now
            </WhenOpt>
            <DateField>
              <Calendar size={16} />
              <input
                type="date"
                min={today}
                value={when.mode === "schedule" ? when.date : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    search.setWhen({ mode: "schedule", date: e.target.value });
                  }
                }}
              />
            </DateField>
          </WhenPop>
        ) : null}

        {showSuggestions ? (
          <Suggestions id={listId} role="listbox">
            {matches.map((t) => (
              <Suggestion key={`${t.name}-${t.county ?? ""}`} role="option">
                <button
                  type="button"
                  onClick={() => pick(activeField as "from" | "to", t.name)}
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
              </Suggestion>
            ))}
          </Suggestions>
        ) : null}
      </Pill>

      <Reveal $open={expanded}>
        <div inert={!expanded}>
          <SearchBtn
            type="button"
            disabled={!canSearch}
            onClick={() => {
              setActiveField(null);
              setWhenOpen(false);
              void search.run();
            }}
          >
            <Search size={24} />
            Search rides
          </SearchBtn>
        </div>
      </Reveal>

      <Reveal $open={phase !== "idle"} aria-live="polite">
        <div inert={phase === "idle"}>
          <ResultsSpacer>
            <RideResults phase={phase} outcome={outcome} from={from} to={to} />
          </ResultsSpacer>
        </div>
      </Reveal>
    </Wrap>
  );
}
