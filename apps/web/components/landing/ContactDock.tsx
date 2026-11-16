"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styled, { css, keyframes } from "styled-components";
import { Reveal } from "../anim/Reveal";
import { SupportDock } from "./SupportDock";

/* ================================================================== */
/*  Tokens                                                             */
/* ================================================================== */

type CardTone = {
  bg: string;
  border: string;
  title: string;
  sub: string;
  ink: string;
  accent: string;
  paper: string;
};

const TONES = {
  chat: {
    bg: "#173D32",
    border: "rgba(255,255,255,0.09)",
    title: "#F5F3E9",
    sub: "#C5D5C9",
    ink: "#DCEADD",
    accent: "#DDF0BE",
    paper: "#21493C",
  },
  report: {
    bg: "#E8DCC9",
    border: "rgba(57,65,48,0.09)",
    title: "#263D32",
    sub: "#71685A",
    ink: "#263D32",
    accent: "#B69A72",
    paper: "#F3EADC",
  },
  call: {
    bg: "#E2EBD4",
    border: "rgba(48,67,42,0.09)",
    title: "#263D32",
    sub: "#65745D",
    ink: "#263D32",
    accent: "#A3B58C",
    paper: "#F1F5EA",
  },
  email: {
    bg: "#D2E0D2",
    border: "rgba(42,66,49,0.09)",
    title: "#263D32",
    sub: "#647568",
    ink: "#263D32",
    accent: "#A9C2A8",
    paper: "#FAF8F1",
  },
} as const satisfies Record<string, CardTone>;

/* ================================================================== */
/*  Motion system                                                      */
/* ================================================================== */

/** Strong ease-out for anything that responds to the user. */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Accelerating curve, used only for the first half of a fold so its
 *  speed hands over to the second half (one continuous motion). */
const EASE_IN_FOLD = "cubic-bezier(0.55, 0, 1, 0.45)";

/** A real damped spring (≈8% overshoot) sampled into CSS linear().
 *  Browsers without linear() keep the EASE_OUT fallback. */
const SPRING =
  "linear(0, 0.052, 0.179, 0.342, 0.512, 0.67, 0.805, 0.911, 0.989, 1.041, 1.07, 1.082, 1.082, 1.074, 1.062, 1.047, 1.034, 1.021, 1.011, 1.004, 0.998, 0.995, 0.993, 0.993, 0.993, 0.994, 0.995, 0.997, 0.998, 0.999, 1)";

/** transition with a spring, plus a safe fallback line first. */
const springTransition = (props: string[], ms: number, delay = 0) => css`
  transition: ${props
    .map((p) => `${p} ${ms}ms ${EASE_OUT} ${delay}ms`)
    .join(", ")};
  transition-timing-function: ${SPRING};
`;

const HOVER = "@media (hover: hover) and (pointer: fine)";

/* ---------- keyframes (only for motion that is genuinely a sequence) */

/** Typing indicator: each dot hops once, in turn. */
const typingHop = keyframes`
  0%, 100% { transform: translateY(0); }
  35%      { transform: translateY(-4px); }
  60%      { transform: translateY(0.5px); }
`;

/** Wind gust across the flag that dies down (decaying amplitude). */
const flutter = keyframes`
  0%   { transform: translateY(0); }
  12%  { transform: translateY(calc(var(--a) * -2.2px)); }
  26%  { transform: translateY(calc(var(--a) * 1.8px)); }
  40%  { transform: translateY(calc(var(--a) * -1.2px)); }
  55%  { transform: translateY(calc(var(--a) * 0.8px)); }
  72%  { transform: translateY(calc(var(--a) * -0.35px)); }
  100% { transform: translateY(0); }
`;

/** A phone ring: a fast burst that decays to rest. */
const ringBurst = keyframes`
  0%   { transform: rotate(0deg); }
  10%  { transform: rotate(-11deg); }
  22%  { transform: rotate(9deg); }
  34%  { transform: rotate(-8deg); }
  46%  { transform: rotate(6deg); }
  58%  { transform: rotate(-4deg); }
  70%  { transform: rotate(2.5deg); }
  84%  { transform: rotate(-1deg); }
  100% { transform: rotate(0deg); }
`;

/** Sound leaving the earpiece: grows outward and fades. */
const soundOut = keyframes`
  0%   { opacity: 0;          transform: scale(0.7); }
  55%  { opacity: 1;          transform: scale(1.08); }
  100% { opacity: var(--o, 1); transform: scale(1); }
`;

