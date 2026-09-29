"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { ArrowLeft, ArrowRight, Circle, MapPin, NavigationArrow as Navigation, Square, X } from "@/components/icons";
import {
  KENYAN_TOWNS,
  POPULAR_ROUTES,
  searchTowns,
  type Town,
} from "@kipita/shared";
import { Drawer, DrawerBody } from "@/components/ui/Drawer";
import { HOME_COPY } from "@/lib/home/copy";
import { nearbyTowns, type Coords } from "@/lib/home/geo";
import { TextInput } from "./fields";
import { useMedia } from "./useMedia";

export type PlaceField = "from" | "to";

const RECENT_KEY = "kipita-recent-places";
const RECENT_MAX = 4;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(name: string): void {
  try {
    const next = [name, ...readRecent().filter((n) => n !== name)].slice(
      0,
      RECENT_MAX,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* blocked storage — recents just stay empty */
  }
}

const Sticky = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  gap: 12px;
  padding-bottom: 14px;
  background: ${({ theme }) => theme.color.surface};
`;

const Tabs = styled.div`
  display: flex;
  gap: 22px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 0 10px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.color.primary : "transparent")};
  margin-bottom: -1px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.color.text : theme.color.muted};

  svg {
    flex: none;
  }
  small {
    display: block;
    font-size: ${({ theme }) => theme.type.micro};
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.textSoft};
  }
  b {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const List = styled.div`
  display: grid;
  gap: 18px;
  min-height: min(52vh, 420px);
  align-content: start;
`;

const Group = styled.section`
  display: grid;
  gap: 2px;

  > h3 {
    margin: 0 0 4px;
    padding-inline: 12px;
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Row = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 56px;
  padding: 9px 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $active }) =>
    $active ? theme.color.surfaceContainer : "transparent"};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, transform 0.14s ease;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainer};
    }
  }
  &:active {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    transform: scale(0.988);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }

  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .text {
    min-width: 0;
    flex: 1;
  }
  b {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    display: block;
    margin-top: 1px;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.35;
    color: ${({ theme }) => theme.color.textSoft};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
    }
  }
`;

const RouteRow = styled(Row)`
  .glyph {
    background: ${({ theme }) => theme.tone.mint.bg};
    color: ${({ theme }) => theme.tone.mint.on};
  }
  .pair {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .pair svg {
    flex: none;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Empty = styled.p`
  margin: 0;
  padding: 26px 12px;
  font-size: ${({ theme }) => theme.type.body};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSoft};
`;

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.bg};
`;

const ScreenHead = styled.header`
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: calc(10px + env(safe-area-inset-top)) 8px 10px;

  h2 {
    flex: 1;
    margin: 0 44px 0 0;
    text-align: center;
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 700;
    letter-spacing: -0.015em;
    color: ${({ theme }) => theme.color.text};
  }
`;

const Back = styled.button`
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;

  &:active {
    background: ${({ theme }) => theme.color.surface2};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
`;

const FieldBox = styled.div`
  position: relative;
  flex: none;
  margin: 2px 16px 18px;
  padding: 4px 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: box-shadow 0.18s ease, border-color 0.18s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.color.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.primary}33;
  }

  &::after {
    content: "";
    position: absolute;
    left: 27px;
    top: 34px;
    height: 28px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.color.outlineVariant};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const FieldRow = styled.div<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  height: 54px;

  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.surfaceContainerLow};
    color: ${({ theme, $active }) =>
      $active ? theme.color.primary : theme.color.onSurfaceVariant};
  }
  input,
  button.ghost {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    font: inherit;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    letter-spacing: -0.01em;
    text-align: left;
    color: ${({ theme }) => theme.color.text};
    padding: 0;
  }
  input::placeholder,
  button.ghost[data-empty="true"] {
    color: ${({ theme }) => theme.color.textSoft};
    font-weight: 500;
  }
  input:focus,
  button.ghost:focus {
    outline: none;
  }
  button.ghost {
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: ${({ theme }) => theme.radius.xs};
  }
  button.ghost:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Clear = styled.button`
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const ScreenList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 8px calc(20px + env(safe-area-inset-bottom));
  display: grid;
  gap: 18px;
  align-content: start;
