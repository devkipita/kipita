"use client";

import styled, { keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

const stepIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0deg); }
  30% { transform: rotate(-16deg); }
  65% { transform: rotate(10deg); }
`;

const cheer = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const fall = keyframes`
  0% { opacity: 0; transform: translate3d(0, -24px, 0) rotate(0deg); }
  10% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; transform: translate3d(var(--dx), 236px, 0) rotate(var(--r)); }
`;

const TONES = ["cta", "lime", "accent", "amber", "deep"] as const;

const BITS = Array.from({ length: 22 }, (_, i) => {
  const x = 16 + ((i * 53) % 392);
  const y = -8 + ((i * 29) % 56);
  return {
    x,
    y,
    tone: TONES[i % TONES.length],
    round: i % 3 === 0,
    dx: ((i * 37) % 40) - 20,
    r: 180 + ((i * 71) % 360),
    speed: 6 + (i % 4),
    delay: (i * 7) % 22,
  };
});

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;

  .ink { stroke: ${nocturne.ink}; }
  .ink-fill { fill: ${nocturne.ink}; }
  .accent { fill: ${nocturne.green}; }
  .deep { fill: ${nocturne.greenDeep}; }
  .lime { fill: ${nocturne.lime}; }
  .cta { fill: ${nocturne.ctaBg}; }
  .amber { fill: ${({ theme }) => theme.tone.amber.on}; }
  .skin { fill: ${nocturne.tan}; }
  .paper { fill: ${nocturne.surface}; }
  .road { fill: ${nocturne.surface2}; }
  .hill { fill: ${nocturne.green}; }
  .glass { fill: color-mix(in oklab, ${nocturne.green} 22%, ${nocturne.surface}); }
  .lane { stroke: ${nocturne.lime}; }
  .board { fill: ${nocturne.greenDeep}; }
  .armline { stroke-width: 9; stroke-linecap: round; }
  .cta-stroke { stroke: ${nocturne.ctaBg}; }
  .accent-stroke { stroke: ${nocturne.green}; }
  .deep-stroke { stroke: ${nocturne.greenDeep}; }
  .post { fill: ${nocturne.ink}; }
  .sign-text {
    fill: ${nocturne.onGreen};
    font-family: var(--font-manrope), sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .car,
  .sign,
  .person {
    transform-box: fill-box;
    animation: ${stepIn} ${dur.enter} ${ease.enter} both;
  }
  .sign { animation-delay: calc(${dur.press} * 1); }
  .p1 { animation-delay: calc(${dur.press} * 2); }
  .p2 { animation-delay: calc(${dur.press} * 3); }
  .p3 { animation-delay: calc(${dur.press} * 4); }

  .hop {
    transform-box: fill-box;
    animation: ${cheer} calc(${dur.max} * 2) ${ease.standard} infinite;
  }
  .p2 .hop { animation-delay: calc(${dur.press} * 3); }

  .arm {
    transform-box: fill-box;
    transform-origin: 20% 90%;
    animation: ${wave} calc(${dur.max} * 2) ${ease.standard} infinite;
  }

  .bit {
    transform-box: fill-box;
    transform-origin: center;
    animation: ${fall} linear infinite both;
  }
  ${BITS.map(
    (b, i) =>
      `.bit-${i} { --dx: ${b.dx}px; --r: ${b.r}deg; animation-duration: calc(${dur.max} * ${b.speed}); animation-delay: calc(${dur.press} * ${b.delay}); }`,
  ).join("\n")}

  @media (prefers-reduced-motion: reduce) {
    .car, .sign, .person, .hop, .arm { animation: none; }
    .bit { animation: none; opacity: 0.9; }
  }
`;

function signName(name: string | undefined): string {
  const town = (name ?? "").split(",")[0].trim();
  return town.length > 12 ? `${town.slice(0, 11)}…` : town;
}

