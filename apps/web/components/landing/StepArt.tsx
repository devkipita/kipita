"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import styled, { css, keyframes } from "styled-components";
import { useInView } from "../anim/useInView";
import { dur, ease } from "@/lib/motion";
import type { RideStep } from "./data";

type Props = { icon: RideStep["icon"]; ink: string; mark: string; bg?: string };

type Palette = {
  bg: string;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
  face: string;
  ink: string;
  mark: string;
  markShade: string;
  onMark: string;
  shadow: string;
};

type RGB = [number, number, number];

function parse(c: string): RGB {
  const s = c.trim();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const f =
      h.length === 3 ? [...h].map((x) => x + x).join("") : h.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as RGB;
  }
  const n = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [n[0], n[1], n[2]];
}

function mix(a: string, b: string, t: number) {
  const x = parse(a);
  const y = parse(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function lum(c: string) {
  const [r, g, b] = parse(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}

function palette(bg: string, ink: string, mark: string): Palette {
  const dark = lum(bg) < 0.25;
  const face = dark ? mix(bg, ink, 0.2) : mix(bg, "#ffffff", 0.55);
  const onMark = [bg, face, ink].reduce((best, c) =>
    contrast(c, mark) > contrast(best, mark) ? c : best,
  );
  return {
    bg,
    g1: mix(bg, ink, dark ? 0.07 : 0.05),
    g2: mix(bg, ink, dark ? 0.32 : 0.1),
    g3: mix(bg, ink, 0.18),
    g4: mix(bg, ink, dark ? 0.5 : 0.42),
    face,
    ink,
    mark,
    markShade: mix(mark, dark ? bg : ink, 0.18),
    onMark,
    shadow: dark ? mix(bg, "#000000", 0.55) : ink,
  };
}

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

let canvasCtx: CanvasRenderingContext2D | null = null;

function toRgb(color: string) {
  if (/^(#|rgb)/i.test(color)) return color;
  canvasCtx ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!canvasCtx) return color;
  canvasCtx.clearRect(0, 0, 1, 1);
  canvasCtx.fillStyle = "#000";
  canvasCtx.fillStyle = color;
  canvasCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = canvasCtx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

function resolveColor(value: string, host: Element) {
  const v = value.trim();
  if (/^(#|rgb)/i.test(v)) return v;
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = v;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return toRgb(c);
}

function findBackground(host: Element) {
  let el = host.parentElement;
  while (el) {
    const c = getComputedStyle(el).backgroundColor;
    const transparent = c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);
    if (c && !transparent) return toRgb(c);
    el = el.parentElement;
  }
  return "rgb(246, 244, 238)";
}

type Resolved = { bg: string; ink: string; mark: string };

function useResolvedColors(ink: string, mark: string, bg?: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const [colors, setColors] = useState<Resolved | null>(null);

  useIsoLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;

    const read = () => {
      const next = {
        bg: bg ? resolveColor(bg, host) : findBackground(host),
        ink: resolveColor(ink, host),
        mark: resolveColor(mark, host),
      };
      setColors((prev) =>
        prev &&
        prev.bg === next.bg &&
        prev.ink === next.ink &&
        prev.mark === next.mark
          ? prev
          : next,
      );
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-mode"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", read);

    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", read);
    };
  }, [ink, mark, bg]);

  return [ref, colors] as const;
}

const BOX = { viewBox: "0 0 212 120", fill: "none" } as const;

const ORDER: Record<RideStep["icon"], number> = { pin: 0, car: 1, check: 2 };
const STEP_GAP = 150;

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Txt({
  children,
  size,
  weight = 700,
  ...rest
}: SVGProps<SVGTextElement> & {
  size: number;
  weight?: number;
  children: ReactNode;
}) {
  return (
    <text fontSize={size} fontWeight={weight} letterSpacing="-0.02em" {...rest}>
      {children}
    </text>
  );
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.46 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(
      `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`,
    );
  }
  return `M${pts.join("L")}Z`;
}

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
`;

const fade = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const pop = keyframes`
  0%   { opacity: 0; transform: scale(0.8); }
  60%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: none; }
`;

const draw = keyframes`
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
`;

const drop = keyframes`
  0%   { opacity: 0; transform: translateY(-22px); }
  55%  { opacity: 1; transform: translateY(2px) scale(1.03, 0.95); }
  78%  { transform: translateY(-2px); }
  100% { opacity: 1; transform: none; }
`;

const land = keyframes`
  0%   { opacity: 0; transform: scaleX(0.3); }
  55%  { opacity: 1; transform: scaleX(1.15); }
  100% { opacity: 1; transform: none; }
`;

const rollOut = keyframes`
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(-10px); }
`;

const rollIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
`;