`;

type Entry =
  | { kind: "town"; town: Town }
  | { kind: "route"; from: string; to: string; blurb: string };

export function PlaceModal({
  field,
  from,
  to,
  originCoords,
  onFieldChange,
  onPickTown,
  onPickRoute,
  onClose,
}: {
  field: PlaceField | null;
  from: string;
  to: string;
  originCoords: Coords | null;
  onFieldChange: (field: PlaceField) => void;
  onPickTown: (field: PlaceField, town: Town) => void;
  onPickRoute: (fromName: string, toName: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [keyboarding, setKeyboarding] = useState(false);
  const phone = useMedia("(max-width: 860px)");
  const listId = "place-options";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (field) {
      setQuery("");
      setActive(0);
      setKeyboarding(false);
      setRecent(readRecent());
    }
  }, [field]);

  useEffect(() => {
    if (!phone || field === null) return;

    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    inputRef.current?.focus();

    return () => {
      style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [phone, field, onClose]);

  const results = useMemo(() => searchTowns(query, 8), [query]);
  const near = useMemo(
    () => (originCoords ? nearbyTowns(originCoords, 5) : []),
    [originCoords],
  );

  const groups = useMemo(() => {
    if (query.trim().length > 0) {
      return [
        {
          title: HOME_COPY.sectionResults,
          entries: results.map((town) => ({ kind: "town", town }) as Entry),
        },
      ];
    }

    const out: Array<{ title: string; entries: Entry[] }> = [];

    out.push({
      title: HOME_COPY.sectionPopular,
      entries: POPULAR_ROUTES.slice(0, 6).map(
        (r) => ({ kind: "route", from: r.from, to: r.to, blurb: r.blurb }) as Entry,
      ),
    });

    if (near.length > 0) {
      out.push({
        title: HOME_COPY.sectionNear,
        entries: near.map((town) => ({ kind: "town", town }) as Entry),
      });
    }

    const recentTowns = recent
      .map((name) => searchTowns(name, 1)[0])
      .filter((t): t is Town => Boolean(t));
    if (recentTowns.length > 0) {
      out.push({
        title: HOME_COPY.sectionRecent,
        entries: recentTowns.map((town) => ({ kind: "town", town }) as Entry),
      });
    }

    const seen = new Set(
      out.flatMap((g) =>
        g.entries.flatMap((e) => (e.kind === "town" ? [e.town.name] : [])),
      ),
    );
    out.push({
      title: HOME_COPY.sectionAll,
      entries: KENYAN_TOWNS.filter((t) => !seen.has(t.name))
        .slice(0, 8)
        .map((town) => ({ kind: "town", town }) as Entry),
    });

    return out.filter((g) => g.entries.length > 0);
  }, [query, results, near, recent]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  function choose(entry: Entry) {
    if (!field) return;
    if (entry.kind === "route") {
      onPickRoute(entry.from, entry.to);
      return;
    }
    pushRecent(entry.town.name);
    onPickTown(field, entry.town);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setKeyboarding(true);
      setActive((i) => (keyboarding ? Math.min(i + 1, flat.length - 1) : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setKeyboarding(true);
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const entry = flat[active];
      if (entry) {
        event.preventDefault();
        choose(entry);
      }
    }
  }

  const isFrom = field === "from";
  let index = -1;

  function clearQuery() {
    setQuery("");
    setActive(0);
    setKeyboarding(false);
    inputRef.current?.focus();
  }

  const comboProps = {
    ref: inputRef,
    value: query,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setActive(0);
      setKeyboarding(false);
    },
    onKeyDown,
    autoComplete: "off" as const,
    role: "combobox",
    "aria-expanded": true,
    "aria-controls": listId,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant":
      keyboarding && flat[active] ? `${listId}-${active}` : undefined,
  };

  const rows = groups.map((group) => (
    <Group key={group.title}>
      <h3>{group.title}</h3>
      {group.entries.map((entry) => {
        index += 1;
        const i = index;
        const highlighted = keyboarding && i === active;
        if (entry.kind === "route") {
          return (
            <RouteRow
              key={`${entry.from}-${entry.to}`}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={highlighted}
              aria-label={`${entry.from} to ${entry.to}. ${entry.blurb}`}
              $active={highlighted}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(entry)}
            >
              <span className="glyph">
                <Navigation size={17} />
              </span>
              <span className="text">
                <span className="pair" aria-hidden="true">
                  {entry.from}
                  <ArrowRight size={13} />
                  {entry.to}
                </span>
                <small aria-hidden="true">{entry.blurb}</small>
              </span>
            </RouteRow>
          );
        }
        return (
          <Row
            key={`${group.title}-${entry.town.name}`}
            id={`${listId}-${i}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={highlighted}
            aria-label={`${entry.town.name}, ${entry.town.county}`}
            $active={highlighted}
            onMouseMove={() => setActive(i)}
            onClick={() => choose(entry)}
          >
            <span className="glyph">
              <MapPin size={17} />
            </span>
            <span className="text">
              <b aria-hidden="true">{entry.town.name}</b>
              <small aria-hidden="true">{entry.town.county}</small>
            </span>
          </Row>
        );
      })}
    </Group>
  ));

  if (mounted && phone && field !== null) {
    return createPortal(
      <Screen role="dialog" aria-modal="true" aria-label={HOME_COPY.planTitle}>
        <ScreenHead>
          <Back type="button" onClick={onClose} aria-label="Back">
            <ArrowLeft size={22} />
          </Back>
          <h2>{HOME_COPY.planTitle}</h2>
        </ScreenHead>

        <FieldBox>
          <FieldRow $active={isFrom}>
            <span className="glyph">
              <Circle size={10} weight="fill" />
            </span>
            {isFrom ? (
              <>
                <input
                  {...comboProps}
                  placeholder={from || HOME_COPY.placeInputFrom}
                  aria-label={HOME_COPY.placeTitleFrom}
                />
                {query && (
                  <Clear
                    type="button"
                    onClick={clearQuery}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </Clear>
                )}
              </>
            ) : (
              <button
                type="button"
                className="ghost"
                data-empty={from ? "false" : "true"}
                onClick={() => onFieldChange("from")}
              >
                {from || HOME_COPY.fromIdle}
              </button>
            )}
          </FieldRow>

          <FieldRow $active={!isFrom}>
            <span className="glyph">
              <Square size={10} weight="fill" />
            </span>
            {!isFrom ? (
              <>
                <input
                  {...comboProps}
                  placeholder={to || HOME_COPY.placeInputTo}
                  aria-label={HOME_COPY.placeTitleTo}
                />
                {query && (
                  <Clear
                    type="button"
                    onClick={clearQuery}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </Clear>
                )}
              </>
            ) : (
              <button
                type="button"
                className="ghost"
                data-empty={to ? "false" : "true"}
                onClick={() => onFieldChange("to")}
              >
                {to || HOME_COPY.toPlaceholder}
              </button>
            )}
          </FieldRow>
        </FieldBox>

        <ScreenList
          id={listId}
          role="listbox"
          aria-label={HOME_COPY.sectionResults}
        >
          {groups.length === 0 && <Empty>{HOME_COPY.noMatch(query)}</Empty>}
          {rows}
        </ScreenList>
      </Screen>,
      document.body,
    );
  }

  return (
    <Drawer
      open={field !== null}
      onClose={onClose}
      size="lg"
      title={isFrom ? HOME_COPY.placeTitleFrom : HOME_COPY.placeTitleTo}
      description={isFrom ? HOME_COPY.placeDescFrom : HOME_COPY.placeDescTo}
      initialFocusRef={inputRef}
    >
      <DrawerBody>
        <Sticky>
          <Tabs>
            <Tab
              type="button"
              $active={field === "from"}
              onClick={() => onFieldChange("from")}
            >
              <Circle size={13} />
              <span>
                <small>{HOME_COPY.fromLabel}</small>
                <b>{from || HOME_COPY.fromIdle}</b>
              </span>
            </Tab>
            <Tab
              type="button"
              $active={field === "to"}
              onClick={() => onFieldChange("to")}
            >
              <MapPin size={13} />
              <span>
                <small>{HOME_COPY.toLabel}</small>
                <b>{to || HOME_COPY.toPlaceholder}</b>
              </span>
            </Tab>
          </Tabs>

          <TextInput
            {...comboProps}
            placeholder={
              isFrom ? HOME_COPY.placeInputFrom : HOME_COPY.placeInputTo
            }
            aria-label={isFrom ? HOME_COPY.placeTitleFrom : HOME_COPY.placeTitleTo}
          />
        </Sticky>

        <List id={listId} role="listbox" aria-label={HOME_COPY.sectionResults}>
          {groups.length === 0 && <Empty>{HOME_COPY.noMatch(query)}</Empty>}
          {rows}
        </List>
      </DrawerBody>
    </Drawer>
  );
}
