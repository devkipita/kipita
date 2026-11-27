"use client";

import Link from "next/link";
import styled from "styled-components";
import { ArrowRight } from "@/components/icons";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Booking } from "@/lib/trips/types";
import { SupportPanel } from "./SupportPanel";
import { TripFaqs } from "./TripFaqs";

const Panel = styled.aside`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  h2 {
    margin: 0 4px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
  }
  h3 {
    margin: 8px 4px 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 20px;
    color: ${nocturne.muted};
  }
`;

const AllHelp = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  color: ${nocturne.accent};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: color-mix(in oklab, ${nocturne.cream} 6%, transparent);
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
      <h2 id="trips-help">Help with trips</h2>
      <TripFaqs />
      <h3>Report a problem</h3>
      <SupportPanel trips={trips} />
      <AllHelp href="/help">
        All trip help
        <ArrowRight size={16} aria-hidden />
      </AllHelp>
    </Panel>
  );
}