const fanLeft = keyframes`
  from { opacity: 0; transform: translateX(42px) rotate(0deg); }
  to   { opacity: 1; transform: rotate(-13deg); }
`;

const fanRight = keyframes`
  from { opacity: 0; transform: translateX(-42px) rotate(0deg); }
  to   { opacity: 1; transform: rotate(13deg); }
`;

const lift = keyframes`
  0%   { transform: none; }
  65%  { transform: translateY(-11px) scale(1.07); }
  100% { transform: translateY(-9px) scale(1.06); }
`;

const issue = keyframes`
  from { opacity: 0; transform: translateX(-48px) rotate(-5deg); }
  to   { opacity: 1; transform: none; }
`;

const Wrap = styled.span`
  display: contents;
`;

const Scene = styled.svg<{ $play: boolean; $base: number; $ready: boolean }>`
  display: block;
  overflow: visible;
  font-family: inherit;
  visibility: ${({ $ready }) => ($ready ? "visible" : "hidden")};

  [data-a] {
    transform-box: fill-box;
    transform-origin: center;
    animation-delay: calc(${({ $base }) => $base}ms + var(--d, 0ms));
    animation-fill-mode: both;
  }

  [data-a="fan-left"],
  [data-a="fan-right"],
  [data-a="lift"] {
    transform-origin: 50% 100%;
  }

  [data-a="fan-left"] {
    transform: rotate(-13deg);
  }

  [data-a="fan-right"] {
    transform: rotate(13deg);
  }

  [data-a="rise"],
  [data-a="fade"],
  [data-a="pop"],
  [data-a="drop"],
  [data-a="land"],
  [data-a="roll-in"],
  [data-a="fan-left"],
  [data-a="fan-right"],
  [data-a="issue"] {
    opacity: 0;
  }

  [data-a="draw"] {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }

  ${({ $play, $base }) =>
    $play &&
    css`
      [data-a="rise"] {
        animation: ${rise} ${dur.medium4}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="fade"] {
        animation: ${fade} ${dur.medium2}ms ${ease.standard}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="pop"] {
        animation: ${pop} ${dur.medium3}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="draw"] {
        animation: ${draw} ${dur.long2}ms ${ease.emphasized}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="drop"] {
        animation: ${drop} ${dur.medium4}ms ${ease.standardDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="land"] {
        animation: ${land} ${dur.medium4}ms ${ease.standardDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="roll-out"] {
        animation: ${rollOut} ${dur.medium2}ms ${ease.emphasized}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="roll-in"] {
        animation: ${rollIn} ${dur.medium2}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="fan-left"] {
        animation: ${fanLeft} ${dur.medium4}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="fan-right"] {
        animation: ${fanRight} ${dur.medium4}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="lift"] {
        animation: ${lift} ${dur.medium4}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
      [data-a="issue"] {
        animation: ${issue} ${dur.long2}ms ${ease.emphasizedDecelerate}
          calc(${$base}ms + var(--d, 0ms)) both;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    [data-a] {
      animation-duration: 1ms !important;
      animation-delay: 0ms !important;
    }
  }
`;

function Seat({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill}>
      <g transform="rotate(-12 5 23)">
        <rect x="1.5" y="0" width="8" height="5" rx="2.2" />
        <rect x="0" y="6.2" width="10" height="17" rx="4.2" />
      </g>
      <rect x="3" y="18.5" width="19" height="8.5" rx="4.2" />
      <rect x="6" y="27" width="2.6" height="5" rx="1.2" />
      <rect x="16" y="27" width="2.6" height="5" rx="1.2" />
    </g>
  );
}

function Where({ p }: { p: Palette }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const road = "M16 102C52 102 58 78 98 80S150 98 184 86";

  return (
    <>
      <defs>
        <clipPath id={`${id}-count`}>
          <circle cx="129" cy="31" r="8.5" />
        </clipPath>
      </defs>

      <path
        data-a="fade"
        d="M6 101C6 86 38 72 80 71C122 70 152 64 184 69C202 72 208 85 206 95C204 108 182 115 106 115C38 115 6 111 6 101Z"
        fill={p.g1}
      />

      <path
        data-a="draw"
        style={at(80)}
        pathLength={1}
        d={road}
        stroke={p.g3}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        data-a="fade"
        style={at(420)}
        d={road}
        stroke={p.face}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />

      <g data-a="pop" style={at(60)}>
        <circle
          cx="16"
          cy="102"
          r="7.5"
          fill={p.face}
          stroke={p.ink}
          strokeWidth="2"
        />
        <circle cx="16" cy="102" r="2.8" fill={p.ink} />
      </g>

      <g data-a="rise" style={at(140)}>
        <rect
          x="24"
          y="31"
          width="42"
          height="44"
          rx="8"
          fill={p.shadow}
          opacity="0.1"
        />
        <rect x="21" y="29" width="42" height="44" rx="8" fill={p.g3} />
        <rect x="21" y="26" width="42" height="44" rx="8" fill={p.face} />
        <path d="M21 34a8 8 0 0 1 8-8h26a8 8 0 0 1 8 8v6H21Z" fill={p.g4} />
        <rect x="30" y="21" width="3.4" height="10" rx="1.7" fill={p.ink} />
        <rect x="50.6" y="21" width="3.4" height="10" rx="1.7" fill={p.ink} />
        <Txt x="42" y="62" size={20} fill={p.ink} textAnchor="middle">
          14
        </Txt>
      </g>

      <g data-a="pop" style={at(260)}>
        <circle
          cx="113"
          cy="48"
          r="19"
          fill={p.shadow}
          opacity="0.08"
          transform="translate(2 3)"
        />
        <circle cx="113" cy="48" r="19" fill={p.face} />
        <Seat x={104} y={33} fill={p.ink} />
        <circle cx="129" cy="31" r="8.5" fill={p.g4} />
        <g clipPath={`url(#${id}-count)`}>
          <Txt
            data-a="roll-out"
            style={at(640)}
            x="129"
            y="34.6"
            size={10}
            fill={p.face}
            textAnchor="middle"
          >
            1
          </Txt>
          <Txt
            data-a="roll-in"
            style={at(640)}
            x="129"
            y="34.6"
            size={10}
            fill={p.face}
            textAnchor="middle"
          >
            2
          </Txt>
        </g>
      </g>

      <ellipse
        data-a="land"
        style={at(460)}
        cx="184"
        cy="87"
        rx="10"
        ry="2.8"
        fill={p.shadow}
        opacity="0.16"
      />
      <g data-a="drop" style={at(460)}>
        <path
          d="M184 86C184 86 168 68 168 55A16 16 0 0 1 200 55C200 68 184 86 184 86Z"
          fill={p.mark}
        />
        <path
          d="M184 86C184 86 200 68 200 55A16 16 0 0 0 184 39V86Z"
          fill={p.markShade}
        />
        <circle cx="184" cy="55" r="6.5" fill={p.onMark} />
      </g>
    </>
  );
}

function DriverCard({
  p,
  chosen,
  label,
}: {
  p: Palette;
  chosen?: boolean;
  label?: { rating: string; price: string };
}) {
  return (
    <>
      <rect
        x="3"
        y="4"
        width="56"
        height="74"
        rx="11"
        fill={p.shadow}
        opacity="0.1"
      />
      <rect x="0" y="0" width="56" height="74" rx="11" fill={p.face} />
      <circle cx="28" cy="21" r="12" fill={p.g2} />
      <circle cx="28" cy="18" r="4.6" fill={p.g4} />
      <path
        d="M19.5 30c2-4.6 5.2-6 8.5-6s6.5 1.4 8.5 6a12 12 0 0 1-17 0Z"
        fill={p.g4}
      />

      {chosen && label ? (
        <>
          <circle
            cx="38.5"
            cy="30"
            r="5.4"
            fill={p.mark}
            stroke={p.face}
            strokeWidth="1.6"
          />
          <path
            d="m36.2 30.1 1.6 1.6 3-3.2"
            stroke={p.onMark}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={star(17, 45, 5.2)} fill={p.mark} />
          <Txt x="25" y="49.6" size={13} fill={p.ink}>
            {label.rating}
          </Txt>
          <rect x="5" y="56" width="46" height="13" rx="6.5" fill={p.mark} />
          <Txt x="28" y="65.4" size={8} fill={p.onMark} textAnchor="middle">
            {label.price}
          </Txt>
        </>
      ) : (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={star(16 + i * 6, 44, 2.6)} fill={p.g3} />
          ))}
          <rect x="10" y="55" width="36" height="11" rx="5.5" fill={p.g2} />
        </>
      )}
    </>
  );
}

