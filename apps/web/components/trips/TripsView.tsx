"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass, X } from "@/components/icons";
import { IconAction } from "@/components/ui/Chip";
import { ContentWidth } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatTripDate } from "@/lib/trips/format";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking, PublishedTrip } from "@/lib/trips/types";
import { BookingCard, STATUS } from "./BookingCard";
import { PublishedTrips } from "./PublishedTrips";
import { AnimatePresence, m } from "motion/react";
import { Count, fs } from "./RideRow";
import { RollingNumber } from "@/components/ui/Counter";
import { TabIndicator } from "@/components/ui/TabIndicator";
import { tween } from "@/lib/motion";
import type { TripRoute } from "@/lib/maps/types";
import { PastTrips, pastEntries } from "./PastTrips";
import { TripsHelp } from "./TripsHelp";
import { NoPastArt, NoRequestsArt, NoTripsArt } from "./TripsArt";
import { SeatRequests } from "./SeatRequests";

type Tab = "current" | "previous" | "incoming";

export const Page = styled(ContentWidth)`
  padding-block: 0 72px;
  padding-left: max(16px, var(--page-pad), env(safe-area-inset-left));
  padding-right: max(16px, var(--page-pad), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 960px) {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
    padding-bottom: calc(24px + var(--bottom-bar-space, 0px));
  }
`;

export const Head = styled.header`
  padding-top: 32px;

  @media (max-width: 960px) {
    padding-top: 12px;
  }
`;

export const HeadRow = styled.div<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;

  h1 {
    flex: 1;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 48px;
    color: ${nocturne.cream};
  }

  @media (max-width: 960px) {
    min-height: 0;
  }
`;

const Search = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(100%, 360px);
  height: 48px;
  padding: 0 4px 0 16px;
  border-radius: 24px;
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  color: ${nocturne.muted};
  transition: box-shadow ${dur.state} ${ease.standard};

  > svg {
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 16px;
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
  }
  input:focus-visible {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted2};
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  &:focus-within {
    box-shadow: inset 0 0 0 2px ${nocturne.accent};
  }

  @media (max-width: 960px) {
    width: 100%;
    height: 44px;
  }
`;
const Found = styled.p`
  margin: 16px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.muted};
`;

export const Booked = styled.section<{ $first: boolean }>`
  margin-top: ${({ $first }) => ($first ? "4px" : "clamp(28px, 5vh, 56px)")};
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: 16px;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const Tabs = styled.div`
  display: flex;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

export const TabButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    color ${dur.state} ${ease.standard},
    background-color ${dur.state} ${ease.standard};

  .text,
  .count {
    position: relative;
    z-index: 1;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.cream};
      background-color: color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    background-color: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
  }
`;

const Needs = styled(Count)`
  background: ${({ theme }) => theme.color.warningContainer};
  color: ${({ theme }) => theme.color.onWarningContainer};
`;
const Rows = styled.div`
  display: grid;
  gap: 12px;
  padding-top: 16px;
`;

const Empty = styled.div`
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  margin-top: 16px;
  padding: 24px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};

  .art svg {
    display: block;
    width: 100%;
    height: auto;
  }
  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: ${fs.route};
    font-weight: 800;
    line-height: 28px;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  p {
    margin: 4px 0 0;
    max-width: 48ch;
    font-size: ${fs.body};
    line-height: 24px;
    color: ${nocturne.muted};
  }

  @media (max-width: 600px) {
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 12px;
    margin-top: 12px;
    padding: 16px 12px;

    b {
      font-size: 17px;
      line-height: 24px;
    }
    p {
      font-size: 14px;
      line-height: 20px;
    }
  }
`;

const Find = styled(Link)<{ $tonal?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 16px;
  padding: 0 24px;
  border-radius: 999px;
  background: ${({ $tonal, theme }) => ($tonal ? theme.tone.lav.bg : nocturne.ctaBg)};
  color: ${({ $tonal, theme }) => ($tonal ? theme.tone.lav.on : nocturne.ctaFg)};
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition:
    filter ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      filter: brightness(0.95);
    }
  }
  &:active {
    filter: brightness(0.9);
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
export const Section = styled.section`
  margin-top: clamp(36px, 5vh, 56px);

  > h2 {
    margin-bottom: 20px;
  }
`;

export const HelpGrid = styled.div`
  display: grid;
  gap: 40px;

  h3 {
    margin: 0 0 8px;
    font-size: ${fs.meta};
    font-weight: 800;
    color: ${nocturne.muted};
  }

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Layout = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 32px;
  margin-top: 24px;

  @media (max-width: 960px) {
    gap: 20px;
    margin-top: 12px;
  }
`;

const MainCol = styled.div`
  flex: 999 1 600px;
  min-width: 0;
  display: grid;
  gap: 32px;

  @media (max-width: 960px) {
    gap: 20px;
  }
`;

const Aside = styled.aside`
  flex: 0 0 380px;
  max-width: 380px;
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 16px);

  @media (max-width: 1023px) {
    position: static;
    flex: 1 1 100%;
    max-width: none;
  }
