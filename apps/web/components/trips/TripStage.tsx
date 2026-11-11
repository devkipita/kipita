"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { nocturne } from "@/lib/nocturne";
import type { BookingStatus } from "@/lib/trips/types";
import {
  ArrivedArt,
  ConfirmedArt,
  RequestSentArt,
  RollingArt,
  SeatHeldArt,
  StoppedArt,
} from "./StageArt";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const LADDER: BookingStatus[] = [
  "requested",
  "pending_payment",
  "confirmed",
  "in_progress",
  "completed",
];

type Copy = { title: string; line: string; nudge: string };

const PASSENGER: Record<BookingStatus, Copy> = {
  requested: {
    title: "Request sent",
    line: "Your driver has it. Most answer within a few minutes, and nothing is charged until they say yes.",
    nudge: "We will tell you here the moment they answer.",
  },
  pending_payment: {
    title: "Seat held for you",
    line: "The driver said yes. Pay with M-Pesa to lock it in — the seat is yours until the hold runs out.",
    nudge: "One step left before this trip is confirmed.",
  },
  confirmed: {
    title: "You are on this ride",
    line: "Kipita holds your fare until you arrive, then passes it to your driver. Nothing else to do.",
    nudge: "Be at the pickup point a few minutes early.",
  },
  in_progress: {
    title: "On the road",
    line: "The ride has started. Your fare stays with Kipita until the driver ends the trip.",
    nudge: "Safe travels.",
  },
  completed: {
    title: "You made it",
    line: "The fare has gone to your driver. Rate the trip so the next passenger knows what to expect.",
    nudge: "That is one more trip on your record.",
  },
  cancelled: {
    title: "This trip was stopped",
    line: "The seat is released and anything paid is back in your Kipita wallet in full.",
    nudge: "Plenty of other rides run this route.",
  },
  rejected: {
    title: "Not this time",
    line: "The driver could not take this one. Nothing was charged.",
    nudge: "Try another ride on the same route.",
  },
};

const DRIVER: Record<BookingStatus, Copy> = {
  requested: {
    title: "Someone wants a seat",
    line: "Accepting holds the seat for 30 minutes and asks them to pay. Declining tells them straight away.",
    nudge: "Answer quickly and passengers keep choosing you.",
  },
  pending_payment: {
    title: "Waiting on their payment",
    line: "The seat is held for them. If the hold runs out, it goes back on the board automatically.",
    nudge: "No action needed from you.",
  },
  confirmed: {
    title: "Seat paid for",
    line: "The fare is held by Kipita. Start the ride when you pull off, and end it when you arrive.",
    nudge: "Start the ride from your trips page.",
  },
  in_progress: {
    title: "Ride under way",
    line: "End the ride when you arrive and the fare, minus the Kipita fee, is released to you.",
    nudge: "Drive safely.",
  },
  completed: {
    title: "Paid out",
    line: "The fare has been released to you, minus the Kipita fee.",
    nudge: "That is another completed trip on your profile.",
  },
  cancelled: {
    title: "This booking was stopped",
    line: "The seat went back on the board and anything paid was refunded.",
    nudge: "",
  },
  rejected: {
    title: "You declined this",
    line: "The passenger has been told. The seat is still yours to sell.",
    nudge: "",
  },
};

function artFor(status: BookingStatus): ReactNode {
  switch (status) {
    case "requested":
      return <RequestSentArt />;
    case "pending_payment":
      return <SeatHeldArt />;
    case "confirmed":
      return <ConfirmedArt />;
    case "in_progress":
      return <RollingArt />;
    case "completed":
      return <ArrivedArt />;
    default:
      return <StoppedArt />;
  }
}

const swapIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: none; }
`;

const pop = keyframes`
  0%   { transform: scale(0.9); }
  55%  { transform: scale(1.04); }
  100% { transform: scale(1); }
`;

const fly = keyframes`
  from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  to   { opacity: 0; transform: translate3d(var(--dx), var(--dy), 0) scale(0.4); }
`;

const Card = styled.section<{ $burst: boolean }>`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  align-items: center;
  gap: clamp(20px, 3vw, 40px);
  padding: clamp(22px, 3vw, 34px);
  border-radius: 26px;
  background: ${nocturne.surface2};

  ${({ $burst }) =>
    $burst &&
    css`
      animation: ${pop} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
`;

const breathe = keyframes`
  0%, 100% { opacity: 0.25; transform: scale(0.92); }
  50%      { opacity: 0.6; transform: scale(1.06); }
`;

const Art = styled.div<{ $waiting?: boolean }>`
  position: relative;
  justify-self: center;
  width: 100%;

  ${({ $waiting }) =>
    $waiting &&
    css`
      &::before {
        content: "";
        position: absolute;
        inset: 6% 12%;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          color-mix(in oklab, var(--n-accent) 26%, transparent),
          transparent 68%
        );
        animation: ${breathe} 3.6s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        &::before {
          animation: none;
        }
      }
    `}

  > svg {
    position: relative;
    animation: ${swapIn} 0.42s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    > svg {
      animation: none;
    }
  }
  @media (max-width: 760px) {
    order: -1;
    max-width: 260px;
  }
`;

const Head = styled.div`
  min-width: 0;

  h2 {
    margin: 12px 0 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(26px, 3.4vw, 38px);
    font-weight: 800;
    line-height: 1.06;
    letter-spacing: -0.034em;
    color: ${nocturne.cream};
  }
  > p {
    margin: 10px 0 0;
    max-width: 46ch;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Step = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${nocturne.accent};

  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${nocturne.accent};
  }
`;

const fill = keyframes`
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
`;

const sweep = keyframes`
  0%   { transform: translateX(-110%); }
  60%  { transform: translateX(110%); }
  100% { transform: translateX(110%); }
`;

