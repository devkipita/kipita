"use client";

import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { dash, float, nocturne, pulse } from "@/lib/nocturne";

const Svg = styled.svg<{ $field?: boolean; $tone?: "stopped" }>`
  display: block;
  width: 100%;
  max-width: 180px;
  height: auto;

  .ink {
    stroke: ${({ $field }) => ($field ? nocturne.onGreen : nocturne.cream)};
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .thin {
    stroke-width: 2;
  }
  .ink-fill {
    fill: ${({ $field }) => ($field ? nocturne.onGreen : nocturne.cream)};
    stroke: none;
  }
  .accent {
    stroke: ${({ $field, $tone }) => ($tone === "stopped" ? nocturne.muted2 : $field ? nocturne.lime : nocturne.accent)};
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .accent-fill {
    fill: ${({ $field, $tone }) => ($tone === "stopped" ? nocturne.muted2 : $field ? nocturne.lime : nocturne.accent)};
    stroke: none;
  }
  .on-accent {
    stroke: ${({ $field }) => ($field ? nocturne.greenDeep : nocturne.onGreen)};
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .cta-fill {
    fill: ${nocturne.ctaBg};
    stroke: none;
  }
  .on-cta {
    stroke: ${nocturne.ctaFg};
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .surface {
    fill: ${({ $field }) => ($field ? nocturne.greenDeep : nocturne.surface)};
    stroke: none;
  }
`;

const motion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const Beat = styled.circle`
  transform-box: fill-box;
  transform-origin: center;
  animation: ${pulse} 1.8s ease-in-out infinite;
  ${motion}
`;

const Hover = styled.g`
  animation: ${float} 4.5s ease-in-out infinite;
  ${motion}
`;

const Road = styled.path`
  stroke-dasharray: 10 10;
  animation: ${dash} 1.4s linear infinite;
  ${motion}
`;

function Spot({ children, field, tone }: { children: ReactNode; field?: boolean; tone?: "stopped" }) {
  return (
    <Svg viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false" $field={field} $tone={tone}>
      {children}
    </Svg>
  );
}

function Ground({ cx = 90, rx = 56 }: { cx?: number; rx?: number }) {
  return <ellipse cx={cx} cy="118" rx={rx} ry="5" className="ink-fill" fillOpacity="0.08" />;
}

function Alert({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <Beat cx={cx} cy={cy} r="17" className="accent-fill" fillOpacity="0.18" />
      <circle cx={cx} cy={cy} r="12" className="cta-fill" />
      <path d={`M${cx} ${cy - 5}v5M${cx} ${cy + 5}v.5`} className="on-cta" />
    </g>
  );
}

export function TimeArt() {
  return (
    <Spot>
      <Ground />
      <circle cx="84" cy="66" r="40" className="surface" />
      <circle cx="84" cy="66" r="40" className="ink" />
      <circle cx="84" cy="66" r="40" className="accent-fill" fillOpacity="0.07" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d="M84 31v6" className="ink thin" transform={`rotate(${a} 84 66)`} />
      ))}
      <path d="M84 66 70 56" className="ink" />
      <path d="M84 66V40" className="accent" />
      <circle cx="84" cy="66" r="3.5" className="ink-fill" />
      <path d="M66 18 56 10M102 18l10-8" className="ink thin" />
      <Alert cx={128} cy={34} />
    </Spot>
  );
}

export function DayArt() {
  return (
    <Spot>
      <Ground />
      <rect x="44" y="30" width="88" height="78" rx="12" className="surface" />
      <rect x="44" y="30" width="88" height="78" rx="12" className="ink" />
      <path d="M44 50h88" className="ink thin" />
      <path d="M64 22v14M112 22v14" className="ink" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={56 + c * 18} y={60 + r * 15} width="10" height="8" rx="2.5" className="ink-fill" fillOpacity="0.14" />
        )),
      )}
      <path d="M56 60l10 8M66 60l-10 8M74 60l10 8M84 60l-10 8" className="accent thin" />
      <Alert cx={134} cy={30} />
    </Spot>
  );
}

