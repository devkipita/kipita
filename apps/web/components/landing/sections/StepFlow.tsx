"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
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
/* After the user swipes/taps, wait this long with no interaction before the
   drum starts turning on its own again. */
const RESUME_MS = 6000;

// Drum geometry: cards ANGLE_STEP degrees apart on a rim of radius
// RADIUS_RATIO × stage width (controls how far side cards fan out).
const ANGLE_STEP = 52;
const RADIUS_RATIO = 0.46;

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

  /* Mobile: rotating-drum stage. Cards sit on a cylinder rim — active card
     faces front, neighbours turn and tuck behind. Rotation is driven by the
     native scroll position of the overlay SwipeTrack. */
  @media (max-width: 760px) {
    display: block;
    position: relative;
    grid-template-columns: none;
    gap: 0;
    height: calc(var(--stage-h, 320px) + 28px);
    padding: 14px 0;
    overflow: hidden;
    perspective: 1300px;
    transform-style: preserve-3d;
  }
`;

/* Transparent native scroller layered over the drum. It owns the gesture:
   horizontal swipe scrolls it (with momentum + snap), vertical falls through to
   the page — the reliable pattern every mobile carousel uses. rot is read from
   its scrollLeft. Desktop hides it. */
const SwipeTrack = styled.div`
  display: none;

  @media (max-width: 760px) {
    display: flex;
    position: absolute;
    inset: 0;
    z-index: 50;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const SwipeCell = styled.div`
  flex: 0 0 100%;
  height: 100%;
  scroll-snap-align: center;
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

  /* Mobile: visual-only card on the drum rim. transform/opacity/z-index are set
     by JS from scroll position; the SwipeTrack overlay owns input. $pos is just
     a pre-hydration pose. */
  @media (max-width: 760px) {
    position: absolute;
    top: 14px;
    left: 50%;
    width: 78%;
    max-width: 340px;
    min-height: 320px;
    margin: 0;
    pointer-events: none;
    will-change: transform, opacity;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    transition: none;
    z-index: ${({ $pos }) => ($pos === 0 ? 30 : 10)};
    opacity: ${({ $pos }) => ($pos === 0 ? 1 : 0.5)};
    box-shadow: ${({ $pos }) =>
      $pos === 0 ? "0 22px 50px -26px rgba(0, 0, 0, 0.7)" : "none"};
    transform: ${({ $pos }) => {
      const base =
        $pos === 0
          ? "-50%"
          : $pos < 0
            ? "calc(-50% - 42%)"
            : "calc(-50% + 42%)";
      const sc = $pos === 0 ? 1 : 0.82;
      return `translateX(${base}) scale(${sc})`;
    }};
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
  const N = STEPS.length;
  // Endless swipe: the mobile track holds SETS copies of the N cells so the user
  // can keep swiping in either direction. Once a swipe settles, scrollLeft is
  // snapped back to the middle set — invisible, since the drum poses cards by
  // rotation mod N, so a whole-set jump lands on an identical frame.
  const SETS = 5;
  const baseCell = N * ((SETS - 1) / 2); // first cell of the middle set
  const totalCells = N * SETS;
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [stageH, setStageH] = useState(0);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(0);
  const isMobileRef = useRef(false);
  const reducedRef = useRef(false);

  // rot = drum rotation in cards (0..N-1), read from the SwipeTrack's scroll.
  const rot = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false); // true while we drive scrollTo ourselves
  const scrollEnd = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swiped = useRef(false); // a real swipe just happened (suppress tap-nav)

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const pauseTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // Advance one step: mobile scrolls the track one cell forward (endless — the
  // recenter keeps it in range); desktop cycles the active index and lets the
  // grid transitions animate.
  const advance = () => {
    const cur = activeRef.current;
    if (isMobileRef.current) {
      const track = trackRef.current;
      if (!track) return;
      const curCell = Math.round(track.scrollLeft / (track.clientWidth || 1));
      scrollToCell(curCell + 1, true);
    } else {
      const next = (cur + 1) % N;
      setActive(next);
      rot.current = next;
    }
  };

  const startAuto = () => {
    if (reducedRef.current) return;
    pauseTimer();
    timer.current = setInterval(advance, STEP_MS);
  };

  // Keep auto-play off, then resume after RESUME_MS of no interaction.
  const scheduleResume = () => {
    if (idle.current) clearTimeout(idle.current);
    if (reducedRef.current) return;
    idle.current = setTimeout(() => {
      idle.current = null;
      startAuto();
    }, RESUME_MS);
  };

  const syncActive = (r: number) => {
    const idx = ((Math.round(r) % N) + N) % N;
    if (idx !== activeRef.current) setActive(idx);
  };

  // Position each card on the cylinder rim for rotation r, writing straight to
  // the DOM. Desktop uses the plain grid, so clear inline styles and bail.
  const place = (r: number) => {
    const stage = cardsRef.current;
    if (!stage) return;
    if (!isMobileRef.current) {
      cardEls.current.forEach((el) => {
        if (!el) return;
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
      });
      return;
    }
    const width = stage.clientWidth || 320;
    const radius = width * RADIUS_RATIO;
    const maxRad = ((N / 2) * ANGLE_STEP * Math.PI) / 180;
    const cosMax = Math.cos(maxRad);
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      // Signed distance from front, wrapped so neighbours peek on both sides.
      let dist = (((i - r) % N) + N) % N;
      if (dist > N / 2) dist -= N;
      const rad = (dist * ANGLE_STEP * Math.PI) / 180;
      const depth = Math.cos(rad);
      const t = Math.max(0, (depth - cosMax) / (1 - cosMax)); // 0 back → 1 front
      const x = Math.sin(rad) * radius;
      const scale = 0.8 + 0.2 * t;
      const ry = dist * ANGLE_STEP * 0.6;
      el.style.transform = `translateX(calc(-50% + ${x.toFixed(2)}px)) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = t.toFixed(3);
      el.style.zIndex = String(Math.round(t * 100) + 1);
    });
  };

  // Scroll to an absolute cell index on the (SETS × N) track, clamped so runaway
  // taps can't overshoot the buffer before the next recenter runs.
  const scrollToCell = (cell: number, prog: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const c = Math.max(0, Math.min(totalCells - 1, cell));
    if (prog) programmatic.current = true;
    track.scrollTo({
      left: c * track.clientWidth,
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  };

  // Once a swipe/advance settles, snap scrollLeft back into the middle set. The
  // jump is a whole number of sets, so the drum pose (rot mod N) is unchanged —
  // seamless, and it's what lets the user keep circling forever either way.
  const recenter = () => {
    const track = trackRef.current;
    if (!track) return;
    const w = track.clientWidth || 1;
    const cell = Math.round(track.scrollLeft / w);
    const step = ((cell % N) + N) % N;
    const mid = baseCell + step;
    if (cell !== mid) {
      programmatic.current = true;
      track.scrollLeft = mid * w;
      rot.current = mid;
    }
  };

  // Go to a step. Mobile scrolls the track by the shortest signed path around
  // the ring (so it wraps in whichever direction is nearer); desktop sets state.
  const go = (i: number) => {
    pauseTimer();
    if (isMobileRef.current) {
      const track = trackRef.current;
      if (track) {
        const curCell = Math.round(track.scrollLeft / (track.clientWidth || 1));
        const curStep = ((curCell % N) + N) % N;
        const targetStep = ((i % N) + N) % N;
        let d = (((targetStep - curStep) % N) + N) % N;
        if (d > N / 2) d -= N;
        scrollToCell(curCell + d, true);
      }
    } else {
      const idx = Math.max(0, Math.min(N - 1, i));
      setActive(idx);
      rot.current = idx;
    }
    scheduleResume();
  };

  // Every scroll frame maps scrollLeft → rotation and repaints the drum.
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    rot.current = track.scrollLeft / (track.clientWidth || 1);
    place(rot.current);
    syncActive(rot.current);
    if (!programmatic.current) swiped.current = true;
    if (scrollEnd.current) clearTimeout(scrollEnd.current);
    scrollEnd.current = setTimeout(() => {
      const wasUser = !programmatic.current;
      programmatic.current = false;
      swiped.current = false;
      if (wasUser) scheduleResume();
      recenter();
    }, 150);
  };

  // A touch on the track means the user is taking over: stop auto-play.
  const onTrackDown = () => {
    programmatic.current = false;
    pauseTimer();
    if (idle.current) {
      clearTimeout(idle.current);
      idle.current = null;
    }
  };

  // Tap the left/right third to step (ignored if it was actually a swipe).
  const onTrackClick = (e: ReactMouseEvent) => {
    if (swiped.current) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.4) go(activeRef.current - 1);
    else if (x > 0.6) go(activeRef.current + 1);
  };

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduced(isReduced);
    reducedRef.current = isReduced;
    if (isReduced) return;

    startAuto();
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (idle.current) clearTimeout(idle.current);
      if (scrollEnd.current) clearTimeout(scrollEnd.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch the mobile breakpoint; align the track scroll to the active step.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      isMobileRef.current = mq.matches;
      if (mq.matches && trackRef.current) {
        const cell = baseCell + activeRef.current;
        rot.current = cell;
        trackRef.current.scrollLeft = cell * trackRef.current.clientWidth;
      }
      place(rot.current);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Size the stage to the tallest card and repaint on resize (radius ∝ width).
  useEffect(() => {
    const measure = () => {
      let h = 0;
      cardEls.current.forEach((el) => {
        if (el) h = Math.max(h, el.offsetHeight);
      });
      if (h) setStageH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      // Keep the track parked in the middle set once we know the width, so
      // there's always buffer to swipe into on both sides (and no edge-stuck
      // state if the width wasn't ready on mount). RO never fires mid-swipe.
      const track = trackRef.current;
      if (isMobileRef.current && track && track.clientWidth) {
        const step = ((Math.round(rot.current) % N) + N) % N;
        const cell = baseCell + step;
        track.scrollLeft = cell * track.clientWidth;
        rot.current = cell;
      }
      place(rot.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (cardsRef.current) ro.observe(cardsRef.current);
    cardEls.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <CardsRow
        ref={cardsRef}
        style={
          stageH
            ? ({ "--stage-h": `${stageH}px` } as CSSProperties)
            : undefined
        }
      >
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

        <SwipeTrack
          ref={trackRef}
          onScroll={onTrackScroll}
          onPointerDown={onTrackDown}
          onClick={onTrackClick}
          aria-hidden
        >
          {Array.from({ length: totalCells }, (_, i) => (
            <SwipeCell key={`swipe-${i}`} />
          ))}
        </SwipeTrack>
      </CardsRow>
    </Wrap>
  );
}
