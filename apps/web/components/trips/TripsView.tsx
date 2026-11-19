"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass, X } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatTripDate } from "@/lib/trips/format";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking, PublishedTrip } from "@/lib/trips/types";
import { BookingCard, STATUS } from "./BookingCard";
import { PublishedTrips } from "./PublishedTrips";
import { SectionHead, fs } from "./RideRow";
import { SeatRequests } from "./SeatRequests";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";

type Tab = "current" | "previous" | "incoming";

const Page = styled(ContentWidth)`
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
    padding-bottom: calc(56px + var(--bottom-bar-space, 0px));
  }
`;

const Head = styled.header`
  padding-top: clamp(20px, 4vh, 40px);

  @media (max-width: 960px) {
    padding-top: 0;
  }
`;

const HeadRow = styled.div<{ $open: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  min-height: 50px;

  h1 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 4vw, 40px);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: ${nocturne.cream};
    opacity: ${({ $open }) => ($open ? 0 : 1)};
    transition: opacity ${dur.state} ${ease.standard};
  }

  @media (min-width: 721px) {
    h1 {
      opacity: 1;
    }
  }
`;

const Grow = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 50%;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(100%, 520px);
  height: 48px;
  padding-left: 16px;
  border-radius: 24px;
  background: ${nocturne.surface};
  transform: translateY(-50%);
  clip-path: ${({ $open }) => ($open ? "inset(0 round 24px)" : "inset(0 0 0 calc(100% - 48px) round 24px)")};
  transition: clip-path ${({ $open }) => ($open ? `${dur.enter} ${ease.enter}` : `${dur.exit} ${ease.exit}`)};

  @media (min-width: 721px) {
    width: min(calc(100% - 200px), 520px);
  }

  > svg {
    flex: none;
    color: ${nocturne.muted};
  }
  > button {
    display: grid;
    place-items: center;
    flex: none;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: ${nocturne.cream};
    cursor: pointer;
  }
  > button:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
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
  input:focus {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted2};
  }
  &:focus-within {
    background: ${nocturne.surface};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Found = styled.p`
  margin: 16px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: ${nocturne.muted};
`;

const Booked = styled.section<{ $first: boolean }>`
  margin-top: ${({ $first }) => ($first ? "4px" : "clamp(28px, 5vh, 56px)")};
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: 18px;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Tabs = styled.div<{ $n: number }>`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: ${nocturne.surface2};

  @media (min-width: 721px) {
    width: ${({ $n }) => $n * 150}px;
  }
`;

const Badge = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 12px;
  font-weight: 800;
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? nocturne.surface : "transparent")};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  cursor: pointer;
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};
  font-variant-numeric: tabular-nums;
  transition:
    color ${dur.state} ${ease.standard},
    background-color ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Rows = styled.div`
  display: grid;
  gap: 14px;
  padding-top: 18px;
`;

const Empty = styled.div`
  padding: clamp(40px, 7vh, 72px) 0;
  max-width: 48ch;

  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: ${fs.route};
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${nocturne.cream};
  }
  p {
    margin: 10px 0 0;
    font-size: ${fs.body};
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Find = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 52px;
  margin-top: 22px;
  padding: 0 26px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.body};
  font-weight: 800;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
    }
  }
  &:active {
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
    transform: translateY(1px);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const Section = styled.section`
  margin-top: clamp(36px, 5vh, 56px);

  > h2 {
    margin-bottom: 20px;
  }
`;

const HelpGrid = styled.div`
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

  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) searchRef.current?.focus({ preventScroll: true });
  }, [searching]);

  const closeSearch = () => {
    setQuery("");
    setSearching(false);
  };

  const driving = requests.length > 0 || published.length > 0;

  return (
    <Page $max={1080}>
      <Head>
        <HeadRow $open={searching}>
          <h1>Trips</h1>
          {searchable && (
            <Grow $open={searching}>
              <MagnifyingGlass size={20} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                }}
                tabIndex={searching ? 0 : -1}
                aria-hidden={!searching}
                placeholder="Town, person or reference"
                aria-label="Search trips"
              />
              <button
                type="button"
                aria-label={searching ? "Close search" : "Search trips"}
                aria-expanded={searching}
                onClick={() => (searching ? closeSearch() : setSearching(true))}
              >
                {searching ? <X size={18} weight="bold" /> : <MagnifyingGlass size={20} />}
              </button>
            </Grow>
          )}
        </HeadRow>
      </Head>

      <Booked $first>
      <Controls>
        <Tabs role="group" aria-label="Which trips" $n={driving ? 3 : 2}>
          <TabButton
            type="button"
            $active={tab === "current"}
            aria-pressed={tab === "current"}
            onClick={() => setTab("current")}
          >
            Current
            {current.length > 0 ? ` ${current.length}` : ""}
          </TabButton>
          <TabButton
            type="button"
            $active={tab === "previous"}
            aria-pressed={tab === "previous"}
            onClick={() => setTab("previous")}
          >
            Previous
            {previous.length > 0 ? ` ${previous.length}` : ""}
          </TabButton>
          {driving && (
            <TabButton
              type="button"
              $active={tab === "incoming"}
              aria-pressed={tab === "incoming"}
              onClick={() => setTab("incoming")}
            >
              Incoming
              {incoming > 0 && <Badge>{incoming}</Badge>}
            </TabButton>
          )}
        </Tabs>
      </Controls>

      {words.length > 0 && (
        <Found role="status">
          {shown.length} {shown.length === 1 ? "trip" : "trips"} match &ldquo;{query.trim()}&rdquo;
        </Found>
      )}

      {tab === "incoming" && words.length === 0 ? (
        <SeatRequests initial={requests} viewerId={viewerId} onCount={setIncoming} />
      ) : shown.length > 0 ? (
        <Rows>
          {shown.map((booking) => (
            <BookingCard key={booking.id} booking={booking} viewerId={viewerId} />
          ))}
        </Rows>
      ) : (
        <Empty>
          {words.length > 0 ? (
            <b>Try a town, a name, a date or a booking reference</b>
          ) : tab === "current" ? (
            <>
              <b>No trips yet</b>
              <Find href="/home">Find a ride</Find>
            </>
          ) : (
            <b>No past trips</b>
          )}
        </Empty>
      )}
      </Booked>

      <PublishedTrips initial={published} />

      <Section id="help">
        <SectionHead>Need help?</SectionHead>
        <HelpGrid>
          <div>
            <h3>Common questions</h3>
            <TripFaqs />
          </div>
          <div>
            <h3>Report a problem</h3>
            <SupportPanel trips={[...current, ...previous]} />
          </div>
        </HelpGrid>
      </Section>
    </Page>
  );
}
