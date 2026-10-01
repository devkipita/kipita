"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { MagnifyingGlass } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { ButtonLink } from "@/components/ui/primitives";
import type { Booking } from "@/lib/trips/types";
import { BookingCard } from "./BookingCard";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";
import { WhyKipita } from "./WhyKipita";

type Tab = "current" | "previous";

/*
 * A plain column, not a ContentWidth. Each band opts into the measure it wants,
 * which lets the Why-Kipita section run the full width of the content column
 * the way the rest of the page cannot.
 */
const Page = styled.div`
  padding-block: 24px 64px;
  display: grid;
  gap: 40px;
`;

const Band = styled(ContentWidth)`
  display: grid;
  gap: 14px;
`;

const Head = styled.header`
  display: grid;
  gap: 16px;

  /* Size carries the hierarchy, not weight — the display face is legible at
     500 and a heavy small heading reads as shouting instead of structure. */
  h1 {
    margin: 0;
    font-size: clamp(2.4rem, 5vw, 3.4rem);
    font-weight: 500;
    letter-spacing: -0.035em;
    line-height: 1.04;
    color: ${({ theme }) => theme.color.onSurface};
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 6px;
  flex: none;
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surfaceContainerLow};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.onSurfaceVariant};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.color.primaryContainer : theme.color.surfaceContainer};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Search = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 220px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.color.onSurface};
  }
  input:focus {
    outline: none;
  }
  svg {
    flex: none;
  }
`;

const Section = styled.section`
  display: grid;
  gap: 14px;

  > h2 {
    margin: 0;
    font-size: clamp(1.85rem, 3.4vw, 2.5rem);
    font-weight: 500;
    letter-spacing: -0.032em;
    line-height: 1.06;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: ${({ theme }) => theme.space.lg};

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Empty = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 28px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  b {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    max-width: 48ch;
    font-size: 0.95rem;
    line-height: 1.55;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  a {
    margin-top: 6px;
  }
`;

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
  viewerId,
}: {
  current: Booking[];
  previous: Booking[];
  viewerId: string;
}) {
  const [tab, setTab] = useState<Tab>("current");
  const [query, setQuery] = useState("");

  const source = tab === "current" ? current : previous;
  const shown = useMemo(
    () => source.filter((b) => matches(b, query.trim())),
    [source, query],
  );

  const searchable = current.length + previous.length > 0;

  return (
    <Page>
      <Band $max={1080}>
        <Head>
        <h1>Trips</h1>
        <div className="controls">
          <Tabs role="group" aria-label="Which trips">
            <TabButton
              type="button"
              $active={tab === "current"}
              aria-pressed={tab === "current"}
              onClick={() => setTab("current")}
            >
              Current
            </TabButton>
            <TabButton
              type="button"
              $active={tab === "previous"}
              aria-pressed={tab === "previous"}
              onClick={() => setTab("previous")}
            >
              Previous
            </TabButton>
          </Tabs>

          {searchable && (
            <Search>
              <MagnifyingGlass size={18} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by town, person or reference"
                aria-label="Search trips"
              />
            </Search>
          )}
          </div>
        </Head>
      </Band>

      <Band $max={1080}>
      {shown.length > 0 ? (
        <Cards>
          {shown.map((booking) => (
            <BookingCard key={booking.id} booking={booking} viewerId={viewerId} />
          ))}
        </Cards>
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
              <p>Book a seat and it appears here.</p>
              <ButtonLink href="/home" $compact>
                Find a ride
              </ButtonLink>
            </>
          ) : (
            <>
              <b>No past trips</b>
              <p>Completed and cancelled trips move here, with their receipts.</p>
            </>
          )}
        </Empty>
      )}
      </Band>

      <WhyKipita />

      <Band $max={1080}>
        <Section>
          <h2>Common questions</h2>
          <TripFaqs />
        </Section>
      </Band>

      <Band $max={1080}>
        <Section id="help">
          <h2>Contact support</h2>
          <SupportPanel trips={[...current, ...previous]} />
        </Section>
      </Band>
    </Page>
  );
}