const Meter = styled.ol`
  display: flex;
  gap: 6px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
`;

const Segment = styled.li<{ $on: boolean; $now: boolean; $index: number }>`
  position: relative;
  flex: 1;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in oklab, var(--n-accent) 22%, transparent);

  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    transform-origin: 0 50%;
    background: ${({ $now }) => ($now ? nocturne.ctaBg : nocturne.accent)};
    animation: ${fill} 0.52s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: ${({ $index }) => 120 + $index * 90}ms;
  }

  ${({ $now }) =>
    $now &&
    css`
      &::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(in oklab, var(--n-cream) 70%, transparent),
          transparent
        );
        animation: ${sweep} 2.4s ease-in-out infinite;
        animation-delay: 1s;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    i {
      animation: none;
      transform: none;
    }
    &::after {
      display: none;
    }
  }
`;

const Dots = styled.span`
  display: inline-flex;
  gap: 3px;
  margin-left: 2px;

  i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    animation: ${keyframes`
      0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
      40%           { opacity: 1; transform: translateY(-2px); }
    `} 1.3s ease-in-out infinite;
  }
  i:nth-child(2) {
    animation-delay: 0.16s;
  }
  i:nth-child(3) {
    animation-delay: 0.32s;
  }

  @media (prefers-reduced-motion: reduce) {
    i {
      animation: none;
      opacity: 0.6;
    }
  }
`;

const Since = styled.span`
  margin-left: 10px;
  padding-left: 10px;
  border-left: 1.5px solid ${RULE};
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: ${nocturne.muted};
  font-variant-numeric: tabular-nums;
`;

const Nudge = styled.p`
  margin: 16px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const Acts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;

  &:empty {
    display: none;
  }
`;

const Confetti = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;

  span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    animation: ${fly} 1.1s cubic-bezier(0.1, 0.6, 0.3, 1) forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const Hold = styled.span<{ $urgent: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin-left: 10px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid ${({ $urgent }) => ($urgent ? "transparent" : RULE)};
  background: ${({ $urgent }) => ($urgent ? nocturne.ctaBg : "transparent")};
  color: ${({ $urgent }) => ($urgent ? nocturne.ctaFg : nocturne.cream)};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
  font-variant-numeric: tabular-nums;
`;

const PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return {
    dx: `${Math.cos(angle) * (90 + (i % 4) * 26)}px`,
    dy: `${Math.sin(angle) * (70 + (i % 3) * 22) - 20}px`,
    delay: `${(i % 5) * 40}ms`,
    cta: i % 2 === 0,
  };
});

function sinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;

  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const WAITING: BookingStatus[] = ["requested", "pending_payment"];

export function TripStage({
  status,
  isDriver,
  hold,
  since,
  children,
}: {
  status: BookingStatus;
  isDriver: boolean;
  hold?: string | null;
  since?: string | null;
  children?: ReactNode;
}) {
  const copy = (isDriver ? DRIVER : PASSENGER)[status];
  const index = LADDER.indexOf(status);
  const stopped = index === -1;

  const [burst, setBurst] = useState(false);
  const [ago, setAgo] = useState<string | null>(() => sinceLabel(since));
  const previous = useRef<BookingStatus | null>(null);

  useEffect(() => {
    setAgo(sinceLabel(since));
    const timer = setInterval(() => setAgo(sinceLabel(since)), 15_000);
    return () => clearInterval(timer);
  }, [since, status]);

  useEffect(() => {
    const was = previous.current;
    previous.current = status;
    if (!was || was === status) return;

    const advanced = LADDER.indexOf(status) > LADDER.indexOf(was);
    if (!advanced) return;

    setBurst(true);
    const timer = setTimeout(() => setBurst(false), 1200);
    return () => clearTimeout(timer);
  }, [status]);

  const label = useMemo(() => {
    if (stopped) return status === "rejected" ? "Declined" : "Stopped";
    return `Step ${index + 1} of ${LADDER.length}`;
  }, [index, status, stopped]);

  const urgent = Boolean(
    hold && (/^[0-4]:/.test(hold) || hold.startsWith("The hold")),
  );
  const waiting = WAITING.includes(status);

  return (
    <Card $burst={burst}>
      {burst && (
        <Confetti aria-hidden>
          {PIECES.map((piece, i) => (
            <span
              key={i}
              style={
                {
                  "--dx": piece.dx,
                  "--dy": piece.dy,
                  animationDelay: piece.delay,
                  background: piece.cta ? nocturne.ctaBg : nocturne.accent,
                } as React.CSSProperties
              }
            />
          ))}
        </Confetti>
      )}

      <Head>
        <Step>
          <i aria-hidden />
          {label}
          {waiting && (
            <Dots aria-hidden>
              <i />
              <i />
              <i />
            </Dots>
          )}
          {ago && <Since>{ago}</Since>}
          {hold && status === "pending_payment" && (
            <Hold $urgent={urgent}>{hold}</Hold>
          )}
        </Step>

        <h2 aria-live="polite">{copy.title}</h2>
        <p>{copy.line}</p>

        {!stopped && (
          <Meter aria-hidden>
            {LADDER.map((step, i) =>
              i <= index ? (
                <Segment key={step} $on $now={i === index} $index={i}>
                  <i />
                </Segment>
              ) : (
                <Segment key={step} $on={false} $now={false} $index={i} />
              ),
            )}
          </Meter>
        )}

        {copy.nudge && <Nudge>{copy.nudge}</Nudge>}

        <Acts>{children}</Acts>
      </Head>

      <Art key={status} $waiting={waiting}>
        {artFor(status)}
      </Art>
    </Card>
  );
}
