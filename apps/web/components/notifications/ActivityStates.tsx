"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { ArrowRight, ArrowClockwise } from "@/components/icons";
import { Shimmer } from "@/components/ui/Shimmer";
import { BreakArt } from "@/components/ui/StatusArt";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Art = styled.svg`
  width: 100%;
  max-width: 180px;
  height: auto;

  .ink {
    stroke: ${nocturne.cream};
  }
  .accent {
    stroke: ${nocturne.accent};
  }
  .accent-fill {
    fill: ${nocturne.accent};
  }
  .cta-fill {
    fill: ${nocturne.ctaBg};
  }
  .surface {
    fill: ${nocturne.surface2};
  }
  .ground {
    fill: ${nocturne.cream};
  }
`;

export function ActivityArt() {
  return (
    <Art viewBox="0 0 180 128" aria-hidden="true" focusable="false">
      <ellipse className="ground" cx="90" cy="114" rx="72" ry="8" opacity="0.07" />
      <path
        className="ink"
        d="M22 104 C 62 104, 70 58, 104 54 S 150 30, 160 24"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        className="accent"
        d="M22 104 C 62 104, 70 58, 104 54 S 150 30, 160 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 9"
        opacity="0.7"
      />
      <circle className="accent-fill" cx="22" cy="104" r="7" opacity="0.2" />
      <circle className="accent" cx="22" cy="104" r="7" fill="none" strokeWidth="2.6" />
      <path
        className="cta-fill"
        d="M160 6c-7.2 0-13 5.6-13 12.6C147 28 160 40 160 40s13-12 13-21.4C173 11.6 167.2 6 160 6z"
        opacity="0.9"
      />
      <circle className="surface" cx="160" cy="18.5" r="4.5" />
      <g>
        <rect className="surface" x="80" y="52" width="34" height="16" rx="6" />
        <rect className="ink" x="80" y="52" width="34" height="16" rx="6" fill="none" strokeWidth="2.6" />
        <path className="ink" d="M86 52 l5 -7 h13 l5 7" fill="none" strokeWidth="2" strokeLinejoin="round" />
        <circle className="surface" cx="88" cy="69" r="4" />
        <circle className="ink" cx="88" cy="69" r="4" fill="none" strokeWidth="2.6" />
        <circle className="surface" cx="106" cy="69" r="4" />
        <circle className="ink" cx="106" cy="69" r="4" fill="none" strokeWidth="2.6" />
      </g>
    </Art>
  );
}

const SkelRow = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 8px;
  gap: 12px;
  align-items: start;
  padding: 16px 12px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};

  & + & {
    margin-top: 8px;
  }

  .lines {
    display: grid;
    gap: 2px;
  }
  .line {
    display: flex;
    align-items: center;
    height: 20px;
  }
  .meta {
    display: flex;
    align-items: center;
    height: 16px;
    margin-top: 2px;
  }
`;

export function ActivitySkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <SkelRow key={i}>
          <Shimmer $w="40px" $h="40px" $r="50%" />
          <span className="lines">
            <span className="line">
              <Shimmer $w={i % 2 ? "60%" : "72%"} $h="14px" $r="6px" />
            </span>
            <span className="line">
              <Shimmer $w={i % 3 ? "85%" : "64%"} $h="12px" $r="6px" />
            </span>
            <span className="meta">
              <Shimmer $w="32px" $h="12px" $r="6px" />
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
  filtered,
  compact = false,
  onNavigate,
}: {
  driver: boolean;
  filtered?: string | null;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const go = driver
    ? { href: "/publish", label: "Publish a ride", lead: "Seat requests, payments and trip updates land here." }
    : { href: "/home", label: "Find a ride", lead: "Bookings, payments and trip updates land here." };
  return (
    <StateBox $compact={compact} role="status">
      <ActivityArt />
      <h3>{filtered ? `No ${filtered} yet` : "Nothing yet"}</h3>
      <p>{go.lead}</p>
      <GoLink href={go.href} onClick={onNavigate}>
        {go.label}
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
