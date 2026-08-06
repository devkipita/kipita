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

/* A slow, continuous rotation for the dashed halo around the active number. */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* Dots flow forward along the completed part of the track — a subtle nod to
   the journey moving toward the next step. */
const march = keyframes`
  to { background-position-x: 18px; }
`;

/* Gentle breathing so every number feels alive, not just the active one. */
const breathe = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
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
  height: calc(var(--dot) + 34px);
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
  height: 6px;
  transform: translateY(-50%);
  background-image: radial-gradient(circle, #333 2.7px, transparent 2.8px);
  background-size: 18px 6px;
  background-repeat: repeat-x;
`;

const LineFill = styled.span<{ $on: boolean; $color: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  width: ${({ $on }) => ($on ? "100%" : "0%")};
  background-image: ${({ $color }) =>
    `radial-gradient(circle, ${$color} 2.7px, transparent 2.8px)`};
  background-size: 18px 6px;
  background-repeat: repeat-x;
  transition: width 620ms ease;
  animation: ${march} 900ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
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
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 420ms ease;

  /* A slowly rotating dashed halo marks the active step — elegant and
     continuous, no harsh glow or layout shift. */
  &::before {
    content: "";
    position: absolute;
    inset: -12px;
    border-radius: 999px;
    border: 4px dotted ${({ $border }) => $border};
    opacity: ${({ $pulse }) => ($pulse ? 0.85 : 0)};
    transition: opacity 420ms ease;
    ${({ $pulse }) =>
      $pulse &&
      css`
        animation: ${spin} 7s linear infinite;
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;

    &::before {
      animation: none;
    }
  }
`;

/* The number itself breathes on a per-step delay so the row ripples gently. */
const Num = styled.span<{ $i: number }>`
  display: inline-flex;
  animation: ${breathe} 3.4s ease-in-out infinite;
  animation-delay: ${({ $i }) => $i * 0.35}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap);

  /* On mobile the row becomes a native, swipeable scroll-snap carousel: the
     centred card is the active step and its neighbours peek in from the sides.
     Real momentum scrolling + snap keeps it smooth on touch with no JS jank. */
  @media (max-width: 760px) {
    display: flex;
    grid-template-columns: none;
    gap: 16px;
    padding: 16px 9% 40px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Card = styled.div<{
  $bg: string;
  $op: number;
  $shadow: string;
  $pos: number;
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
  box-shadow: ${({ $shadow }) => $shadow};
  transform-origin: center center;
  /* Desktop: the active card lifts with a minimal, smooth scale — no jump. */
  transform: ${({ $pos }) => ($pos === 0 ? "scale(1.03)" : "scale(1)")};
  transition:
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 520ms ease,
    box-shadow 520ms ease;

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 3px;
  }

  /* On mobile each card is a scroll-snap item that centres in the viewport as
     you swipe. The active (centred) card sits at full size; its neighbours
     ease down a touch and dim, giving a smooth coverflow feel while staying
     genuinely scrollable. $pos: 0 = active/centre, otherwise a side card. */
  @media (max-width: 760px) {
    position: static;
    flex: 0 0 82%;
    max-width: 360px;
    min-height: 320px;
    scroll-snap-align: center;
    z-index: auto;
    opacity: ${({ $pos }) => ($pos === 0 ? 1 : 0.5)};
    transform: ${({ $pos }) => ($pos === 0 ? "scale(1)" : "scale(0.9)")};
    box-shadow: ${({ $pos }) =>
      $pos === 0 ? "0 16px 36px -22px rgba(0, 0, 0, 0.6)" : "none"};
    transition:
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 360ms ease,
      box-shadow 360ms ease;
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
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(0);
  // True while WE are driving a smooth scroll, so the scroll listener doesn't
  // mistake it for the user swiping (which would pause the auto-advance).
  const programmatic = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const pauseTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // Smoothly centre a card in the mobile scroller. No-op on desktop (grid,
  // nothing to scroll) so the same handler is safe everywhere.
  const scrollToCard = (i: number) => {
    const scroller = cardsRef.current;
    const el = cardEls.current[i];
    if (!scroller || !el) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
    programmatic.current = true;
    const left = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: "smooth" });
  };

  const nearestCard = () => {
    const scroller = cardsRef.current;
    if (!scroller) return activeRef.current;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = Infinity;
    let idx = 0;
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      const c = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    return idx;
  };

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduced(isReduced);
    if (isReduced) return;

    timer.current = setInterval(() => {
      const next = (activeRef.current + 1) % STEPS.length;
      setActive(next);
      scrollToCard(next);
    }, STEP_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Keep the dots + emphasis in sync as the user swipes the mobile carousel,
  // and pause the auto-advance the moment they take over.
  useEffect(() => {
    const scroller = cardsRef.current;
    if (!scroller) return;
    let endTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        if (programmatic.current) programmatic.current = false;
      }, 130);
      if (programmatic.current) return;
      pauseTimer();
      const n = nearestCard();
      if (n !== activeRef.current) setActive(n);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      clearTimeout(endTimer);
    };
  }, []);

  const go = (i: number) => {
    pauseTimer();
    setActive(i);
    scrollToCard(i);
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
                $scale={on ? 1.06 : 1}
                $pulse={on}
                aria-hidden
              >
                <Num $i={i}>{i + 1}</Num>
              </Dot>
            </DotCell>
          );
        })}
      </DotsRow>

      <CardsRow ref={cardsRef}>
        {STEPS.map((s, i) => {
          const isActive = i === active;
          // Position relative to the active card, normalised to -1 / 0 / 1 so
          // the two inactive cards always sit just behind-left and behind-right
          // in the mobile carousel (3-card loop).
          let pos = i - active;
          if (pos === 2) pos = -1;
          else if (pos === -2) pos = 1;
          return (
            <Card
              key={s.label}
              ref={(el) => {
                cardEls.current[i] = el;
              }}
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
              $op={reduced ? 1 : isActive ? 1 : 0.5}
              $pos={pos}
              $shadow={
                !reduced && isActive
                  ? `0 18px 44px -28px ${s.accent}40`
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
