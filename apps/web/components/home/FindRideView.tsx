"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { ArrowClockwise, ArrowRight, MagnifyingGlass, SlidersHorizontal } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { ButtonEl } from "@/components/ui/primitives";
import { BreakArt, DeadEndArt, NoRidesArt } from "@/components/ui/StatusArt";
import { Shimmer } from "@/components/ui/Shimmer";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { HomeTrip } from "@/lib/home/search";
import type { Profile } from "@/lib/auth/types";
import { useHomeSearch } from "./useHomeSearch";
import { FindRideSearchBar, SearchBarSkeleton, type SearchBarValue } from "./FindRideSearchBar";
import { RequestRideDrawer } from "./RequestRideDrawer";
import { RideCard, RideList, RideListSkeleton, isNewDriver } from "./RideCard";
import {
  EMPTY_FILTERS,
  RideFilters,
  applyRideFilters,
  type RideFilterState,
} from "./RideFilters";

type Sort = "time" | "price" | "rating";

const SORTS: { key: Sort; label: string; short: string }[] = [
  { key: "time", label: "Earliest departure", short: "Earliest" },
  { key: "price", label: "Lowest price", short: "Lowest price" },
  { key: "rating", label: "Best rated", short: "Best rated" },
];

const PAGE = 6;
const STAGGERED = 5;

export const Page = styled.main`
  position: relative;
  min-height: 100vh;
  padding: 56px max(34px, calc((100% - 1212px) / 2)) 120px;
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding: 28px 18px calc(90px + env(safe-area-inset-bottom));
  }
`;

export const Title = styled.h1`
  margin: 0;
  font-size: clamp(32px, 5vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
  overflow-wrap: anywhere;
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: 215px minmax(0, 1fr);
  gap: 32px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const FilterCol = styled.aside`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);

  @media (max-width: 960px) {
    display: none;
  }
`;

const Results = styled.section`
  min-width: 0;
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 44px;
  margin-bottom: 16px;
  font-size: 16px;
  line-height: 22px;
  color: ${nocturne.muted};

  strong {
    color: ${nocturne.cream};
  }
`;

export const HeadTools = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 760px) {
    width: 100%;
    gap: 12px;

    > * {
      flex: 1 1 0;
      min-width: 0;
      justify-content: center;
    }
  }
`;

const SortGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 760px) {
    display: none;
  }
`;

const toolButton = `
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid ${nocturne.outline};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

export const SortBtn = styled.button`
  display: none;

  @media (max-width: 760px) {
    display: inline-flex;
    ${toolButton}
  }

  small {
    color: ${nocturne.muted2};
    font-size: 13px;
    font-weight: 500;
  }
`;

export const FilterBtn = styled.button`
  display: none;

  @media (max-width: 960px) {
    display: inline-flex;
    ${toolButton}
  }

  .count {
    display: inline-grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
    font-size: 12px;
    font-weight: 700;
  }
`;