function Face({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle className="ink-fill" cx={x - 5} cy={y + 1} r="1.8" />
      <circle className="ink-fill" cx={x + 5} cy={y + 1} r="1.8" />
      <path className="ink" d={`M${x - 5} ${y + 7} q5 5 10 0`} fill="none" strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function Legs({ x }: { x: number }) {
  return (
    <>
      <rect className="deep" x={x - 10} y="178" width="9" height="34" rx="4" />
      <rect className="deep" x={x + 1} y="178" width="9" height="34" rx="4" />
      <ellipse className="ink-fill" cx={x - 6} cy="213" rx="7" ry="3.5" />
      <ellipse className="ink-fill" cx={x + 6} cy="213" rx="7" ry="3.5" />
    </>
  );
}

export function FinishArt({ destination }: { destination?: string }) {
  const town = signName(destination);
  return (
    <Svg viewBox="0 0 420 260" aria-hidden="true" focusable="false">
      <circle className="lime" cx="352" cy="58" r="24" opacity="0.55" />
      <path className="hill" d="M0 206 Q70 150 160 196 Q240 140 330 184 Q380 168 420 180 V216 H0 Z" opacity="0.14" />
      <path className="hill" d="M0 210 Q110 176 210 204 Q300 178 420 200 V216 H0 Z" opacity="0.22" />

      <rect className="road" x="0" y="212" width="420" height="34" rx="17" />
      <path className="lane" d="M24 229 H396" fill="none" strokeWidth="3" strokeDasharray="18 14" strokeLinecap="round" />

      {town ? (
        <g className="sign">
          <rect className="post" x="74" y="76" width="5" height="138" rx="2.5" />
          <rect className="post" x="171" y="76" width="5" height="138" rx="2.5" />
          <rect className="board" x="56" y="38" width="138" height="44" rx="10" />
          <rect className="lime" x="64" y="72" width="122" height="3" rx="1.5" opacity="0.8" />
          <text className="sign-text" x="125" y="65" textAnchor="middle">
            {town}
          </text>
        </g>
      ) : null}

      <g className="car">
        <ellipse className="ink-fill" cx="282" cy="214" rx="78" ry="5" opacity="0.12" />
        <path
          className="paper"
          d="M206 204 V180 Q206 170 216 168 L238 164 L258 140 Q262 136 268 136 H312 Q318 136 322 140 L342 164 L350 166 Q358 168 358 178 V204 Z"
        />
        <path
          className="ink"
          d="M206 204 V180 Q206 170 216 168 L238 164 L258 140 Q262 136 268 136 H312 Q318 136 322 140 L342 164 L350 166 Q358 168 358 178 V204 Z"
          fill="none"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path className="glass" d="M246 164 L263 144 H287 V164 Z" />
        <path className="glass" d="M294 144 H314 L332 164 H294 Z" />
        <path className="ink" d="M246 164 L263 144 H287 V164 Z M294 144 H314 L332 164 H294 Z" fill="none" strokeWidth="2" strokeLinejoin="round" />
        <path className="ink" d="M290 168 V202 M216 184 H350" fill="none" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <rect className="ink-fill" x="298" y="174" width="10" height="3" rx="1.5" />
        <rect className="lime" x="348" y="174" width="9" height="7" rx="3" />
        <rect className="cta" x="206" y="174" width="6" height="8" rx="2" />
        <circle className="ink-fill" cx="238" cy="206" r="16" />
        <circle className="paper" cx="238" cy="206" r="6.5" />
        <circle className="ink-fill" cx="326" cy="206" r="16" />
        <circle className="paper" cx="326" cy="206" r="6.5" />
      </g>

      <g className="person p1">
        <rect className="amber" x="20" y="182" width="28" height="30" rx="6" />
        <path className="ink" d="M28 182 v-6 h12 v6" fill="none" strokeWidth="2.2" strokeLinejoin="round" />
        <g className="hop">
          <Legs x={98} />
          <path className="cta" d="M84 182 V152 Q84 138 98 138 Q112 138 112 152 V182 Z" />
          <line x1="87" y1="148" x2="74" y2="114" className="armline cta-stroke" />
          <circle className="skin" cx="73" cy="110" r="5.5" />
          <line x1="109" y1="148" x2="122" y2="114" className="armline cta-stroke" />
          <circle className="skin" cx="123" cy="110" r="5.5" />
          <rect className="skin" x="94" y="130" width="8" height="10" rx="3" />
          <circle className="skin" cx="98" cy="120" r="14" />
          <path className="ink-fill" d="M84 120 Q83 104 98 104 Q113 104 112 120 Q110 112 98 111 Q87 111 84 124 Z" />
          <path className="ink-fill" d="M84 118 Q82 132 86 138 L88 124 Z M112 118 Q114 132 110 138 L108 124 Z" />
          <Face x={98} y={119} />
        </g>
      </g>

      <g className="person p2">
        <g className="hop">
          <Legs x={150} />
          <path className="accent" d="M136 182 V152 Q136 138 150 138 Q164 138 164 152 V182 Z" />
          <line x1="139" y1="148" x2="128" y2="116" className="armline accent-stroke" />
          <circle className="skin" cx="127" cy="112" r="5.5" />
          <line x1="161" y1="148" x2="172" y2="116" className="armline accent-stroke" />
          <circle className="skin" cx="173" cy="112" r="5.5" />
          <rect className="skin" x="146" y="130" width="8" height="10" rx="3" />
          <circle className="skin" cx="150" cy="120" r="14" />
          <path className="ink-fill" d="M136 117 Q137 106 150 106 Q163 106 164 117 Q157 112 150 112 Q143 112 136 117 Z" />
          <path className="lime" d="M135 112 Q136 100 150 100 Q164 100 165 112 Z" />
          <rect className="deep" x="150" y="109" width="22" height="5" rx="2.5" />
          <Face x={150} y={119} />
        </g>
      </g>

      <g className="person p3">
        <Legs x={388} />
        <path className="deep" d="M374 182 V152 Q374 138 388 138 Q402 138 402 152 V182 Z" />
        <rect className="lime" x="386" y="144" width="4" height="30" rx="2" />
        <line x1="377" y1="150" x2="370" y2="176" className="armline deep-stroke" />
        <circle className="skin" cx="369" cy="180" r="5.5" />
        <g className="arm">
          <line x1="399" y1="148" x2="410" y2="118" className="armline deep-stroke" />
          <circle className="skin" cx="411" cy="114" r="5.5" />
        </g>
        <rect className="skin" x="384" y="130" width="8" height="10" rx="3" />
        <circle className="skin" cx="388" cy="120" r="14" />
        <path className="deep" d="M373 114 Q374 102 388 102 Q402 102 403 114 Z" />
        <rect className="deep" x="366" y="111" width="24" height="5" rx="2.5" />
        <Face x={388} y={119} />
      </g>

      {BITS.map((b, i) =>
        b.round ? (
          <circle key={i} className={`bit bit-${i} ${b.tone}`} cx={b.x} cy={b.y} r="3.5" />
        ) : (
          <rect key={i} className={`bit bit-${i} ${b.tone}`} x={b.x - 3} y={b.y - 5} width="6" height="11" rx="1.5" />
        ),
      )}
    </Svg>
  );
}
