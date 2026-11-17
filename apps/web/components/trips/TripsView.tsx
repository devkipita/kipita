"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { MagnifyingGlass, PlusCircle } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { GreenHero, HeroGhostLink, HeroPrimaryLink, HeroTicket } from "@/components/ui/GreenHero";
import { nocturne } from "@/lib/nocturne";
import { formatTripDate, formatTripTime } from "@/lib/trips/format";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking, PublishedTrip } from "@/lib/trips/types";
import { BookingCard } from "./BookingCard";
import { PublishedTrips } from "./PublishedTrips";
import { RULE, SectionHead, fs } from "./RideRow";
import { SeatRequests } from "./SeatRequests";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";

type Tab = "current" | "previous";

const Page = styled(ContentWidth)`
  padding-block: 0 72px;
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

const Booked = styled.section`
  margin-top: clamp(48px, 7vh, 72px);
  padding: clamp(32px, 5vh, 48px) 0 clamp(20px, 3vh, 32px);
  background: ${nocturne.surface2};
  box-shadow: 0 0 0 100vmax ${nocturne.surface2};
  clip-path: inset(0 -100vmax);
`;

const TicketLink = styled(HeroGhostLink)`
  margin-top: 16px;
  min-height: 44px;
  padding: 0 18px;
  font-size: 15px;
`;

const Controls = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px 40px;
  margin-top: 14px;
  border-bottom: 1.5px solid ${RULE};

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    border-bottom: none;
  }
`;

const marker = `
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1.5px;
  height: 3px;
  border-radius: 2px;
  transition: background-color 0.16s ease;
`;