export function TownsArt() {
  return (
    <Spot>
      <Ground rx={64} />
      <Road d="M22 110c22-26 52-8 68-32s40-30 68-14" className="ink thin" strokeOpacity="0.35" />
      <g>
        <path d="M74 98C60 82 52 70 52 58a22 22 0 0 1 44 0c0 12-8 24-22 40Z" className="accent-fill" fillOpacity="0.16" />
        <path d="M74 98C60 82 52 70 52 58a22 22 0 0 1 44 0c0 12-8 24-22 40Z" className="accent" />
        <circle cx="74" cy="58" r="7" className="accent" />
      </g>
      <Hover>
        <path d="M104 92C92 78 86 68 86 58a18 18 0 0 1 36 0c0 10-6 20-18 34Z" className="cta-fill" />
        <circle cx="104" cy="58" r="6" className="on-cta" />
      </Hover>
    </Spot>
  );
}

export function CarArt() {
  return (
    <Spot>
      <Ground rx={62} />
      <path d="M36 98V82l13-26c3-6 7-9 14-9h44c7 0 11 3 14 9l13 26v16Z" className="accent-fill" fillOpacity="0.14" />
      <path d="M36 98V82l13-26c3-6 7-9 14-9h44c7 0 11 3 14 9l13 26v16Z" className="ink" />
      <path d="M56 62h58l7 16H49Z" className="surface" />
      <path d="M56 62h58l7 16H49Z" className="ink thin" />
      <circle cx="58" cy="100" r="10" className="surface" />
      <circle cx="58" cy="100" r="10" className="ink" />
      <circle cx="112" cy="100" r="10" className="surface" />
      <circle cx="112" cy="100" r="10" className="ink" />
      <rect x="70" y="84" width="30" height="11" rx="3" className="ink thin" strokeDasharray="3 4" />
      <Alert cx={142} cy={34} />
    </Spot>
  );
}

export function IdArt({ state, field }: { state: "none" | "pending" | "rejected" | "live"; field?: boolean }) {
  return (
    <Spot field={field} tone={state === "rejected" ? "stopped" : undefined}>
      <Ground cx={82} rx={60} />
      <rect x="22" y="36" width="96" height="66" rx="12" className="surface" />
      <rect x="22" y="36" width="96" height="66" rx="12" className="ink" />
      <circle cx="48" cy="62" r="11" className="accent-fill" fillOpacity="0.2" />
      <circle cx="48" cy="62" r="11" className="accent" />
      <path d="M33 90a15 15 0 0 1 30 0" className="accent" />
      <path d="M74 58h30M74 70h22M74 82h26" className="ink thin" strokeOpacity="0.4" />
      {state === "pending" && (
        <g>
          <Beat cx="128" cy="78" r="26" className="accent-fill" fillOpacity="0.2" />
          <circle cx="128" cy="78" r="19" className="surface" />
          <circle cx="128" cy="78" r="19" className="accent" />
          <path d="M128 66v12l8 5" className="accent" />
        </g>
      )}
      {state === "none" && (
        <Hover>
          <path d="M128 52l22 9v15c0 15-10 24-22 29-12-5-22-14-22-29V61Z" className="cta-fill" />
          <path d="M119 78l7 7 12-14" className="on-cta" />
        </Hover>
      )}
      {state === "rejected" && (
        <g>
          <circle cx="128" cy="78" r="19" className="surface" />
          <circle cx="128" cy="78" r="19" className="accent" />
          <path d="M121 71l14 14M135 71l-14 14" className="accent" />
        </g>
      )}
      {state === "live" && (
        <g>
          <circle cx="128" cy="78" r="19" className="accent-fill" />
          <path d="M119 78l6 6 12-13" className="on-accent" />
        </g>
      )}
    </Spot>
  );
}

export function OtherArt() {
  return (
    <Spot>
      <Ground rx={66} />
      <path d="M20 108h140" className="ink" />
      <Road d="M34 118h112" className="ink thin" strokeOpacity="0.3" />
      <path d="M78 28h24l20 76H58Z" className="cta-fill" />
      <path d="M72 52h36M66 78h48" className="on-cta" strokeWidth="7" strokeLinecap="butt" />
      <rect x="48" y="100" width="84" height="8" rx="3" className="ink-fill" />
    </Spot>
  );
}