/** Wax seal gives a little before the flap lifts. */
const sealPress = keyframes`
  0%   { transform: scale(1); }
  45%  { transform: scale(0.82); }
  100% { transform: scale(1.06); }
`;

/* ================================================================== */
/*  Pointer depth: tilt + parallax, driven by a spring                 */
/* ================================================================== */

type DepthState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  raf: number;
  svg: SVGElement | null;
  layers: { el: SVGGElement; d: number }[];
};

/**
 * Mouse only. Writes transforms straight onto the few nodes that need
 * them (no inherited CSS variables on large subtrees), runs on rAF and
 * stops as soon as the spring settles.
 */
function usePointerDepth() {
  const states = useRef(new WeakMap<HTMLElement, DepthState>());
  const reduced = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => (reduced.current = mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const tick = useCallback((card: HTMLElement, s: DepthState) => {
    // Semi-implicit spring: stiffness 0.12, damping 0.78 per frame
    s.vx = s.vx * 0.78 + (s.tx - s.x) * 0.12;
    s.vy = s.vy * 0.78 + (s.ty - s.y) * 0.12;
    s.x += s.vx;
    s.y += s.vy;

    if (s.svg) {
      s.svg.style.transform = `rotateX(${(-s.y * 7).toFixed(3)}deg) rotateY(${(s.x * 9).toFixed(3)}deg)`;
    }
    for (const { el, d } of s.layers) {
      el.style.transform = `translate(${(s.x * d).toFixed(3)}px, ${(s.y * d).toFixed(3)}px)`;
    }

    const settled =
      Math.abs(s.vx) + Math.abs(s.vy) < 0.0004 &&
      Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) < 0.0004;

    s.raf = settled ? 0 : requestAnimationFrame(() => tick(card, s));
  }, []);

  const getState = (card: HTMLElement) => {
    let s = states.current.get(card);
    if (!s) {
      s = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        raf: 0,
        svg: card.querySelector<SVGElement>("[data-tilt]"),
        layers: Array.from(
          card.querySelectorAll<SVGGElement>("[data-depth]"),
        ).map((el) => ({ el, d: Number(el.dataset.depth) || 0 })),
      };
      states.current.set(card, s);
    }
    return s;
  };

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse" || reduced.current) return;
      const card = e.currentTarget;
      const r = card.getBoundingClientRect();
      const s = getState(card);
      s.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      s.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!s.raf) s.raf = requestAnimationFrame(() => tick(card, s));
    },
    [tick],
  );

  const onPointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const card = e.currentTarget;
      const s = states.current.get(card);
      if (!s) return;
      s.tx = 0;
      s.ty = 0;
      if (!s.raf) s.raf = requestAnimationFrame(() => tick(card, s));
    },
    [tick],
  );

  return { onPointerMove, onPointerLeave };
}

/* ================================================================== */
/*  Layout                                                             */
/* ================================================================== */

const ContactGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  @media (max-width: 480px) {
    gap: 11px;
  }

  @media (max-width: 350px) {
    grid-template-columns: 1fr;
  }
