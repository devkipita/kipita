"use client";

import { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

type Step = {
  label: string;
  title: string;
  body: string;
  pills: [string, string];
  icon: string;
  bg: string;
  ink: [number, number, number];
  accent: string;
  dotFg: string;
};

const STEPS: Step[] = [
  {
    label: "Step 01",
    title: "Search your route",
    body: "Tell us where you're headed. We find drivers already going that way.",
    pills: ["Set pickup", "Set drop-off"],
    icon: "/steps/search.svg",
    bg: "#013330",
    ink: [229, 255, 195],
    accent: "#e5ffc3",
    dotFg: "#013330",
  },
  {
    label: "Step 02",
    title: "Chat, then pay",
    body: "Agree pickup with the driver. Pay by M–Pesa, held safely in the app.",
    pills: ["In-app chat", "Escrow held"],
    icon: "/steps/chat.svg",
    bg: "#F8A783",
    ink: [42, 16, 2],
    accent: "#F8A783",
    dotFg: "#2A1002",
  },
  {
    label: "Step 03",
    title: "Ride and rate",
    body: "Track the trip live. Money releases to the driver when you arrive.",
    pills: ["Live tracking", "Rate driver"],
    icon: "/steps/star.svg",
    bg: "#DDB8FB",
    ink: [59, 10, 99],
    accent: "#DDB8FB",
    dotFg: "#3B0A63",
  },
];

const STEP_MS = 2400;

const rgba = (c: [number, number, number], a: number) =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35); }
  70% { box-shadow: 0 0 0 22px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
`;

const Wrap = styled.div`
  --gap: clamp(14px, 2vw, 28px);
  --dot: clamp(58px, 6.6vw, 96px);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(28px, 4vw, 48px);
`;

const DotsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap);
`;

const DotCell = styled.div`
  position: relative;
  height: calc(var(--dot) + 14px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Line = styled.span`
  position: absolute;
  z-index: 0;
  top: 50%;
  left: calc(50% + (var(--dot) / 2) + 6px);
  width: calc(100% + var(--gap) - var(--dot) - 12px);
  height: 4px;
  transform: translateY(-50%);
  background-image: radial-gradient(circle, #333 1.6px, transparent 1.7px);
  background-size: 14px 4px;
  background-repeat: repeat-x;
`;

const LineFill = styled.span<{ $on: boolean; $color: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  width: ${({ $on }) => ($on ? "100%" : "0%")};
  background-image: ${({ $color }) =>
    `radial-gradient(circle, ${$color} 1.6px, transparent 1.7px)`};
  background-size: 14px 4px;
  background-repeat: repeat-x;
  transition: width 620ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Dot = styled.span<{
  $bg: string;
  $fg: string;
  $border: string;
  $scale: number;
  $pulse: boolean;
}>`
  position: relative;
  z-index: 1;
  width: var(--dot);
  height: var(--dot);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: clamp(26px, 3.4vw, 44px);
  font-weight: 700;
  border: 3px dotted ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  transform: scale(${({ $scale }) => $scale});
  transition:
    background 420ms ease,
    color 420ms ease,
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 420ms ease;
  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${pulse} 1800ms ease-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
  }
`;

const CardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{
  $bg: string;
  $op: number;
  $y: string;
  $shadow: string;
}>`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  cursor: pointer;
  border-radius: clamp(24px, 2.4vw, 32px);
  padding: clamp(28px, 3.4vw, 44px) clamp(24px, 3vw, 40px)
    clamp(26px, 3vw, 40px);
  min-height: clamp(300px, 32vw, 420px);
  background: ${({ $bg }) => $bg};
  opacity: ${({ $op }) => $op};
  transform: translateY(${({ $y }) => $y});
  box-shadow: ${({ $shadow }) => $shadow};
  transition:
    opacity 420ms ease,
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 420ms ease;

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.span<{ $c: string }>`
  font-size: clamp(13px, 1vw, 19px);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ $c }) => $c};
`;

const IconBubble = styled.span<{ $bg: string }>`
  flex: none;
  width: clamp(44px, 4vw, 52px);
  height: clamp(44px, 4vw, 52px);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};

  img {
    width: clamp(22px, 2.2vw, 26px);
    height: auto;
    display: block;
  }
`;

const Title = styled.h3<{ $c: string }>`
  margin: clamp(20px, 2.4vw, 28px) 0 0;
  font-size: clamp(28px, 3.4vw, 46px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: ${({ $c }) => $c};
  text-wrap: pretty;
`;

const Body = styled.p<{ $c: string }>`
  margin: clamp(16px, 1.8vw, 22px) 0 0;
  font-size: clamp(16px, 1.5vw, 23px);
  font-weight: 500;
  line-height: 1.36;
  color: ${({ $c }) => $c};
  text-wrap: pretty;
`;

const Spacer = styled.div`
  flex: 1;
  min-height: 24px;
`;

const Pills = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Pill = styled.span<{ $bg: string; $c: string }>`
  padding: clamp(9px, 1vw, 12px) clamp(14px, 1.4vw, 20px);
  border-radius: 999px;
  font-size: clamp(14px, 1vw, 18px);
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $c }) => $c};
`;

export function StepFlow() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduced(isReduced);
    if (isReduced) return;

    timer.current = setInterval(
      () => setActive((a) => (a + 1) % STEPS.length),
      STEP_MS,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const go = (i: number) => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setActive(i);
  };

  return (
    <Wrap>
      <DotsRow>
        {STEPS.map((s, i) => {
          const reached = reduced || i <= active;
          const on = !reduced && i === active;
          return (
            <DotCell key={s.label}>
              {i < STEPS.length - 1 ? (
                <Line aria-hidden>
                  <LineFill
                    $on={reduced || active >= i + 1}
                    $color={s.accent}
                  />
                </Line>
              ) : null}
              <Dot
                $bg={reached ? s.accent : "transparent"}
                $fg={reached ? s.dotFg : "#6B6B6B"}
                $border={reached ? s.accent : "#3A3A3A"}
                $scale={on ? 1.12 : 1}
                $pulse={on}
                aria-hidden
              >
                {i + 1}
              </Dot>
            </DotCell>
          );
        })}
      </DotsRow>

      <CardsRow>
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <Card
              key={s.label}
              role="button"
              tabIndex={0}
              aria-current={isActive ? "step" : undefined}
              onClick={() => go(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(i);
                }
              }}
              $bg={s.bg}
              $op={reduced ? 1 : isActive ? 1 : 0.42}
              $y={!reduced && isActive ? "-12px" : "0px"}
              $shadow={
                !reduced && isActive
                  ? `0 26px 60px -20px ${s.accent}66`
                  : "0 0 0 0 transparent"
              }
            >
              <CardHead>
                <Label $c={rgba(s.ink, 0.58)}>{s.label}</Label>
                <IconBubble $bg={rgba(s.ink, 0.12)}>
                  <img src={s.icon} alt="" width={26} height={26} />
                </IconBubble>
              </CardHead>
              <Title $c={`rgb(${s.ink[0]}, ${s.ink[1]}, ${s.ink[2]})`}>
                {s.title}
              </Title>
              <Body $c={rgba(s.ink, 0.78)}>{s.body}</Body>
              <Spacer />
              <Pills>
                {s.pills.map((p) => (
                  <Pill key={p} $bg={rgba(s.ink, 0.11)} $c={rgba(s.ink, 0.95)}>
                    {p}
                  </Pill>
                ))}
              </Pills>
            </Card>
          );
        })}
      </CardsRow>
    </Wrap>
  );
}
