"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import type { Town } from "@kipita/shared";
import { ContentWidth, useAppMode } from "@/components/nav/AppShell";
import type { Profile } from "@/lib/auth/types";
import { HOME_COPY } from "@/lib/home/copy";
import { detectOrigin, type Coords } from "@/lib/home/geo";
import type { HomeItem } from "@/lib/home/search";
import { SlidersHorizontal } from "@/components/icons";
import { dayLabel } from "@/lib/trips/format";
import { DateStrip } from "./DateStrip";
import { LocalWeather } from "./LocalWeather";
import { PlaceModal, pushRecent, type PlaceField } from "./PlaceModal";
import { PostDrawer, type PostDraft } from "./PostDrawer";
import { RideCarousel } from "./RideCarousel";
import type { SearchForm } from "./RouteSearchForm";
import { SearchDock, type OriginStatus } from "./SearchDock";
import { WhenModal } from "./WhenModal";
import { useHomeSearch } from "./useHomeSearch";

const Wrap = styled(ContentWidth)`
  padding-bottom: clamp(32px, 7vw, 56px);
  display: flex;
  flex-direction: column;
  gap: var(--band-gap);
`;

const Greeting = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  flex-wrap: wrap;
  margin-top: clamp(12px, 3vw, 26px);

  .text {
    flex: 1;
    min-width: 200px;
  }
  h1 {
    margin: 0;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.title};
    font-weight: 600;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 4px 0 0;
    font-size: ${({ theme }) => theme.type.body};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .aside {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.md};
    flex: none;
  }
`;

const FilterPill = styled.button<{ $on: boolean; $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  height: 38px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border: none;
  border-radius: ${({ theme, $open }) =>
    $open ? theme.radius.xxs : theme.radius.pill};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  background: ${({ theme, $on, $open }) =>
    $on
      ? theme.color.primary
      : $open
        ? theme.color.secondaryContainer
        : theme.color.elevatedInset};
  color: ${({ theme, $on, $open }) =>
    $on
      ? theme.color.onPrimary
      : $open
        ? theme.color.onSecondaryContainer
        : theme.color.onSurfaceVariant};

  transition:
    background ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    color ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    border-radius ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized},
    transform ${({ theme }) => theme.motion.duration.short3}
      ${({ theme }) => theme.motion.easing.standard};

  svg {
    flex: none;
    transition: transform ${({ theme }) => theme.motion.duration.medium2}
      ${({ theme }) => theme.motion.easing.emphasized};
    transform: rotate(${({ $open }) => ($open ? "90deg" : "0deg")});
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ theme, $on }) =>
        $on ? theme.color.primary : theme.color.secondaryContainer};
      color: ${({ theme, $on }) =>
        $on ? theme.color.onPrimary : theme.color.onSecondaryContainer};
    }
  }
  &:active {
    transform: scale(0.94);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    svg {
      transition: none;
      transform: none;
    }
    &:active {
      transform: none;
    }
  }
`;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

function scheduleLabelFor(
  date: string | null,
  time: string | null,
): string | null {
  if (!date) return null;
  const dt = new Date(`${date}T${time ?? "00:00"}`);
  if (Number.isNaN(dt.getTime())) return null;
  const day = dt.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: time ? undefined : "short",
  });
  return time ? `${day}, ${time}` : day;
}

