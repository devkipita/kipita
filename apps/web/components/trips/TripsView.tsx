"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { MagnifyingGlass } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import type { Booking } from "@/lib/trips/types";
import { BookingCard } from "./BookingCard";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";

type Tab = "current" | "previous";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const Page = styled(ContentWidth)`
  padding-block: clamp(22px, 4vh, 40px) 72px;
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

const Title = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(34px, 5.4vw, 60px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.038em;
  color: ${nocturne.cream};
`;

const Controls = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px 40px;
  margin-top: clamp(22px, 3vh, 32px);
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
  font-size: 19px;
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
  &:hover::after {
    background: ${RULE};
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

  > * + *::before {
    content: "";
    position: absolute;
    top: 0;
    left: 14px;
    right: 14px;
    height: 1.5px;
    background: ${RULE};
  }
`;

const Empty = styled.div`
  padding: clamp(40px, 7vh, 72px) 0;
  max-width: 48ch;

  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(22px, 2.6vw, 28px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${nocturne.cream};
  }
  p {
    margin: 10px 0 0;
    font-size: 17px;
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
  font-size: 17px;
  font-weight: 700;
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
  margin-top: clamp(44px, 7vh, 80px);
  padding-top: clamp(28px, 4vh, 40px);
  border-top: 1.5px solid ${RULE};

  > h2 {
    margin: 0 0 18px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 800;
    letter-spacing: -0.033em;
    line-height: 1.08;
    color: ${nocturne.cream};
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
    <Page $max={1080}>
      <Title>Trips</Title>

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

      <Section>
        <h2>Common questions</h2>
        <TripFaqs />
      </Section>

      <Section id="help">
        <h2>Contact support</h2>
        <SupportPanel trips={[...current, ...previous]} />
      </Section>
    </Page>
  );
}
