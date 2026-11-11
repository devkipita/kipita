"use client";

import type { ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { dash, float, nocturne, pulse } from "@/lib/nocturne";

const Svg = styled.svg<{ $tone?: "stopped" }>`
  display: block;
  width: 100%;
  max-width: 340px;
  height: auto;

  .ink {
    stroke: ${nocturne.cream};
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .thin {
    stroke-width: 2;
  }
  .ink-fill {
    fill: ${nocturne.cream};
    stroke: none;
  }
  .accent {
    stroke: ${({ $tone }) =>
      $tone === "stopped" ? nocturne.muted2 : nocturne.accent};
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
  .accent-fill {
    fill: ${({ $tone }) =>
      $tone === "stopped" ? nocturne.muted2 : nocturne.accent};
    stroke: none;
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
    fill: ${nocturne.surface2};
    stroke: none;
  }
`;

const motion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const Road = styled.path`
  stroke-dasharray: 14 12;
  animation: ${dash} 1.1s linear infinite;
  ${motion}
`;

const Beat = styled.circle`
  transform-origin: center;
  animation: ${pulse} 1.8s ease-in-out infinite;
  ${motion}
`;

const Hover = styled.g`
  animation: ${float} 4.5s ease-in-out infinite;
  ${motion}
`;

const wind = keyframes`
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -208; }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.35; transform: scale(0.76); }
`;

const Winder = styled.path`
  transform-origin: center;
  animation: ${wind} 6s linear infinite;
  ${motion}
`;

const Twinkle = styled.circle`
  transform-origin: center;
  transform-box: fill-box;
  animation: ${twinkle} 2.2s ease-in-out infinite;
  ${motion}
`;

function Scene({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "stopped";
}) {
  return (
    <Svg viewBox="0 0 320 180" fill="none" aria-hidden="true" $tone={tone}>
      {children}
    </Svg>
  );
}

function Ground({ cx = 160, rx = 104 }: { cx?: number; rx?: number }) {
  return (
    <ellipse
      cx={cx}
      cy="166"
      rx={rx}
      ry="7"
      className="ink-fill"
      fillOpacity="0.07"
    />
  );
}

function Car({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className="accent-fill"
        fillOpacity="0.14"
        d="M14 46h92l-12-26a10 10 0 0 0-9-6H35a10 10 0 0 0-9 6L14 46Z"
      />
      <path
        className="ink"
        d="M14 46h92l-12-26a10 10 0 0 0-9-6H35a10 10 0 0 0-9 6L14 46Z"
      />
      <rect x="4" y="46" width="112" height="26" rx="11" className="ink" />
      <path className="ink thin" d="M60 14v32" strokeOpacity="0.4" />
      <circle cx="32" cy="74" r="10" className="ink" />
      <circle cx="88" cy="74" r="10" className="ink" />
      <circle cx="32" cy="74" r="3.4" className="accent-fill" />
      <circle cx="88" cy="74" r="3.4" className="accent-fill" />
    </g>
  );
}

function Person({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="11" className="ink" />
      <circle cx="0" cy="0" r="11" className="accent-fill" fillOpacity="0.12" />
      <path className="ink" d="M-16 32a16 16 0 0 1 32 0" />
    </g>
  );
}

export function RequestSentArt() {
  return (
    <Scene>
      <Ground rx={92} />
      <Car x={166} y={70} />
      <Person x={70} y={88} />

      <Hover>
        <rect x="40" y="18" width="130" height="44" rx="18" className="surface" />
        <rect
          x="40"
          y="18"
          width="130"
          height="44"
          rx="18"
          className="accent"
          strokeOpacity="0.5"
        />
        <path d="M70 62l-6 14 18-14" className="surface" />
        <g className="accent-fill">
          <circle cx="78" cy="40" r="5" />
          <circle cx="104" cy="40" r="5" fillOpacity="0.6" />
          <circle cx="130" cy="40" r="5" fillOpacity="0.3" />
        </g>
      </Hover>

      <path
        className="accent"
        strokeOpacity="0.45"
        strokeDasharray="6 9"
        d="M186 96c20-38 62-44 92-22"
      />
      <Beat cx="278" cy="74" r="7" className="accent-fill" />
    </Scene>
  );
}

export function SeatHeldArt() {
  return (
    <Scene>
      <Ground rx={88} />

      <g transform="translate(96 44)">
        <path
          className="accent-fill"
          fillOpacity="0.14"
          d="M16 0h56a14 14 0 0 1 14 14v62H2V14A14 14 0 0 1 16 0Z"
        />
        <path
          className="ink"
          d="M16 0h56a14 14 0 0 1 14 14v62H2V14A14 14 0 0 1 16 0Z"
        />
        <path className="ink" d="M2 76h84v18a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8V76Z" />
        <path className="ink thin" strokeOpacity="0.4" d="M24 20v44M64 20v44" />
      </g>

      <g transform="translate(222 40)">
        <circle cx="26" cy="26" r="26" className="surface" />
        <circle cx="26" cy="26" r="26" className="accent" strokeOpacity="0.35" />
        <Winder
          className="accent"
          strokeWidth="4"
          strokeDasharray="104 60"
          d="M26 0a26 26 0 1 1-26 26"
        />
        <path className="ink" d="M26 12v15l10 7" />
      </g>

      <g transform="translate(34 58)">
        <rect width="52" height="34" rx="12" className="cta-fill" />
        <path className="on-cta" d="M14 17l6 7 14-15" />
      </g>
    </Scene>
  );
}

export function ConfirmedArt() {
  const shield = "M160 16l56 20v42c0 36-23 59-56 72-33-13-56-36-56-72V36l56-20Z";
  return (
    <Scene>
      <Ground rx={78} />
      <path className="accent-fill" fillOpacity="0.09" d={shield} />
      <path className="ink" strokeOpacity="0.55" d={shield} />

      <circle cx="160" cy="76" r="26" className="accent" />
      <circle cx="160" cy="76" r="26" className="accent-fill" fillOpacity="0.16" />
      <path
        className="accent"
        strokeWidth="2.4"
        strokeOpacity="0.8"
        d="M152 66v20M168 66l-16 10 16 10"
      />

      <rect x="124" y="112" width="72" height="12" rx="6" className="ink-fill" fillOpacity="0.16" />
      <rect x="124" y="132" width="44" height="10" rx="5" className="ink-fill" fillOpacity="0.1" />

      <g transform="translate(222 108)">
        <circle cx="22" cy="22" r="22" className="cta-fill" />
        <path className="on-cta" d="M12 22l7 7 13-15" />
      </g>

      <Beat cx="70" cy="46" r="6" className="accent-fill" />
      <Beat cx="250" cy="44" r="5" className="accent-fill" />
    </Scene>
  );
}

export function RollingArt() {
  return (
    <Scene>
      <path
        className="ink"
        strokeWidth="30"
        strokeOpacity="0.12"
        d="M-6 134h332"
      />
      <Road className="accent" strokeOpacity="0.6" d="M-6 134h332" />

      <Hover>
        <Car x={104} y={44} />
      </Hover>

      <g className="accent" strokeOpacity="0.45">
        <path d="M26 72h44" />
        <path d="M12 92h38" strokeOpacity="0.28" />
        <path d="M34 112h30" strokeOpacity="0.18" />
      </g>

      <g transform="translate(262 50)">
        <path className="accent-fill" d="M0 56V4l10 6 10-6 10 6 10-6v52Z" fillOpacity="0.2" />
        <path className="accent" d="M0 56V4l10 6 10-6 10 6 10-6v52" />
        <circle cx="20" cy="30" r="7" className="accent-fill" />
      </g>
    </Scene>
  );
}

export function ArrivedArt() {
  return (
    <Scene>
      <Ground rx={84} />

      <g transform="translate(118 26)">
        <path className="ink" d="M4 128V6" />
        <path className="accent-fill" fillOpacity="0.2" d="M4 10h66l-14 20 14 20H4V10Z" />
        <path className="accent" d="M4 10h66l-14 20 14 20H4" />
      </g>

      <g className="cta-fill">
        <Twinkle cx="236" cy="54" r="9" />
        <Twinkle cx="266" cy="84" r="6" style={{ animationDelay: "0.4s" }} />
        <Twinkle cx="214" cy="96" r="5" style={{ animationDelay: "0.8s" }} />
      </g>
      <g className="accent-fill" fillOpacity="0.5">
        <Twinkle cx="70" cy="48" r="7" style={{ animationDelay: "0.2s" }} />
        <Twinkle cx="44" cy="86" r="5" style={{ animationDelay: "0.6s" }} />
        <Twinkle cx="92" cy="104" r="4" style={{ animationDelay: "1s" }} />
      </g>

      <g transform="translate(196 104)">
        <circle cx="26" cy="26" r="26" className="accent-fill" fillOpacity="0.16" />
        <circle cx="26" cy="26" r="26" className="accent" />
        <path className="accent" strokeWidth="3" d="M14 27l8 8 16-18" />
      </g>
    </Scene>
  );
}

export function StoppedArt() {
  return (
    <Scene tone="stopped">
      <Ground rx={80} />
      <Car x={100} y={62} />
      <g transform="translate(206 32)">
        <circle cx="26" cy="26" r="26" className="accent-fill" fillOpacity="0.14" />
        <circle cx="26" cy="26" r="26" className="accent" />
        <path className="accent" d="M17 17l18 18M35 17L17 35" />
      </g>
      <path
        className="accent"
        strokeOpacity="0.4"
        strokeDasharray="6 10"
        d="M40 120h240"
      />
    </Scene>
  );
}