export function HomeView({
  profile,
  initialItems,
  offersSlot,
}: {
  profile: Profile;
  initialItems: HomeItem[];
  offersSlot: ReactNode;
}) {
  const router = useRouter();
  const { mode } = useAppMode();
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<SearchForm["preferences"]>({});

  const [placeField, setPlaceField] = useState<PlaceField | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  const [originStatus, setOriginStatus] = useState<OriginStatus>("idle");
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [originTown, setOriginTown] = useState("");
  const fromTouched = useRef(false);

  const search = useHomeSearch(mode, initialItems);
  const {
    items,
    phase,
    refreshing,
    lastForm,
    searchRequested,
    run,
    clearSearchRequest,
  } = search;

  useEffect(() => {
    const controller = new AbortController();
    setOriginStatus("detecting");

    detectOrigin(controller.signal)
      .then((origin) => {
        if (!origin) {
          setOriginStatus("failed");
          return;
        }
        setOriginCoords(origin.coords);
        setOriginTown(origin.town.name);
        setOriginStatus("ready");
        if (!fromTouched.current)
          setFrom((current) => current || origin.town.name);
      })
      .catch(() => setOriginStatus("failed"));

    return () => controller.abort();
  }, []);

  const firstMode = useRef(mode);
  useEffect(() => {
    if (mode === firstMode.current) return;
    void run(lastForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const runSearch = useCallback(
    (overrides: Partial<SearchForm> = {}) => {
      const form: SearchForm = {
        from,
        to,
        date,
        departure_time: time,
        preferences,
        ...overrides,
      };
      void run(form, { deliberate: true });
    },
    [from, to, date, time, preferences, run],
  );

  const openPost = useCallback(
    (form: SearchForm | null) => {
      const nextFrom = form?.from ?? from;
      const nextTo = form?.to ?? to;
      if (nextFrom.trim().length < 2 || nextTo.trim().length < 2) return;

      setPostDraft({
        role: mode,
        from: nextFrom,
        to: nextTo,
        date: form?.date ?? date,
        departure_time: form?.departure_time ?? time,
        preferences: form?.preferences ?? preferences,
      });
    },
    [mode, from, to, date, time, preferences],
  );

  useEffect(() => {
    if (!searchRequested || phase !== "ready") return;
    clearSearchRequest();
    if (items.length === 0) openPost(null);
  }, [searchRequested, phase, items.length, clearSearchRequest, openPost]);

  const searchActive = Boolean(
    to ||
    date ||
    time ||
    (from && from !== originTown) ||
    Object.values(preferences ?? {}).some(Boolean),
  );

  // Empty form = every upcoming ride, not a deliberate search, so the post
  // drawer must not open when the list is short.
  function clearSearch() {
    fromTouched.current = true;
    setFrom("");
    setTo("");
    setDate(null);
    setTime(null);
    setPreferences({});
    setDatesOpen(false);
    void run(
      { from: "", to: "", date: null, departure_time: null, preferences: {} },
      { deliberate: false },
    );
  }

  function pickTown(field: PlaceField, town: Town) {
    if (field === "from") {
      fromTouched.current = true;
      setFrom(town.name);
      setPlaceField("to");
      return;
    }
    setTo(town.name);
    setPlaceField(null);
    runSearch({ to: town.name });
  }

  function pickRoute(fromName: string, toName: string) {
    fromTouched.current = true;
    setFrom(fromName);
    setTo(toName);
    pushRecent(toName);
    setPlaceField(null);
    runSearch({ from: fromName, to: toName });
  }

  return (
    <>
      <Wrap $max={1180}>
        <SearchDock
          from={from}
          to={to}
          scheduleLabel={scheduleLabelFor(date, time)}
          originStatus={originStatus}
          onOpenField={setPlaceField}
          onOpenWhen={() => setWhenOpen(true)}
          onSearch={() => runSearch()}
          onClear={clearSearch}
          canClear={searchActive}
        />

        <Greeting>
          <div className="text">
            <h1>{HOME_COPY.greeting(firstName(profile.full_name))}</h1>
            <p>{HOME_COPY.greetingSub[mode]}</p>
          </div>
          <div className="aside">
            <FilterPill
              type="button"
              $on={Boolean(date)}
              $open={datesOpen}
              aria-expanded={datesOpen}
              aria-label={
                date ? `Filtering by ${date}. Change date` : "Filter by date"
              }
              onClick={() => setDatesOpen((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              {date ? dayLabel(date) : "Any date"}
            </FilterPill>
            <LocalWeather town={from || originTown} />
          </div>
        </Greeting>

        {datesOpen && (
          <DateStrip
            value={date}
            onChange={(next) => {
              setDate(next);
              void run(
                {
                  from: fromTouched.current ? from : "",
                  to: lastForm?.to ?? to,
                  date: next,
                  departure_time: next ? null : time,
                  preferences,
                },
                { deliberate: false },
              );
            }}
            onDismiss={() => setDatesOpen(false)}
          />
        )}

        <RideCarousel
          mode={mode}
          phase={phase}
          refreshing={refreshing}
          items={items}
          onPost={() => openPost(null)}
          onRetry={() => void run(lastForm)}
        />

        {offersSlot}
      </Wrap>

      <PlaceModal
        field={placeField}
        from={from}
        to={to}
        originCoords={originCoords}
        onFieldChange={setPlaceField}
        onPickTown={pickTown}
        onPickRoute={pickRoute}
        onClose={() => setPlaceField(null)}
      />

      <WhenModal
        open={whenOpen}
        mode={mode}
        date={date}
        time={time}
        preferences={preferences}
        onClose={() => setWhenOpen(false)}
        onApply={(next) => {
          setDate(next.date);
          setTime(next.time);
          setPreferences(next.preferences);
          setWhenOpen(false);
          runSearch({
            date: next.date,
            departure_time: next.time,
            preferences: next.preferences,
          });
        }}
      />

      <PostDrawer
        open={!!postDraft}
        draft={postDraft}
        viewerId={profile.id}
        onClose={() => setPostDraft(null)}
        onPosted={() => {
          setPostDraft(null);
          router.refresh();
        }}
      />
    </>
  );
}