const Tabs = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 26px;
  flex: none;

  @media (max-width: 720px) {
    border-bottom: 1.5px solid ${RULE};
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  position: relative;
  min-height: 44px;
  padding: 4px 0 14px;
  border: none;
  background: transparent;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${fs.body};
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  letter-spacing: -0.02em;
  cursor: pointer;
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};
  transition: color 0.16s ease;

  &::after {
    ${marker}
    background: ${({ $active }) => ($active ? nocturne.accent : "transparent")};
  }

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
    }
    &:hover::after {
      background: ${({ $active }) => ($active ? nocturne.accent : RULE)};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Search = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 260px;
  max-width: 400px;
  padding-bottom: 14px;
  cursor: text;

  &::after {
    ${marker}
    background: transparent;
  }

  svg {
    flex: none;
    color: ${nocturne.muted};
    transition: color 0.16s ease;
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 30px;
    border: none;
    background: transparent;
    font: inherit;
    font-size: ${fs.body};
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
  }
  input:focus {
    outline: none;
  }
  input::placeholder {
    color: ${nocturne.muted};
  }
  &::after {
    background: ${RULE};
  }
  &:hover::after {
    background: ${nocturne.accent};
  }
  &:focus-within::after {
    background: ${nocturne.accent};
  }
  &:focus-within svg {
    color: ${nocturne.accent};
  }

  @media (max-width: 720px) {
    flex: 0 0 auto;
    max-width: none;
    padding-top: 14px;
    border-bottom: 1.5px solid ${RULE};
  }
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 6px;
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
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

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
  margin-top: clamp(48px, 7vh, 72px);

  > h2 {
    margin-bottom: 20px;
  }
`;

const HelpGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  align-items: start;

  h3 {
    margin: 0 0 12px;
    font-size: ${fs.meta};
    font-weight: 800;
    color: ${nocturne.muted};
  }

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const LIVE = new Set(["posted", "active", "in_progress"]);

function departsAt(t: PublishedTrip) {
  return `${t.departure_date ?? "9999-12-31"}T${t.departure_time ?? "23:59"}`;
}

function matches(booking: Booking, query: string): boolean {
  if (!query) return true;
  const haystack = [
    booking.trip?.from_location,
    booking.trip?.to_location,
    booking.driver?.full_name,
    booking.passenger?.full_name,
    booking.booking_reference,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
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
  const [tab, setTab] = useState<Tab>("current");
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);
  useBookingStream(
    `my-trips:${viewerId}`,
    viewerId ? `passenger_id=eq.${viewerId}` : null,
    refresh,
  );

  const source = tab === "current" ? current : previous;
  const shown = useMemo(
    () => source.filter((b) => matches(b, query.trim())),
    [source, query],
  );

  const searchable = current.length + previous.length > 0;

  const next = useMemo(
    () =>
      published
        .filter((t) => LIVE.has(t.status))
        .sort((a, b) =>
          a.status === "in_progress" ? -1 : b.status === "in_progress" ? 1 : departsAt(a).localeCompare(departsAt(b)),
        )[0] ?? null,
    [published],
  );

  const lead =
    requests.length > 0
      ? `${requests.length} ${requests.length === 1 ? "passenger is" : "passengers are"} waiting on your answer.`
      : next
        ? next.status === "in_progress"
          ? `You're on the road to ${next.to_location}.`
          : `Your next ride leaves ${formatTripDate(next.departure_date)?.toLowerCase() || "soon"} at ${formatTripTime(next.departure_time) || "the time you set"}.`
        : current.length > 0
          ? `You have ${current.length} ${current.length === 1 ? "trip" : "trips"} coming up.`
          : "Rides you publish and seats you book live here.";

  return (
    <Page $max={1080}>
      <GreenHero
        title="Trips"
        lead={lead}
        actions={
          <>
            <HeroPrimaryLink href="/publish">
              <PlusCircle size={19} /> Publish a ride
            </HeroPrimaryLink>
            <HeroGhostLink href="/home">
              <MagnifyingGlass size={19} /> Find a ride
            </HeroGhostLink>
          </>
        }
        aside={
          next ? (
            <HeroTicket>
              <small>{next.status === "in_progress" ? "Under way" : formatTripDate(next.departure_date) || "Next departure"}</small>
              <b>{formatTripTime(next.departure_time) || "Time to confirm"}</b>
              <p>
                <strong>
                  {next.from_location} to {next.to_location}
                </strong>
                <br />
                {next.seats_taken} of {next.seats_total} seats taken
              </p>
              <TicketLink href={`/ride/${next.id}`}>Open ride</TicketLink>
            </HeroTicket>
          ) : undefined
        }
      />

      <SeatRequests initial={requests} viewerId={viewerId} />
      <PublishedTrips initial={published} />

      <Booked>
      <SectionHead>Seats you booked</SectionHead>
      <Controls>
        <Tabs role="group" aria-label="Which trips">
          <TabButton
            type="button"
            $active={tab === "current"}
            aria-pressed={tab === "current"}
            onClick={() => setTab("current")}
          >
            Current
            {current.length > 0 ? ` (${current.length})` : ""}
          </TabButton>
          <TabButton
            type="button"
            $active={tab === "previous"}
            aria-pressed={tab === "previous"}
            onClick={() => setTab("previous")}
          >
            Previous
            {previous.length > 0 ? ` (${previous.length})` : ""}
          </TabButton>
        </Tabs>

        {searchable && (
          <Search>
            <MagnifyingGlass size={20} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Town, person or reference"
              aria-label="Search trips"
            />
          </Search>
        )}
      </Controls>

      {shown.length > 0 ? (
        <Rows>
          {shown.map((booking) => (
            <BookingCard key={booking.id} booking={booking} viewerId={viewerId} />
          ))}
        </Rows>
      ) : (
        <Empty>
          {query ? (
            <>
              <b>No matches</b>
              <p>Try a town, a person&rsquo;s name, or a booking reference.</p>
            </>
          ) : tab === "current" ? (
            <>
              <b>No trips yet</b>
              <p>
                Book a seat and it appears here, with the driver, the car and
                what you paid.
              </p>
              <Find href="/home">Find a ride</Find>
            </>
          ) : (
            <>
              <b>No past trips</b>
              <p>
                Completed and cancelled trips move here, with their receipts.
              </p>
            </>
          )}
        </Empty>
      )}
      </Booked>

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