const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid ${({ $on }) => ($on ? nocturne.green : nocturne.outline)};
  border-radius: 999px;
  background: ${({ $on }) => ($on ? nocturne.green : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const StateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 24px 40px;
  border-radius: 24px;
  border: 1px solid ${nocturne.cardBorder};
  background: ${nocturne.surface};
  color: ${nocturne.muted2};
  text-align: center;

  svg {
    max-width: 260px;
  }
  h2 {
    margin: 6px 0 0;
    font-size: clamp(22px, 3vw, 28px);
    line-height: 1.2;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  p {
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

const StateAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Offers = styled.section`
  margin-top: 44px;
  padding-top: 36px;
  border-top: 1px solid ${nocturne.line};
`;

const MoreWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
`;

const MoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 28px;
  border: 1px solid ${nocturne.accent};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.accent};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.accent};
      color: ${nocturne.onGreen};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const MoreNote = styled.span`
  font-size: 14px;
  color: ${nocturne.muted2};
`;

const Half = styled(ButtonEl)`
  flex: 1;
  justify-content: center;
`;

const FilterBody = styled(DrawerBody)`
  padding-bottom: 12px;
`;

const SortList = styled.div`
  display: grid;
  gap: 2px;
  min-width: 220px;
`;

const Check = styled.span<{ $on: boolean }>`
  flex: none;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 50%;
  border: 2px solid ${({ $on }) => ($on ? nocturne.accent : nocturne.outline)};
  box-shadow: ${({ $on }) => ($on ? `inset 0 0 0 4px ${nocturne.surface}` : "none")};
  background: ${({ $on }) => ($on ? nocturne.accent : "transparent")};
`;

function ratingBand(t: HomeTrip) {
  if (isNewDriver(t)) return 1;
  return Number(t.person?.rating) >= 4 ? 0 : 2;
}

function departureKey(t: HomeTrip) {
  return `${t.departure_date ?? "9999"}${t.departure_time ?? ""}`;
}

function sortTrips(list: HomeTrip[], sort: Sort) {
  const sorted = [...list];
  if (sort === "price") {
    sorted.sort((a, b) => a.price_per_seat - b.price_per_seat);
  } else if (sort === "rating") {
    sorted.sort((a, b) => {
      const band = ratingBand(a) - ratingBand(b);
      if (band) return band;
      if (ratingBand(a) === 1) return departureKey(a).localeCompare(departureKey(b));
      return Number(b.person?.rating) - Number(a.person?.rating);
    });
  } else {
    sorted.sort((a, b) => departureKey(a).localeCompare(departureKey(b)));
  }
  return sorted;
}

function StateBlock({
  art,
  title,
  line,
  action,
}: {
  art: ReactNode;
  title: string;
  line?: string;
  action: ReactNode;
}) {
  return (
    <StateCard>
      {art}
      <h2>{title}</h2>
      {line ? <p>{line}</p> : null}
      {action}
    </StateCard>
  );
}

export function FindRideView({
  profile,
  initialItems,
  initialFailed = false,
  initialForm,
  offersSlot,
}: {
  profile: Profile | null;
  initialItems: HomeTrip[];
  initialFailed?: boolean;
  initialForm: SearchBarValue;
  offersSlot?: ReactNode;
}) {
  const router = useRouter();
  const search = useHomeSearch("passenger", initialItems, initialFailed ? "error" : "ready");
  const [form, setForm] = useState<SearchBarValue>(initialForm);
  const [filters, setFilters] = useState<RideFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("time");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [requestOpen, setRequestOpen] = useState(false);
  const [openSignal, setOpenSignal] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const sortRef = useRef<HTMLButtonElement>(null);
  const lastPhase = useRef(search.phase);

  const canRequest = form.to.trim().length >= 2;
  const activeFilters = filters.times.length + filters.prefs.length;

  const trips = useMemo(
    () => search.items.filter((i): i is HomeTrip => i.kind === "trip"),
    [search.items],
  );

  const visible = useMemo(
    () => sortTrips(applyRideFilters(trips, filters), sort),
    [trips, filters, sort],
  );

  const page = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const remaining = visible.length - page.length;

  useEffect(() => {
    setShown(PAGE);
  }, [filters, sort, trips]);

  useEffect(() => {
    const was = lastPhase.current;
    lastPhase.current = search.phase;
    if (was !== "searching" || search.phase !== "ready") return;
    setRevealing(true);
    const t = window.setTimeout(() => setRevealing(false), 600);
    return () => window.clearTimeout(t);
  }, [search.phase]);

  function runSearch(next: SearchBarValue) {
    setForm(next);
    const params = new URLSearchParams();
    if (next.from.trim()) params.set("from", next.from.trim());
    if (next.to.trim()) params.set("to", next.to.trim());
    if (next.date) params.set("date", next.date);
    if (next.seats > 1) params.set("seats", String(next.seats));
    const qs = params.toString();
    router.replace(qs ? `/home?${qs}` : "/home", { scroll: false });
    void search.run(
      {
        from: next.from,
        to: next.to,
        date: next.date || null,
        departure_time: null,
        preferences: {},
        seats: next.seats,
      },
      { deliberate: true },
    );
  }

  function askDrivers() {
    if (!profile) {
      const back = new URLSearchParams({ from: form.from, to: form.to });
      router.push(`/auth/sign-in?next=${encodeURIComponent(`/home?${back.toString()}`)}`);
      return;
    }
    setRequestOpen(true);
  }

  const heading =
    form.from && form.to
      ? `${form.from} to ${form.to}`
      : form.to
        ? `Rides to ${form.to}`
        : form.from
          ? `Rides from ${form.from}`
          : "Every ride going your way";

  const busy = search.phase === "searching";
  const failed = search.phase === "error";
  const showTools = busy || (!failed && trips.length > 0);
  const sortLabel = SORTS.find((s) => s.key === sort);

  let results: ReactNode;
  if (busy) {
    results = <RideListSkeleton label="Searching rides" />;
  } else if (failed) {
    results = (
      <StateBlock
        art={<BreakArt />}
        title="We couldn't load rides"
        line="Check your connection."
        action={
          <StateAction type="button" onClick={() => runSearch(form)}>
            <ArrowClockwise size={18} aria-hidden /> Try again
          </StateAction>
        }
      />
    );
  } else if (visible.length) {
    results = (
      <>
        <RideList aria-label="Available rides">
          {page.map((t, i) => (
            <RideCard key={t.id} trip={t} order={revealing && i < STAGGERED ? i : null} />
          ))}
        </RideList>

        {remaining > 0 && (
          <MoreWrap>
            <MoreBtn type="button" onClick={() => setShown((n) => n + PAGE)}>
              See more rides
            </MoreBtn>
            <MoreNote aria-live="polite">
              Showing {page.length} of {visible.length}
            </MoreNote>
          </MoreWrap>
        )}
      </>
    );
  } else if (trips.length) {
    results = (
      <StateBlock
        art={<DeadEndArt />}
        title="No rides match these filters"
        action={
          <StateAction type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </StateAction>
        }
      />
    );
  } else if (canRequest) {
    results = (
      <StateBlock
        art={<DeadEndArt />}
        title={`No rides to ${form.to.trim()} yet`}
        line="Drivers will see your request."
        action={
          <StateAction type="button" onClick={askDrivers}>
            Ask drivers for this route <ArrowRight size={18} aria-hidden />
          </StateAction>
        }
      />
    );
  } else {
    results = (
      <StateBlock
        art={<NoRidesArt />}
        title="No rides posted yet"
        line="Pick a destination to see drivers."
        action={
          <StateAction type="button" onClick={() => setOpenSignal((n) => n + 1)}>
            <MagnifyingGlass size={18} aria-hidden /> Choose where you&apos;re going
          </StateAction>
        }
      />
    );
  }

  return (
    <Page>
      <Title>{heading}</Title>

      <FindRideSearchBar
        value={form}
        busy={busy}
        onSubmit={runSearch}
        onClear={() => runSearch({ from: "", to: "", date: "", seats: 1 })}
        openSignal={openSignal}
      />

      <Layout>
        <FilterCol aria-label="Filter rides">
          <RideFilters value={filters} onChange={setFilters} />
        </FilterCol>

        <Results aria-busy={busy}>
          <Head>
            <span aria-live="polite">
              {busy ? (
                "Searching rides…"
              ) : !failed && visible.length ? (
                <>
                  <strong>
                    {visible.length} {visible.length === 1 ? "ride" : "rides"}
                  </strong>{" "}
                  available
                </>
              ) : null}
            </span>
            {showTools && (
              <HeadTools>
                <FilterBtn type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
                  <SlidersHorizontal size={18} aria-hidden />
                  Filters
                  {activeFilters > 0 && <span className="count">{activeFilters}</span>}
                </FilterBtn>
                <SortBtn
                  ref={sortRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <small>Sort</small>
                  {sortLabel?.short}
                </SortBtn>
                <SortGroup role="group" aria-label="Sort rides">
                  {SORTS.map((s) => (
                    <Chip
                      key={s.key}
                      type="button"
                      $on={sort === s.key}
                      aria-pressed={sort === s.key}
                      onClick={() => setSort(s.key)}
                    >
                      {s.label}
                    </Chip>
                  ))}
                </SortGroup>
              </HeadTools>
            )}
          </Head>

          {results}

          {offersSlot ? (
            <Offers aria-label="Offers" data-offers>
              {offersSlot}
            </Offers>
          ) : null}
        </Results>
      </Layout>

      <Drawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter rides"
        footer={
          <DrawerFooter>
            <Half
              type="button"
              $variant="light"
              disabled={!activeFilters}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </Half>
            <Half type="button" $variant="primary" onClick={() => setSheetOpen(false)}>
              Show {visible.length} {visible.length === 1 ? "ride" : "rides"}
            </Half>
          </DrawerFooter>
        }
      >
        <FilterBody>
          <RideFilters value={filters} onChange={setFilters} hideReset />
        </FilterBody>
      </Drawer>

      <Popover
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        anchorRef={sortRef}
        label="Sort rides"
        align="end"
      >
        <SortList>
          {SORTS.map((s) => (
            <PopoverItem
              key={s.key}
              type="button"
              role="menuitemradio"
              aria-checked={sort === s.key}
              onClick={() => {
                setSort(s.key);
                setSortOpen(false);
              }}
            >
              {s.label}
              <Check $on={sort === s.key} aria-hidden />
            </PopoverItem>
          ))}
        </SortList>
      </Popover>

      <RequestRideDrawer
        open={requestOpen}
        from={form.from}
        to={form.to}
        date={form.date}
        seats={form.seats}
        onClose={() => setRequestOpen(false)}
      />
    </Page>
  );
}

const SkHead = styled(Head)`
  .count {
    width: 150px;
  }
`;

const SkTool = styled.span`
  display: none;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${nocturne.line};
  background: ${nocturne.surface};

  &[data-tool="filter"] {
    @media (max-width: 960px) {
      display: block;
      width: 112px;
    }
  }
  &[data-tool="sort"] {
    @media (max-width: 760px) {
      display: block;
    }
  }
  &[data-tool="chips"] {
    display: block;
    width: 400px;
    border: none;
    background: transparent;

    @media (max-width: 760px) {
      display: none;
    }
  }
`;

const SkChips = styled.span`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const SkFilters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .legend {
    margin-bottom: 4px;
  }
  .group {
    height: 20px;
  }
`;

const TitleBone = styled(Shimmer)`
  height: calc(clamp(32px, 5vw, 64px) * 1.05);
  width: min(620px, 82%);

  @media (max-width: 640px) {
    height: calc(clamp(32px, 5vw, 64px) * 2.1);
    width: 78%;
  }
`;

export function FindRideSkeleton() {
  return (
    <Page aria-busy="true" aria-label="Loading rides">
      <TitleBone $r="12px" />
      <SearchBarSkeleton />
      <Layout>
        <FilterCol aria-hidden>
          <SkFilters>
            <span className="legend">
              <Shimmer $w="140px" $h="20px" />
            </span>
            {[0, 1, 2].map((i) => (
              <Shimmer key={`t${i}`} $h="48px" $r="12px" />
            ))}
            <span className="group" />
            <span className="legend">
              <Shimmer $w="120px" $h="20px" />
            </span>
            {[0, 1, 2].map((i) => (
              <Shimmer key={`p${i}`} $h="48px" $r="12px" />
            ))}
          </SkFilters>
        </FilterCol>
        <Results>
          <SkHead aria-hidden>
            <span className="count">
              <Shimmer $w="150px" $h="16px" />
            </span>
            <HeadTools>
              <SkTool data-tool="filter" />
              <SkTool data-tool="sort" />
              <SkTool data-tool="chips">
                <SkChips>
                  <Shimmer $w="170px" $h="44px" $r="999px" />
                  <Shimmer $w="122px" $h="44px" $r="999px" />
                  <Shimmer $w="106px" $h="44px" $r="999px" />
                </SkChips>
              </SkTool>
            </HeadTools>
          </SkHead>
          <RideListSkeleton />
        </Results>
      </Layout>
    </Page>
  );
}