`;

const cardCss = css<{ $tone: CardTone }>`
  position: relative;
  isolation: isolate;
  overflow: hidden;

  display: flex;
  flex-direction: column;
  align-items: stretch;

  width: 100%;
  min-width: 0;
  min-height: 238px;
  padding: 25px;

  background: ${({ $tone }) => $tone.bg};
  color: ${({ $tone }) => $tone.title};
  border: 1px solid ${({ $tone }) => $tone.border};
  border-radius: 23px;

  text-align: left;
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  box-shadow:
    0 1px 2px rgba(30, 45, 33, 0.025),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  transition:
    transform 220ms ${EASE_OUT},
    box-shadow 220ms ${EASE_OUT};

  ${HOVER} {
    &:hover {
      transform: translateY(-3px);
      box-shadow:
        0 12px 27px rgba(30, 45, 33, 0.09),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }
  }

  /* Press: quick squash, released with the spring */
  &:active {
    transform: translateY(-1px) scale(0.975);
    transition: transform 110ms ${EASE_OUT};
  }

  &:focus-visible {
    outline: 2px solid ${({ $tone }) => $tone.ink};
    outline-offset: 4px;
  }

  @media (max-width: 720px) {
    min-height: 216px;
    padding: 19px;
    border-radius: 20px;
  }

  @media (max-width: 480px) {
    min-height: 201px;
    padding: 15px;
    border-radius: 17px;
  }

  @media (max-width: 350px) {
    min-height: 215px;
    padding: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const ContactCardButton = styled.button<{ $tone: CardTone }>`
  ${cardCss}
`;

const ContactCardLink = styled.a<{ $tone: CardTone }>`
  ${cardCss}
`;

/* ================================================================== */
/*  Illustration choreography                                          */
/*  Rest styles describe the way OUT (fast, reverse order).            */
/*  "playing" describes the way IN (lead → support → payoff).          */
/* ================================================================== */

const playing = css`
  /* ---------------- chat: typing → message appears ---------------- */
  svg [data-m="back"] {
    transform: translate(-3px, -3px) rotate(-2deg);
  }
  svg [data-m="front"] {
    transform: translate(2px, -4px) rotate(1.5deg);
    ${springTransition(["transform"], 560)}
  }
  svg [data-m="dot"] {
    animation: ${typingHop} 420ms ${EASE_OUT} both;
  }
  svg [data-m="dots"] {
    opacity: 0;
    transform: scale(0.85);
    transition:
      opacity 160ms ease 560ms,
      transform 200ms ${EASE_OUT} 560ms;
  }
  svg [data-m="line-1"],
  svg [data-m="line-2"] {
    stroke-dashoffset: 0;
  }
  svg [data-m="line-1"] {
    transition: stroke-dashoffset 300ms ${EASE_OUT} 640ms;
  }
  svg [data-m="line-2"] {
    transition: stroke-dashoffset 260ms ${EASE_OUT} 740ms;
  }

  /* ---------------- report: raised, then catches the wind --------- */
  svg [data-m="flag"] {
    transform: translateY(0);
    ${springTransition(["transform"], 620)}
  }
  svg [data-m="strip"] {
    animation: ${flutter} 1500ms ease-out both;
  }
  svg [data-m="cap"] {
    transform: scale(1.35);
    ${springTransition(["transform"], 500, 160)}
  }
  svg [data-m="flag-shadow"] {
    transform: scaleX(1.25);
    opacity: 0.18;
  }

  /* ---------------- call: rings, then lifts ----------------------- */
  svg [data-m="ring"] {
    animation: ${ringBurst} 620ms linear both;
  }
  svg [data-m="handset"] {
    transform: translate(-3px, -4px) rotate(-14deg);
    ${springTransition(["transform"], 600, 560)}
  }
  svg [data-m="arc-1"],
  svg [data-m="arc-2"],
  svg [data-m="arc-3"] {
    animation: ${soundOut} 700ms ${EASE_OUT} both;
  }
  svg [data-m="arc-2"] {
    animation-delay: 110ms;
  }
  svg [data-m="arc-3"] {
    animation-delay: 220ms;
  }
  svg [data-m="call-shadow"] {
    transform: scaleX(0.8);
    opacity: 0.06;
    transition:
      transform 500ms ${EASE_OUT} 560ms,
      opacity 500ms ease 560ms;
  }

  /* ---------------- email: seal → fold → letter → writing -------- */
  svg [data-m="seal"] {
    animation: ${sealPress} 160ms ${EASE_OUT} both;
  }
  svg [data-m="flap-front"] {
    transform: scaleY(0);
    transition: transform 140ms ${EASE_IN_FOLD} 140ms;
  }
  svg [data-m="flap-back"] {
    transform: scaleY(-1);
    transition: transform 200ms ${EASE_OUT} 280ms;
  }
  svg [data-m="letter"] {
    transform: translateY(-24px);
    ${springTransition(["transform"], 640, 360)}
  }
  svg [data-m="ink"] {
    stroke-dashoffset: 0;
    transition: stroke-dashoffset 280ms ${EASE_OUT} var(--d, 0ms);
  }
`;

const Illustration = styled.span`
  display: flex;
  align-items: center;
  justify-content: flex-start;

  width: 100%;
  height: 106px;
  flex-shrink: 0;
  perspective: 520px;

  svg {
    display: block;
    width: 160px;
    height: 100px;
    overflow: visible;
    will-change: transform;
  }

  svg [data-depth] {
    will-change: transform;
  }

  /* ---------------- shared rest ---------------- */
  svg [data-m] {
    transform-box: fill-box;
    transform-origin: center;
    transition:
      transform 220ms ${EASE_OUT},
      opacity 180ms ease;
  }

  /* chat */
  svg [data-m="back"] {
    transform-origin: left bottom;
  }
  svg [data-m="front"] {
    transform-origin: right bottom;
  }
  svg [data-m="dots"] {
    transition:
      opacity 160ms ease 120ms,
      transform 200ms ${EASE_OUT} 120ms;
  }
  svg [data-m="line-1"],
  svg [data-m="line-2"] {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 140ms ${EASE_OUT};
  }

  /* report */
  svg [data-m="flag"] {
    transform: translateY(9px);
    transition: transform 260ms ${EASE_OUT};
  }
  svg [data-m="cap"] {
    transform-origin: center;
  }
  svg [data-m="flag-shadow"] {
    opacity: 0.12;
  }

  /* call */
  svg [data-m="handset"] {
    transform-origin: 40% 60%;
    transition: transform 240ms ${EASE_OUT};
  }
  svg [data-m="ring"] {
    transform-origin: 45% 55%;
  }
  svg [data-m="arc-1"],
  svg [data-m="arc-2"],
  svg [data-m="arc-3"] {
    /* emanate from the earpiece, not from each arc's own box */
    transform-box: view-box;
    transform-origin: 58px 50px;
  }
  svg [data-m="arc-1"] {
    opacity: 0.4;
    --o: 1;
  }
  svg [data-m="arc-2"] {
    opacity: 0.22;
    --o: 0.7;
  }
  svg [data-m="arc-3"] {
    opacity: 0;
    --o: 0.35;
  }
  svg [data-m="call-shadow"] {
    opacity: 0.1;
  }

  /* email (reverse order on the way out) */
  svg [data-m="flap-front"],
  svg [data-m="flap-back"] {
    transform-origin: center top;
  }
  svg [data-m="flap-front"] {
    transform: scaleY(1);
    transition: transform 150ms ${EASE_OUT} 230ms;
  }
  svg [data-m="flap-back"] {
    transform: scaleY(0);
    transition: transform 110ms ${EASE_IN_FOLD} 120ms;
  }
  svg [data-m="letter"] {
    transition: transform 200ms ${EASE_OUT};
  }
  svg [data-m="ink"] {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 120ms ease;
  }

  ${HOVER} {
    button:hover &,
    a:hover & {
      ${playing}
    }
  }

  button:focus-visible &,
  a:focus-visible & {
    ${playing}
  }

  @media (max-width: 720px) {
    height: 91px;

    svg {
      width: 136px;
      height: 85px;
    }
  }

  @media (max-width: 480px) {
    height: 82px;

    svg {
      width: 120px;
      height: 75px;
    }
  }

  /* Reduced motion: keep fades and drawn strokes, remove movement */
  @media (prefers-reduced-motion: reduce) {
    svg,
    svg [data-depth] {
      transform: none !important;
    }
    svg [data-m] {
      animation: none !important;
    }
    svg [data-m="back"],
    svg [data-m="front"],
    svg [data-m="flag"],
    svg [data-m="cap"],
    svg [data-m="handset"],
    svg [data-m="letter"],
    svg [data-m="flap-front"] {
      transform: none !important;
    }
    svg [data-m="flap-back"] {
      transform: scaleY(0) !important;
    }
  }
`;

const CardBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: auto;
  min-width: 0;
`;

const CardTitle = styled.span<{ $tone: CardTone }>`
  display: block;
  color: ${({ $tone }) => $tone.title};

  font-size: 21px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.035em;

  @media (max-width: 720px) {
    font-size: 18px;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const CardText = styled.span<{ $tone: CardTone }>`
  display: block;
  max-width: 285px;
  min-height: 3.1em;

  color: ${({ $tone }) => $tone.sub};

  font-size: 13px;
  font-weight: 450;
  line-height: 1.55;
  letter-spacing: -0.01em;

  @media (max-width: 720px) {
    font-size: 12.5px;
    line-height: 1.5;
    min-height: 3em;
  }

  @media (max-width: 480px) {
    font-size: 11.5px;
    line-height: 1.48;
    min-height: 2.96em;
  }
`;

/* ================================================================== */
/*  Illustrations                                                      */
/* ================================================================== */

const ART = {
  viewBox: "0 0 160 100",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: false,
  "data-tilt": true,
} as const;

const STROKE = 2.2;

/** Safe id for url(#…) references */
const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, "");

/**
 * Live chat — support is typing, then the dots resolve into a
 * written message.
 */
function ChatIllustration({ t }: { t: CardTone }) {
  return (
    <svg {...ART}>
      <g data-depth="2">
        <g data-m="back">
          <path
            d="M28 12H70A14 14 0 0 1 84 26V42A14 14 0 0 1 70 56H27L14 61V26A14 14 0 0 1 28 12Z"
            fill={t.paper}
            stroke={t.ink}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <path
            d="M27 27H66M27 37H54"
            stroke={t.ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      </g>

      <g data-depth="5">
        <g data-m="front">
          <path
            d="M58 36H104A14 14 0 0 1 118 50V83L105 78H58A14 14 0 0 1 44 64V50A14 14 0 0 1 58 36Z"
            fill={t.accent}
            stroke={t.bg}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          <g data-m="dots">
            {[66, 81, 96].map((cx, i) => (
              <circle
                key={cx}
                data-m="dot"
                cx={cx}
                cy="57"
                r="3.6"
                fill={t.bg}
                style={{ animationDelay: `${120 + i * 90}ms` }}
              />
            ))}
          </g>

          {/* the message the dots become */}
          <path
            data-m="line-1"
            pathLength={1}
            d="M57 52H104"
            stroke={t.bg}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <path
            data-m="line-2"
            pathLength={1}
            d="M57 62H88"
            stroke={t.bg}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

const FLAG_D =
  "M36 16C46 12 56 12 66 16S86 20 98 16V48C86 52 76 52 66 48S46 44 36 48Z";
const STRIPS = 16;

/**
 * Report an issue — the flag is raised with a spring, then a gust runs
 * across the cloth from the pole outward and dies down. The cloth is
 * cut into thin clipped strips so it can genuinely ripple.
 */
function ReportIllustration({ t }: { t: CardTone }) {
  const id = useSvgId();
  const x0 = 35;
  const w = 64 / STRIPS;

  return (
    <svg {...ART}>
      <defs>
        {Array.from({ length: STRIPS }, (_, i) => (
          <clipPath key={i} id={`${id}-s${i}`}>
            <rect x={x0 + i * w - 0.35} y="4" width={w + 0.7} height="56" />
          </clipPath>
        ))}
      </defs>

      <g data-depth="1">
        <ellipse
          data-m="flag-shadow"
          cx="34"
          cy="89"
          rx="17"
          ry="3"
          fill={t.ink}
        />
      </g>

      <g data-depth="3">
        <path
          d="M34 89V12"
          stroke={t.ink}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle data-m="cap" cx="34" cy="10" r="3" fill={t.ink} />

        <g data-m="flag">
          {Array.from({ length: STRIPS }, (_, i) => (
            <g
              key={i}
              data-m="strip"
              style={
                {
                  "--a": Math.max(0.12, i / (STRIPS - 1)),
                  animationDelay: `${300 + i * 22}ms`,
                } as CSSProperties
              }
            >
              <g clipPath={`url(#${id}-s${i})`}>
                <path
                  d={FLAG_D}
                  fill={t.ink}
                  stroke={t.ink}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M67 24V35"
                  stroke={t.bg}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="67" cy="41" r="1.8" fill={t.bg} />
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

/**
 * Call us — the handset rings in a decaying burst while sound leaves
 * the earpiece, then it lifts off as if answered.
 */
function CallIllustration({ t }: { t: CardTone }) {
  return (
    <svg {...ART}>
      <g data-depth="1">
        <ellipse
          data-m="call-shadow"
          cx="54"
          cy="90"
          rx="26"
          ry="3"
          fill={t.ink}
        />
      </g>

      <g data-depth="7" stroke={t.ink} strokeWidth="3" strokeLinecap="round">
        <path data-m="arc-1" d="M60 30A20 20 0 0 1 80 50" />
        <path data-m="arc-2" d="M60 18A32 32 0 0 1 92 50" />
        <path data-m="arc-3" d="M60 6A44 44 0 0 1 104 50" />
      </g>

      <g data-depth="3">
        <g data-m="handset">
          <g data-m="ring">
            {/* Handset glyph after Material Icons "call" (Apache 2.0) */}
            <g transform="translate(16 14) scale(3.2)">
              <path
                d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                fill={t.ink}
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * Email — the seal gives, the flap folds over its own hinge, the
 * letter springs out and its lines write themselves in.
 */
function EmailIllustration({ t }: { t: CardTone }) {
  const flap = "M20 36Q20 34 22.5 34H101.5Q104 34 104 36L66 63Q62 66 58 63Z";
  const lines = [
    { d: "M39 50H66", delay: 640 },
    { d: "M39 58H85", delay: 720 },
    { d: "M39 65H78", delay: 800 },
  ];

  return (
    <svg {...ART}>
      <g data-depth="1">
        <ellipse cx="62" cy="94" rx="44" ry="3" fill={t.ink} opacity="0.1" />
      </g>

      <g data-depth="3">
        <rect
          x="20"
          y="34"
          width="84"
          height="56"
          rx="7"
          fill={t.accent}
          stroke={t.ink}
          strokeWidth={STROKE}
        />

        <path
          data-m="flap-back"
          d={flap}
          fill={t.accent}
          stroke={t.ink}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      </g>

      {/* letter sits on a slightly deeper layer: it parallaxes inside */}
      <g data-depth="5">
        <g data-m="letter">
          <rect
            x="30"
            y="40"
            width="64"
            height="44"
            rx="3"
            fill={t.paper}
            stroke={t.ink}
            strokeWidth="1.8"
          />
          {lines.map(({ d, delay }) => (
            <path
              key={d}
              data-m="ink"
              pathLength={1}
              d={d}
              stroke={t.ink}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
              style={{ "--d": `${delay}ms` } as CSSProperties}
            />
          ))}
        </g>
      </g>

      <g data-depth="3">
        <path
          d="M20 36L58 63Q62 66 66 63L104 36V83Q104 90 97 90H27Q20 90 20 83Z"
          fill={t.paper}
          stroke={t.ink}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />

        <g data-m="flap-front">
          <path
            d={flap}
            fill={t.paper}
            stroke={t.ink}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <circle
            data-m="seal"
            cx="62"
            cy="58"
            r="5"
            fill={t.accent}
            stroke={t.ink}
            strokeWidth="1.6"
          />
        </g>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function ContactDock() {
  const depth = usePointerDepth();
  const [signal, setSignal] = useState<{
    mode: "support" | "report";
    nonce: number;
  }>();

  const open = (mode: "support" | "report") => {
    setSignal((current) => ({
      mode,
      nonce: (current?.nonce ?? 0) + 1,
    }));
  };

  return (
    <>
      <ContactGrid stagger={0.07}>
        <ContactCardButton
          type="button"
          $tone={TONES.chat}
          onClick={() => open("support")}
          {...depth}
        >
          <Illustration>
            <ChatIllustration t={TONES.chat} />
          </Illustration>
          <CardBody>
            <CardTitle $tone={TONES.chat}>Live chat</CardTitle>
            <CardText $tone={TONES.chat}>
              Talk to support now. Average reply under two minutes.
            </CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardButton
          type="button"
          $tone={TONES.report}
          onClick={() => open("report")}
          {...depth}
        >
          <Illustration>
            <ReportIllustration t={TONES.report} />
          </Illustration>
          <CardBody>
            <CardTitle $tone={TONES.report}>Report an issue</CardTitle>
            <CardText $tone={TONES.report}>
              Something went wrong on a trip? Flag it and we investigate.
            </CardText>
          </CardBody>
        </ContactCardButton>

        <ContactCardLink href="tel:+254701930385" $tone={TONES.call} {...depth}>
          <Illustration>
            <CallIllustration t={TONES.call} />
          </Illustration>
          <CardBody>
            <CardTitle $tone={TONES.call}>Call us</CardTitle>
            <CardText $tone={TONES.call}>
              +254 701 930385, every day from 6am to 11pm EAT.
            </CardText>
          </CardBody>
        </ContactCardLink>

        <ContactCardLink
          href="mailto:hello@kipita.co.ke"
          $tone={TONES.email}
          {...depth}
        >
          <Illustration>
            <EmailIllustration t={TONES.email} />
          </Illustration>
          <CardBody>
            <CardTitle $tone={TONES.email}>Email</CardTitle>
            <CardText $tone={TONES.email}>
              hello@kipita.co.ke. We answer within a working day.
            </CardText>
          </CardBody>
        </ContactCardLink>
      </ContactGrid>

      <SupportDock openSignal={signal} />
    </>
  );
}
