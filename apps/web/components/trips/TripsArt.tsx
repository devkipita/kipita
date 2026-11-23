"use client";

import styled, { keyframes } from "styled-components";
import { dash, dur, ease, nocturne } from "@/lib/nocturne";

const typing = keyframes`
  0%, 60%, 100% { opacity: 0.35; }
  30% { opacity: 1; }
`;

export const SceneSvg = styled.svg`
  display: block;
  width: 100%;
  max-width: 240px;
  height: auto;

  .ink {
    stroke: ${nocturne.cream};
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ink-fill {
    fill: ${nocturne.cream};
  }
  .tint {
    fill: ${nocturne.accent};
    fill-opacity: 0.15;
  }
  .ground {
    fill: ${nocturne.cream};
    fill-opacity: 0.07;
  }
  .cta-fill {
    fill: ${nocturne.ctaBg};
  }
  .on-cta {
    stroke: ${nocturne.ctaFg};
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .flow {
    animation: ${dash} calc(${dur.max} * 4) linear infinite;
  }
  .dot {
    animation: ${typing} calc(${dur.max} * 3) ${ease.standard} infinite;
  }
  .dot:nth-of-type(2) {
    animation-delay: calc(${dur.max} * 0.4);
  }
  .dot:nth-of-type(3) {
    animation-delay: calc(${dur.max} * 0.8);
  }

  @media (prefers-reduced-motion: reduce) {
    .flow,
    .dot {
      animation: none;
    }
  }
`;

export function Mascot() {
  return (
    <>
      <path className="ground" d="M133 153c55.8 0 101-3.1 101-7s-45.2-7-101-7-101 3.1-101 7 45.2 7 101 7Z" />
      <path
        className="tint ink"
        strokeWidth="2.6"
        d="m57 96 13-3 10-18c5-9 14-13 27-13h29c13 0 21 6 29 16l12 15 24 3c14 2 23 9 23 20v5c0 6-5 9-13 9H55c-10 0-15-5-15-13v-7c0-7 6-12 17-14Z"
      />
      <path className="tint ink" strokeWidth="2.6" d="M107 71h-5c-8 0-12 4-16 11l-6 11h33V71h-6Z" />
      <path className="tint ink" strokeWidth="2.6" d="M123 71h12c9 0 14 4 20 11l9 11h-41V71Z" />
      <path className="ink" strokeWidth="2.6" d="M124 103h10M43 108h6" />
      <circle className="ink-fill ink" strokeWidth="2.6" cx="75" cy="130" r="16" />
      <circle className="tint" cx="75" cy="130" r="8" />
      <circle className="ink-fill ink" strokeWidth="2.6" cx="184" cy="130" r="16" />
      <circle className="tint" cx="184" cy="130" r="8" />
    </>
  );
}

export function OpenEyes() {
  return (
    <>
      <circle className="ink-fill" cx="200" cy="105" r="3" />
      <circle className="ink-fill" cx="214" cy="105" r="3" />
      <path className="ink" strokeWidth="2.6" d="M203 115c2.7 2.7 5.7 2.7 9 0" />
    </>
  );
}

export function HappyEyes() {
  return (
    <path
      className="ink"
      strokeWidth="2.6"
      d="M195 105c2.7 2.7 5.3 2.7 8 0m8 1c2.7 2.7 5.3 2.7 8 0m-15 10c2.7 2.7 5.7 2.7 9 0"
    />
  );
}

export function NoTripsArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <OpenEyes />
      <path className="ink flow" strokeWidth="2.6" strokeDasharray="6 8" d="M236 146h44" />
      <path className="ink" strokeWidth="2.6" d="M282 84v62" />
      <path
        className="cta-fill ink"
        strokeWidth="2.6"
        d="M282 24c-13 0-23 10-23 22.5C259 63 282 84 282 84s23-21 23-37.5C305 34 295 24 282 24Z"
      />
      <circle className="ink" strokeWidth="2.6" cx="282" cy="46" r="7.5" />
    </SceneSvg>
  );
}

export function NoPastArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <HappyEyes />
      <path className="ink" strokeWidth="2.6" d="M262 146V34" />
      <path className="cta-fill ink" strokeWidth="2.6" d="M262 36h42l-9 14 9 14h-42V36Z" />
      <path className="ink" strokeWidth="2" d="M276 36v28M290 36v28M262 50h33" />
    </SceneSvg>
  );
}

export function RideStoppedArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <circle className="ink-fill" cx="200" cy="106" r="3" />
      <circle className="ink-fill" cx="214" cy="106" r="3" />
      <path className="ink" strokeWidth="2.6" d="M203 116h9" />
      <path className="ink" strokeWidth="2.6" d="M272 82v64" />
      <path className="cta-fill ink" strokeWidth="2.6" d="M272 81a24 24 0 1 0 0-48 24 24 0 0 0 0 48Z" />
      <path className="on-cta" strokeWidth="3.4" d="M282 69V52c0-12-19-12-19 0v13m-7-6 7 7 7-7" />
    </SceneSvg>
  );
}

export function NoRequestsArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <OpenEyes />
      <path
        className="cta-fill ink"
        strokeWidth="2.6"
        d="M252 26h40c10 0 16 6 16 16v12c0 10-6 16-16 16h-24l-14 10 3-10h-5c-10 0-16-6-16-16V42c0-10 6-16 16-16Z"
      />
      <g>
        <circle className="ink-fill dot" cx="256" cy="48" r="3.5" />
        <circle className="ink-fill dot" cx="272" cy="48" r="3.5" />
        <circle className="ink-fill dot" cx="288" cy="48" r="3.5" />
      </g>
    </SceneSvg>
  );
}
