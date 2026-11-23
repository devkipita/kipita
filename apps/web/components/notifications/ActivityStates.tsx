"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { ArrowRight, ArrowClockwise } from "@/components/icons";
import { Shimmer } from "@/components/ui/Shimmer";
import { BreakArt } from "@/components/ui/StatusArt";
import { HappyEyes, Mascot, NoTripsArt, OpenEyes, SceneSvg } from "@/components/trips/TripsArt";
import { dur, ease, nocturne } from "@/lib/nocturne";

export type EmptyKind = "all" | "trips" | "payments" | "alerts";

const ArtSlot = styled.div<{ $compact: boolean }>`
  display: grid;
  place-items: center;
  width: 100%;
  max-width: ${({ $compact }) => ($compact ? 200 : 260)}px;
`;

function BellArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <OpenEyes />
      <path className="ink" strokeWidth="2" d="M246 46c-4 5-4 13 0 18M316 46c4 5 4 13 0 18" />
      <path className="ink" strokeWidth="2.6" d="M281 22v8" />
      <path
        className="cta-fill ink"
        strokeWidth="2.6"
        d="M281 30c-13 0-21 10-21 23v15l-7 10h56l-7-10V53c0-13-8-23-21-23Z"
      />
      <path className="on-cta" strokeWidth="2" d="M270 52c1-5 4-9 8-11" />
      <circle className="ink-fill ink" strokeWidth="2.6" cx="281" cy="86" r="6" />
    </SceneSvg>
  );
}

function WalletArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <OpenEyes />
      <circle className="tint ink" strokeWidth="2.6" cx="278" cy="66" r="12" />
      <path className="ink" strokeWidth="2" d="M278 60v12" />
      <path className="ink" strokeWidth="2" strokeDasharray="3 6" d="M278 84v16" />
      <path
        className="cta-fill ink"
        strokeWidth="2.6"
        d="M254 108h48c4.4 0 8 3.6 8 8v22c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8v-22c0-4.4 3.6-8 8-8Z"
      />
      <path className="on-cta" strokeWidth="2" d="M246 120h64" />
      <path className="tint ink" strokeWidth="2.6" d="M294 126h16v12h-16c-3.3 0-6-2.7-6-6s2.7-6 6-6Z" />
      <circle className="ink-fill" cx="295" cy="132" r="2" />
    </SceneSvg>
  );
}

function ClearRoadArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <HappyEyes />
      <path className="ink" strokeWidth="2.6" d="M282 146V76" />
      <circle className="cta-fill ink" strokeWidth="2.6" cx="282" cy="52" r="24" />
      <path className="on-cta" strokeWidth="3.2" d="m271 52 8 8 14-15" />
    </SceneSvg>
  );
}

function EmptyArt({ kind }: { kind: EmptyKind }) {
  if (kind === "trips") return <NoTripsArt />;
  if (kind === "payments") return <WalletArt />;
  if (kind === "alerts") return <ClearRoadArt />;
  return <BellArt />;
}

type EmptyCopy = { title: string; lead: string; href: string; label: string };

function emptyCopy(kind: EmptyKind, driver: boolean): EmptyCopy {
  const start = driver
    ? { href: "/publish", label: "Publish a ride" }
    : { href: "/home", label: "Find a ride" };
  switch (kind) {
    case "trips":
      return {
        title: "No trip updates yet",
        lead: driver
          ? "Publish a ride and seat requests show up here."
          : "Book a seat and every step of the trip shows up here.",
        ...start,
      };
    case "payments":
      return driver
        ? { title: "No payments yet", lead: "Fares you earn and payouts show up here.", href: "/wallet", label: "Open wallet" }
        : { title: "No payments yet", lead: "Fares you pay, refunds and wallet top-ups show up here.", ...start };
    case "alerts":
      return {
        title: "Roads are quiet",
        lead: "Alerts on the roads you travel show up here.",
        href: "/alerts",
        label: "See road alerts",
      };
    default:
      return {
        title: "Nothing yet",
        lead: driver
          ? "Seat requests, payments and trip updates show up here."
          : "Bookings, payments and trip updates show up here.",
        ...start,
      };
  }
}
const SkelRow = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};

  & + & {
    margin-top: 8px;
  }

  .lines {
    display: grid;
    gap: 4px;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 24px;
  }
  .line {
    display: flex;
    align-items: center;
    height: 20px;
  }
`;

export function ActivitySkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <SkelRow key={i}>
          <Shimmer $w="44px" $h="44px" $r="50%" />
          <span className="lines">
            <span className="top">
              <Shimmer $w={i % 2 ? "52%" : "64%"} $h="16px" $r="6px" />
              <Shimmer $w="28px" $h="12px" $r="6px" />
            </span>
            <span className="line">
              <Shimmer $w={i % 3 ? "85%" : "64%"} $h="12px" $r="6px" />
            </span>
          </span>
        </SkelRow>
      ))}
    </div>
  );
}

const StateBox = styled.div<{ $compact: boolean }>`
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: ${({ $compact }) => ($compact ? "20px 16px 24px" : "40px 16px 48px")};
  text-align: center;

  h3 {
    margin: 4px 0 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: ${({ $compact }) => ($compact ? "17px" : "21px")};
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    max-width: 30ch;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
  }
`;

const ErrorArt = styled.div`
  width: 100%;
  max-width: 200px;
  color: ${nocturne.cream};
`;

const actionInteractive = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 20px;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

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

const GoLink = styled(Link)`
  ${actionInteractive}
  border: 0;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
`;

const RetryButton = styled.button`
  ${actionInteractive}
  border: 2px solid ${nocturne.green};
  background: ${nocturne.surface};
  color: ${nocturne.green};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
`;

export function ActivityEmpty({
  driver,
  kind = "all",
  compact = false,
  onNavigate,
}: {
  driver: boolean;
  kind?: EmptyKind;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const copy = emptyCopy(kind, driver);
  return (
    <StateBox $compact={compact} role="status">
      <ArtSlot $compact={compact}>
        <EmptyArt kind={kind} />
      </ArtSlot>
      <h3>{copy.title}</h3>
      <p>{copy.lead}</p>
      <GoLink href={copy.href} onClick={onNavigate}>
        {copy.label}
        <ArrowRight size={20} weight="bold" />
      </GoLink>
    </StateBox>
  );
}
export function ActivityError({
  onRetry,
  compact = false,
}: {
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <StateBox $compact={compact} role="alert">
      <ErrorArt>
        <BreakArt />
      </ErrorArt>
      <h3>Activity didn&apos;t load</h3>
      <p>Check your connection, then try again.</p>
      <RetryButton type="button" onClick={onRetry}>
        <ArrowClockwise size={20} weight="bold" />
        Reload activity
      </RetryButton>
    </StateBox>
  );
}