function Pick({ p }: { p: Palette }) {
  return (
    <>
      <ellipse data-a="fade" cx="106" cy="108" rx="78" ry="7" fill={p.g1} />

      <g transform="translate(36 30)">
        <g data-a="fan-left" style={at(120)}>
          <DriverCard p={p} />
        </g>
      </g>
      <g transform="translate(120 30)">
        <g data-a="fan-right" style={at(120)}>
          <DriverCard p={p} />
        </g>
      </g>

      <g transform="translate(78 30)">
        <g data-a="rise">
          <g data-a="lift" style={at(420)}>
            <DriverCard
              p={p}
              chosen
              label={{ rating: "4.9", price: "KES 800" }}
            />
          </g>
        </g>
      </g>
    </>
  );
}

const TICKET =
  "M98 40H150a4 4 0 0 0 8 0H182a8 8 0 0 1 8 8V88a8 8 0 0 1-8 8H158a4 4 0 0 0-8 0H98a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8Z";

function Go({ p }: { p: Palette }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const BARS = [0, 2.5, 4, 7, 8.5, 11, 13.5, 15, 18];

  return (
    <>
      <defs>
        <clipPath id={`${id}-ticket`}>
          <path d={TICKET} />
        </clipPath>
      </defs>

      <ellipse data-a="fade" cx="114" cy="108" rx="84" ry="7.5" fill={p.g1} />

      <g transform="rotate(4 140 68)">
        <g data-a="issue" style={at(560)}>
          <path
            d={TICKET}
            fill={p.shadow}
            opacity="0.1"
            transform="translate(3 4)"
          />
          <path d={TICKET} fill={p.face} />
          <rect
            x="154"
            y="40"
            width="40"
            height="56"
            fill={p.g2}
            clipPath={`url(#${id}-ticket)`}
          />
          <path
            d="M154 46v44"
            stroke={p.ink}
            strokeOpacity="0.3"
            strokeWidth="1.2"
            strokeDasharray="2.5 3"
          />

          <circle cx="110" cy="56" r="4" stroke={p.ink} strokeWidth="2" />
          <path
            d="M116 56h14"
            stroke={p.ink}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="0.5 4.5"
            opacity="0.5"
          />
          <path
            d="M138 64s-6-6.4-6-10.4a6 6 0 0 1 12 0c0 4-6 10.4-6 10.4Z"
            fill={p.ink}
          />
          <circle cx="138" cy="53.6" r="2.2" fill={p.face} />

          <Txt
            x="106"
            y="86"
            size={11}
            weight={600}
            fill={p.ink}
            opacity="0.55"
          >
            Seat
          </Txt>
          <Txt x="133" y="86" size={14} fill={p.ink}>
            2
          </Txt>

          <g fill={p.ink} opacity="0.6">
            {BARS.map((x, i) => (
              <rect
                key={x}
                x={163 + x}
                y="54"
                width={i % 3 === 0 ? 1.8 : 1}
                height="30"
              />
            ))}
          </g>
        </g>
      </g>

      <ellipse
        cx="70"
        cy="107"
        rx="26"
        ry="3.4"
        fill={p.shadow}
        opacity="0.12"
        data-a="fade"
      />
      <g transform="translate(44 12) rotate(-7 26 46)">
        <g data-a="rise">
          <rect
            x="3"
            y="4"
            width="52"
            height="92"
            rx="12"
            fill={p.shadow}
            opacity="0.12"
          />
          <rect x="0" y="0" width="52" height="92" rx="12" fill={p.g4} />
          <rect x="51" y="24" width="2.4" height="14" rx="1.2" fill={p.g4} />
          <rect x="4" y="5" width="44" height="82" rx="8" fill={p.face} />
          <rect x="19" y="8.5" width="14" height="3.2" rx="1.6" fill={p.g4} />
          <path d="M4 20V13a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v7Z" fill={p.g2} />

          <g data-a="pop" style={at(300)}>
            <circle cx="26" cy="44" r="14" fill={p.mark} />
          </g>
          <path
            data-a="draw"
            style={at(400)}
            pathLength={1}
            d="m19.5 44.5 4.5 4.5 8.5-9"
            stroke={p.onMark}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Txt
            data-a="fade"
            style={at(460)}
            x="26"
            y="74"
            size={11}
            fill={p.ink}
            textAnchor="middle"
          >
            Paid
          </Txt>
        </g>
      </g>
    </>
  );
}

const SCENES = { pin: Where, car: Pick, check: Go } as const;

export function StepArt({ icon, ink, mark, bg: bgProp }: Props) {
  const [ref, play] = useInView<SVGSVGElement>();
  const [wrapRef, colors] = useResolvedColors(ink, mark, bgProp);
  const Body = SCENES[icon];
  const p = colors ? palette(colors.bg, colors.ink, colors.mark) : null;

  return (
    <Wrap ref={wrapRef}>
      <Scene
        ref={ref}
        $play={play}
        $ready={p !== null}
        $base={ORDER[icon] * STEP_GAP}
        {...BOX}
        aria-hidden
      >
        {p && <Body p={p} />}
      </Scene>
    </Wrap>
  );
}

export { palette, Where, Pick, Go };
