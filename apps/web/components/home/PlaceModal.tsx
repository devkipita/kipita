"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styled from "styled-components";
import { ArrowRight } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import {
  KENYAN_TOWNS,
  POPULAR_ROUTES,
  searchTowns,
  type Town,
} from "@kipita/shared";
import { Drawer, DrawerBody } from "@/components/ui/Drawer";
import { TownThumb } from "./TownThumb";
import { usePlaces } from "./usePlaces";
import { HOME_COPY } from "@/lib/home/copy";
import { nearbyTowns, type Coords } from "@/lib/home/geo";
import { TextInput } from "./fields";



export type PlaceField = "from" | "to";

const RECENT_KEY = "kipita-recent-places";
const RECENT_MAX = 4;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed as string[]).slice(0, RECENT_MAX)
      : [];
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
  z-index: 3;
  display: grid;
  gap: 12px;
  padding-top: 4px;
  padding-bottom: 14px;
  background: ${({ theme }) => theme.color.surface};

  &::before {
    content: "";
    position: absolute;
    left: -24px;
    right: -24px;
    bottom: 100%;
    height: 56px;
    background: ${({ theme }) => theme.color.surface};
  }
`;

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  @media (min-width: 760px) {
    gap: 18px;
  }
`;

const Dot = styled.span<{ $tone: "origin" | "dest" }>`
  flex: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2.5px solid
    ${({ $tone }) => ($tone === "origin" ? nocturne.ctaBg : nocturne.accent)};
  background: transparent;

  @media (min-width: 760px) {
    width: 15px;
    height: 15px;
  }
`;

const Connector = styled.span`
  flex: 0 0 auto;
  width: 26px;
  height: 0;
  margin-bottom: 10px;
  border-top: 2px dotted ${({ theme }) => theme.color.outline};

  @media (min-width: 760px) {
    flex: 1 1 auto;
    width: auto;
    min-width: 40px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 0;
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
  > span {
    min-width: 0;
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

  @media (min-width: 760px) {
    gap: 11px;
    small {
      font-size: 13px;
      letter-spacing: 0.06em;
    }
    b {
      font-size: 22px;
      letter-spacing: -0.015em;
    }
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
  transition:
    background 0.14s ease,
    transform 0.14s ease;

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
  onSearch,
  searchLabel,
  onClose,
}: {
  field: PlaceField | null;
  from: string;
  to: string;
  originCoords: Coords | null;
  onFieldChange: (field: PlaceField) => void;
  onPickTown: (field: PlaceField, town: Town) => void;
  onPickRoute: (fromName: string, toName: string) => void;
  /** Runs the search with the fields as they stand and closes the screen. */
  onSearch: () => void;
  searchLabel: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [keyboarding, setKeyboarding] = useState(false);
  const listId = "place-options";


  useEffect(() => {
    if (field) {
      setQuery("");
      setActive(0);
      setKeyboarding(false);
      setRecent(readRecent());
    }
  }, [field]);



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
        (r) =>
          ({ kind: "route", from: r.from, to: r.to, blurb: r.blurb }) as Entry,
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
  const places = usePlaces(
    field === null
      ? []
      : flat.slice(0, 14).flatMap((e) => (e.kind === "town" ? [e.town.name] : [])),
  );

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
            <TownThumb town={entry.town.name} places={places} />
            <span className="text">
              <b aria-hidden="true">{entry.town.name}</b>
              {entry.town.county &&
              entry.town.county.trim().toLowerCase() !==
                entry.town.name.trim().toLowerCase() ? (
                <small aria-hidden="true">{entry.town.county}</small>
              ) : null}
            </span>
          </Row>
        );
      })}
    </Group>
  ));

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
              <Dot $tone="origin" aria-hidden />
              <span>
                <small>{HOME_COPY.fromLabel}</small>
                <b>{from || HOME_COPY.fromIdle}</b>
              </span>
            </Tab>

            <Connector aria-hidden />

            <Tab
              type="button"
              $active={field === "to"}
              onClick={() => onFieldChange("to")}
            >
              <Dot $tone="dest" aria-hidden />
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
            aria-label={
              isFrom ? HOME_COPY.placeTitleFrom : HOME_COPY.placeTitleTo
            }
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