`;

function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function haystack(b: Booking) {
  return fold(
    [
      b.trip?.from_location,
      b.trip?.to_location,
      b.driver?.full_name,
      b.passenger?.full_name,
      b.booking_reference,
      STATUS[b.status]?.label,
      formatTripDate(b.trip?.departure_date ?? null),
      b.trip?.departure_date,
      b.trip?.vehicle?.plate_number,
      b.trip?.vehicle?.plate_number?.replace(/\s+/g, ""),
      String(b.total_price),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matches(b: Booking, words: string[]) {
  const hay = haystack(b);
  return words.every((w) => hay.includes(w));
}

export function TripsView({
  liveRoute,
  current,
  previous,
  requests = [],
  published = [],
  viewerId,
}: {
  current: Booking[];
  previous: Booking[];
  requests?: Booking[];
  published?: PublishedTrip[];
  viewerId: string;
  liveRoute?: Promise<TripRoute | null>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(requests.length > 0 ? "incoming" : "current");
  const [incoming, setIncoming] = useState(requests.length);
  const [query, setQuery] = useState("");

  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => router.refresh(), 400);
  }, [router]);
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);
  useBookingStream(
    `my-drives:${viewerId}`,
    viewerId && published.length > 0 ? `driver_id=eq.${viewerId}` : null,
    refresh,
  );
  useBookingStream(
    `my-trips:${viewerId}`,
    viewerId ? `passenger_id=eq.${viewerId}` : null,
    refresh,
  );

  const words = useMemo(() => fold(query).split(/\s+/).filter(Boolean), [query]);
  const everything = useMemo(() => {
    const seen = new Set<string>();
    return [...current, ...requests, ...previous].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
  }, [current, requests, previous]);

  const shown = useMemo(
    () =>
      words.length > 0
        ? everything.filter((b) => matches(b, words))
        : tab === "current"
          ? current
          : previous,
    [words, everything, tab, current, previous],
  );

  const searchable = everything.length > 0;

  const closeSearch = () => setQuery("");


  const isDriver = published.length > 0 || requests.length > 0;
  const upcomingEmpty = (
    <EmptyState
      art={<NoTripsArt />}
      title="No trips booked"
      line="Your bookings appear here."
      action={<Find href="/home" $tonal={isDriver}>Find a ride</Find>}
    />
  );

  let body: React.ReactNode;
  if (words.length > 0) {
    body =
      shown.length > 0 ? (
        <Rows>
          {shown.map((booking) => (
            <BookingCard key={booking.id} booking={booking} viewerId={viewerId} />
          ))}
        </Rows>
      ) : (
        <EmptyState
          art={<NoTripsArt />}
          title={`No trips match "${query.trim()}"`}
          line="Try a town, name or date."
        />
      );
  } else if (tab === "incoming") {
    body = (
      <SeatRequests
        initial={requests}
        viewerId={viewerId}
        onCount={setIncoming}
        empty={
          <EmptyState
            art={<NoRequestsArt />}
            title="No seat requests right now"
            line="Seat requests appear here."
          />
        }
      />
    );
  } else if (tab === "previous") {
    body =
      previous.length > 0 ? (
        <PastTrips bookings={previous} viewerId={viewerId} />
      ) : (
        <EmptyState
          art={<NoPastArt />}
          title="No past trips yet"
          line="Past trips appear here."
        />
      );
  } else {
    body =
      current.length > 0 ? (
        <Rows>
          {current.map((booking) => (
            <BookingCard key={booking.id} booking={booking} viewerId={viewerId} />
          ))}
        </Rows>
      ) : (
        upcomingEmpty
      );
  }

  return (
    <Page $max={1320}>
      <Head>
        <HeadRow>
          <h1 data-bar-title="">Trips</h1>
          {searchable && (
            <Search>
              <MagnifyingGlass size={20} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                }}
                placeholder="Search a town, person or booking ref"
                aria-label="Search trips"
              />
              {query && (
                <IconAction type="button" aria-label="Clear search" title="Clear search" onClick={closeSearch}>
                  <X size={20} aria-hidden />
                </IconAction>
              )}
            </Search>
          )}
        </HeadRow>
      </Head>

      <Layout>
        <MainCol>
          <PublishedTrips initial={published} liveRoute={liveRoute} />

          <Booked $first={published.length === 0}>
            <Controls>
              <Tabs role="tablist" aria-label="Which trips">
                {(
                  [
                    { key: "current", label: "Upcoming", n: current.length },
                    { key: "previous", label: "Past", n: pastEntries(previous, viewerId).length },
                    ...(isDriver ? [{ key: "incoming", label: "Requests", n: incoming }] : []),
                  ] as { key: Tab; label: string; n: number }[]
                ).map((t) => {
                  const active = tab === t.key && words.length === 0;
                  const Badge = t.key === "incoming" ? Needs : Count;
                  return (
                    <TabButton
                      key={t.key}
                      type="button"
                      role="tab"
                      $active={active}
                      aria-selected={active}
                      onClick={() => {
                        setTab(t.key);
                        if (words.length > 0) closeSearch();
                      }}
                    >
                      {active && <TabIndicator group="trips" tone="underline" />}
                      <span className="text">{t.label}</span>
                      {t.n > 0 && (
                        <Badge className="count">
                          <RollingNumber value={t.n} />
                        </Badge>
                      )}
                    </TabButton>
                  );
                })}
              </Tabs>
            </Controls>

            {words.length > 0 && (
              <Found role="status">
                <RollingNumber value={shown.length} /> {shown.length === 1 ? "trip" : "trips"} match &ldquo;{query.trim()}&rdquo;
              </Found>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={words.length > 0 ? "search" : tab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: tween.enter }}
                exit={{ opacity: 0, transition: tween.exit }}
              >
                {body}
              </m.div>
            </AnimatePresence>
          </Booked>
        </MainCol>

        <Aside aria-label="Help with trips">
          <TripsHelp trips={[...current, ...previous]} />
        </Aside>
      </Layout>
    </Page>
  );
}

function EmptyState({
  art,
  title,
  line,
  action,
}: {
  art: React.ReactNode;
  title: string;
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty>
      <div className="art">{art}</div>
      <div>
        <b>{title}</b>
        <p>{line}</p>
        {action}
      </div>
    </Empty>
  );
}
