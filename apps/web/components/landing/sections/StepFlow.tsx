"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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

/* Cylinder geometry. Cards sit on the rim of a drum: each is `ANGLE_STEP`
   degrees apart, so rotating the drum swings the neighbours through the centre
   instead of sliding a card across. RADIUS_RATIO is the drum radius as a
   fraction of the stage width (controls how far the side cards fan out).
   LERP is the per-frame ease toward the target rotation. */
const ANGLE_STEP = 52;
const RADIUS_RATIO = 0.46;
const LERP = 0.16;

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

  /* Mobile: a rotating-drum stage (M3 centre-aligned hero layout). Cards sit on
     the rim of a cylinder — the active step faces front; its two neighbours are
     turned and tucked behind, peeking in from the left and right. The whole
     drum rotates continuously (driven per-frame in JS), so a neighbour *swings*
     into the centre rather than a card sliding across. Swipe or tap to turn. */
  @media (max-width: 760px) {
    display: block;
    position: relative;
    grid-template-columns: none;
    gap: 0;
    height: calc(var(--stage-h, 320px) + 28px);
    padding: 14px 0;
    overflow: hidden;
    touch-action: pan-y;
    perspective: 1300px;
    transform-style: preserve-3d;
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

  /* On mobile each card is absolutely stacked on the drum rim. Its transform,
     opacity and depth (z-index) are written every animation frame by JS, so no
     CSS transition here — the requestAnimationFrame loop IS the motion. The
     $pos values below are only a static pre-hydration pose so nothing overlaps
     before the script takes over. */
  @media (max-width: 760px) {
    position: absolute;
    top: 14px;
    left: 50%;
    width: 78%;
    max-width: 340px;
    min-height: 320px;
    margin: 0;
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

  // The drum's rotation, measured in cards (not degrees): `rot` is where it is
  // right now, `target` is where it's easing to. Both are unbounded floats;
  // the visible step is `rot` rounded, mod N.
  const rot = useRef(0);
  const target = useRef(0);
  const raf = useRef<number | null>(null);
  // Live pointer-drag state for the mobile drum (see pointer handlers).
  const drag = useRef({ on: false, startX: 0, startY: 0, axis: "", rot0: 0 });
  // Set right after a horizontal swipe so the trailing click doesn't also fire
  // go() and fight the swipe result.
  const justSwiped = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const pauseTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // Start (or restart) the auto-advance loop.
  const startAuto = () => {
    if (reducedRef.current) return;
    pauseTimer();
    timer.current = setInterval(() => {
      target.current += 1;
      spin();
    }, STEP_MS);
  };

  // Called after a user interaction: keep auto-play off, then resume once the
  // user has been idle for RESUME_MS.
  const scheduleResume = () => {
    if (idle.current) clearTimeout(idle.current);
    if (reducedRef.current) return;
    idle.current = setTimeout(() => {
      idle.current = null;
      startAuto();
    }, RESUME_MS);
  };

  // Reflect the drum's rounded position into React state (dots + aria) only
  // when the focused step actually changes.
  const syncActive = (r: number) => {
    const idx = ((Math.round(r) % N) + N) % N;
    if (idx !== activeRef.current) setActive(idx);
  };

  // Place every card on the cylinder rim for a given rotation. Written straight
  // to the DOM (no React render) so it stays smooth at 60fps. On desktop the
  // cards live in a plain grid, so we clear any inline styles and bail.
  const place = (r: number) => {
    const stage = cardsRef.current;
    if (!stage) return;
    if (!isMobileRef.current) {
      cardEls.current.forEach((el) => {
        if (!el) return;
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
        el.style.pointerEvents = "";
      });
      return;
    }
    const width = stage.clientWidth || 320;
    const radius = width * RADIUS_RATIO;
    const maxRad = ((N / 2) * ANGLE_STEP * Math.PI) / 180;
    const cosMax = Math.cos(maxRad);
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      // Signed distance from front, wrapped into (-N/2, N/2] so each card takes
      // the short way round and the far card sits at the (invisible) back.
      let dist = (((i - r) % N) + N) % N;
      if (dist > N / 2) dist -= N;
      const rad = (dist * ANGLE_STEP * Math.PI) / 180;
      const depth = Math.cos(rad); // 1 = front, smaller = turned away
      const t = Math.max(0, (depth - cosMax) / (1 - cosMax)); // 0 back → 1 front
      const x = Math.sin(rad) * radius;
      const scale = 0.8 + 0.2 * t;
      const ry = dist * ANGLE_STEP * 0.6;
      el.style.transform = `translateX(calc(-50% + ${x.toFixed(2)}px)) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = t.toFixed(3);
      el.style.zIndex = String(Math.round(t * 100) + 1);
      el.style.pointerEvents = t > 0.12 ? "auto" : "none";
    });
  };

  // Ease `rot` toward `target` one frame at a time — the continuous rotation.
  const tick = () => {
    const diff = target.current - rot.current;
    if (Math.abs(diff) < 0.0015) {
      rot.current = target.current;
      place(rot.current);
      syncActive(rot.current);
      raf.current = null;
      return;
    }
    rot.current += diff * LERP;
    place(rot.current);
    syncActive(rot.current);
    raf.current = requestAnimationFrame(tick);
  };

  const spin = () => {
    if (reducedRef.current) {
      rot.current = target.current;
      place(rot.current);
      syncActive(rot.current);
      return;
    }
    if (raf.current == null) raf.current = requestAnimationFrame(tick);
  };

  // Rotate to a specific step, taking the shortest way around the drum.
  const go = (i: number) => {
    pauseTimer();
    const base = Math.round(rot.current);
    const baseMod = ((base % N) + N) % N;
    let delta = i - baseMod;
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    target.current = base + delta;
    spin();
    scheduleResume();
  };

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduced(isReduced);
    reducedRef.current = isReduced;
    if (isReduced) return;

    // Auto-advance keeps turning the drum forward until the user takes over.
    startAuto();
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (idle.current) clearTimeout(idle.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the mobile breakpoint — the drum only applies there; on desktop the
  // grid takes over, so re-place to clear inline styles when crossing over.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      isMobileRef.current = mq.matches;
      place(rot.current);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Size the drum stage to the tallest card (absolute cards don't stretch their
  // parent) and re-place on any resize (rim radius scales with width).
  useEffect(() => {
    const measure = () => {
      let h = 0;
      cardEls.current.forEach((el) => {
        if (el) h = Math.max(h, el.offsetHeight);
      });
      if (h) setStageH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      place(rot.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (cardsRef.current) ro.observe(cardsRef.current);
    cardEls.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mobile drum swipe ─────────────────────────────────────────────────────
  const onPointerDown = (e: ReactPointerEvent) => {
    if (!isMobileRef.current) return;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    // Cancel any pending auto-resume while the user is touching the drum.
    if (idle.current) {
      clearTimeout(idle.current);
      idle.current = null;
    }
    drag.current = {
      on: true,
      startX: e.clientX,
      startY: e.clientY,
      axis: "",
      rot0: rot.current,
    };
    // Capture immediately so the browser hands us the whole gesture instead of
    // grabbing it for a scroll and firing pointercancel mid-swipe. `touch-action:
    // pan-y` still lets vertical drags scroll the page (we release below).
    try {
      cardsRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone — ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    // Lock to an axis on the first real move; vertical drags scroll the page.
    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "y") {
        // Hand the gesture back so the page scrolls normally.
        d.on = false;
        try {
          cardsRef.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      pauseTimer();
    }
    // Turn the drum with the finger: a full card-width drag ≈ one step.
    const width = cardsRef.current?.clientWidth || 320;
    rot.current = d.rot0 - dx / (width * 0.55);
    place(rot.current);
    syncActive(rot.current);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.on || d.axis !== "x") {
      d.on = false;
      return;
    }
    d.on = false;
    const moved = rot.current - d.rot0;
    if (Math.abs(moved) > 0.08) {
      justSwiped.current = true;
      setTimeout(() => {
        justSwiped.current = false;
      }, 350);
    }
    // Snap to the nearest step, but let even a short, decisive flick advance a
    // full step in its direction rather than springing back.
    let tgt = Math.round(rot.current);
    if (Math.abs(moved) >= 0.2) {
      const dir = moved > 0 ? 1 : -1;
      tgt = Math.round(d.rot0) + dir * Math.max(1, Math.round(Math.abs(moved)));
    }
    target.current = tgt;
    spin();
    scheduleResume();
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

      <CardsRow
        ref={cardsRef}
        style={
          stageH
            ? ({ "--stage-h": `${stageH}px` } as CSSProperties)
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
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
              onClick={() => {
                if (justSwiped.current) return;
                go(i);
              }}
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
