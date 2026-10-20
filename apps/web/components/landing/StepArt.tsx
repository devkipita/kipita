"use client";

import styled, { css, keyframes } from "styled-components";
import { useInView } from "../anim/useInView";
import { dur, ease } from "@/lib/motion";
import type { RideStep } from "./data";

type Props = { icon: RideStep["icon"]; ink: string; mark: string };

const BOX = { viewBox: "0 0 212 120", fill: "none" } as const;

const pop = keyframes`
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: none; }
`;

const sweep = keyframes`
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
`;

const drop = keyframes`
  from { opacity: 0; transform: translateY(-12px) scale(0.7); }
  to   { opacity: 1; transform: none; }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: none; }
`;

const shut = keyframes`
  from { transform: translateY(-7px); }
  to   { transform: none; }
`;

const draw = keyframes`
  from { stroke-dashoffset: 46; }
  to   { stroke-dashoffset: 0; }
`;

const Scene = styled.svg<{ $play: boolean }>`
  display: block;

  [data-part] {
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
  }
  [data-part="sweep"] {
    transform-origin: left center;
    opacity: 1;
    transform: scaleX(0);
  }
  [data-part="shackle"],
  [data-part="check"] {
    opacity: 1;
  }
  [data-part="check"] {
    stroke-dasharray: 46;
    stroke-dashoffset: 46;
  }

  ${({ $play }) =>
    $play &&
    css`
      [data-part="pop"] {
        animation: ${pop} ${dur.medium2}ms ${ease.emphasizedDecelerate} both;
      }
      [data-part="sweep"] {
        animation: ${sweep} ${dur.long2}ms ${ease.emphasized} 120ms both;
      }
      [data-part="drop"] {
        animation: ${drop} ${dur.medium4}ms ${ease.emphasizedDecelerate} 540ms
          both;
      }
      [data-part="rise"] {
        animation: ${rise} ${dur.medium2}ms ${ease.emphasizedDecelerate} both;
      }
      [data-part="slide"] {
        animation: ${slideIn} ${dur.medium2}ms ${ease.emphasizedDecelerate} 500ms
          both;
      }
      [data-part="shackle"] {
        animation: ${shut} ${dur.medium3}ms ${ease.emphasized} 150ms both;
      }
      [data-part="check"] {
        animation: ${draw} ${dur.medium4}ms ${ease.standardDecelerate} 760ms
          both;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    [data-part] {
      animation: none !important;
      opacity: 1;
      transform: none;
      stroke-dashoffset: 0;
    }
  }
`;

function Route({ ink, mark }: { ink: string; mark: string }) {
  return (
    <>
      <g data-part="pop">
        <circle cx="20" cy="30" r="8" stroke={ink} strokeWidth="2.5" opacity="0.35" />
        <circle cx="20" cy="30" r="3.5" fill={mark} />
      </g>
      <path
        data-part="sweep"
        d="M32 30h146"
        stroke={ink}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="0.5 9"
        opacity="0.35"
      />
      <path
        data-part="drop"
        d="M192 14a10 10 0 0 1 10 10c0 7.4-10 17-10 17s-10-9.6-10-17a10 10 0 0 1 10-10Zm0 6.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z"
        fill={mark}
        fillRule="evenodd"
      />

      {[20, 66, 112, 158].map((x, i) => {
        const on = i === 1;
        return (
          <g key={x} data-part="rise" style={{ animationDelay: `${700 + i * 70}ms` }}>
            <rect
              x={x}
              y="62"
              width="38"
              height="46"
              rx="12"
              stroke={on ? mark : ink}
              strokeWidth="2.5"
              strokeOpacity={on ? 1 : 0.22}
              fill={on ? mark : "none"}
              fillOpacity={on ? 0.12 : 0}
            />
            <rect
              x={x + 10}
              y="74"
              width="18"
              height="4.5"
              rx="2.25"
              fill={on ? mark : ink}
              fillOpacity={on ? 0.6 : 0.18}
            />
            <rect
              x={x + 10}
              y="86"
              width="14"
              height="9"
              rx="3"
              fill={on ? mark : ink}
              fillOpacity={on ? 1 : 0.26}
            />
          </g>
        );
      })}
    </>
  );
}

function Results({ ink, mark }: { ink: string; mark: string }) {
  return (
    <>
      {[6, 44, 82].map((y, i) => {
        const on = i === 1;
        return (
          <g
            key={y}
            data-part="rise"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            <rect
              x="6"
              y={y}
              width="200"
              height="32"
              rx="11"
              stroke={on ? mark : ink}
              strokeWidth="2.5"
              strokeOpacity={on ? 1 : 0.18}
              fill={on ? mark : "none"}
              fillOpacity={on ? 0.1 : 0}
            />
            <circle
              cx="27"
              cy={y + 16}
              r="9"
              fill={mark}
              fillOpacity={on ? 1 : 0.28}
            />
            <rect
              x="46"
              y={y + 9}
              width="60"
              height="5.5"
              rx="2.75"
              fill={ink}
              fillOpacity={on ? 0.75 : 0.26}
            />
            <rect
              x="46"
              y={y + 19}
              width="38"
              height="5"
              rx="2.5"
              fill={ink}
              fillOpacity={on ? 0.42 : 0.16}
            />
            <rect
              x="150"
              y={y + 11}
              width="46"
              height="10"
              rx="5"
              fill={mark}
              fillOpacity={on ? 1 : 0.22}
            />
          </g>
        );
      })}
    </>
  );
}

function Escrow({ ink, mark }: { ink: string; mark: string }) {
  return (
    <>
      <g data-part="pop" style={{ animationDelay: "60ms" }}>
        <path
          data-part="shackle"
          d="M22 56v-10a14 14 0 0 1 28 0v10"
          stroke={mark}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <rect x="12" y="56" width="48" height="38" rx="12" fill={mark} />
      </g>

      <path
        data-part="slide"
        d="M80 63h28m-9-9 9 9-9 9"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.38"
      />

      <g data-part="pop" style={{ animationDelay: "640ms" }}>
        <circle cx="162" cy="63" r="34" stroke={ink} strokeWidth="3" strokeOpacity="0.22" />
        <path
          data-part="check"
          d="m148 63 10 10 21-22"
          stroke={mark}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
}

const SCENES = { pin: Route, car: Results, check: Escrow } as const;

export function StepArt({ icon, ink, mark }: Props) {
  const [ref, play] = useInView<SVGSVGElement>();
  const Body = SCENES[icon];
  return (
    <Scene ref={ref} $play={play} {...BOX} aria-hidden>
      <Body ink={ink} mark={mark} />
    </Scene>
  );
}
