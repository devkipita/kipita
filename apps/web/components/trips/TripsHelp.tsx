"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Lifebuoy } from "@/components/icons";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Booking } from "@/lib/trips/types";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";

const Panel = styled.aside`
  display: grid;
  padding: 20px 16px 8px;
  border-radius: 20px;
  background: ${nocturne.surface};

  .top {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 8px 4px;
  }
  .badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${nocturne.popoverControl};
    color: ${nocturne.cream};
    --icon-knockout: ${nocturne.popoverControl};
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 20px;
    font-weight: 800;
    line-height: 28px;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  h3 {
    margin: 24px 8px 4px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 15px;
    font-weight: 800;
    line-height: 20px;
    color: ${nocturne.cream};
  }
`;

const AllHelp = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  margin-top: 12px;
  padding: 0 8px;
  border-radius: 12px;
  box-shadow: inset 0 1px 0 ${nocturne.line};
  color: ${nocturne.green};
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .go {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${({ theme }) => theme.color.surfaceContainerLow};
    }
  }
  &:active {
    transform: scale(0.98);
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

export function TripsHelp({ trips }: { trips: Booking[] }) {
  return (
    <Panel aria-labelledby="trips-help">
      <div className="top">
        <span className="badge" aria-hidden>
          <Lifebuoy size={24} />
        </span>
        <h2 id="trips-help">Help with trips</h2>
      </div>
      <h3>Common questions</h3>
      <TripFaqs />
      <h3>Report a problem</h3>
      <SupportPanel trips={trips} />
      <AllHelp href="/help">
        All trip help
        <span className="go" aria-hidden>
          <ArrowRight size={20} />
        </span>
      </AllHelp>
    </Panel>
  );
}
