"use client";

import styled, { css, keyframes } from "styled-components";
import {
  CheckCircle,
  Checks,
  Clock,
  NavigationArrow,
  Wallet,
  XCircle,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import type { BookingStatus } from "@/lib/trips/types";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

type Step = {
  key: string;
  icon: KipitaIcon;
  title: string;
  passenger: string;
  driver: string;
};

const STEPS: Step[] = [
  {
    key: "requested",
    icon: Clock,
    title: "Request sent",
    passenger: "The driver has to accept before anything is charged.",
    driver: "This passenger is waiting on your answer.",
  },
  {
    key: "pending_payment",
    icon: Wallet,
    title: "Seat held",
    passenger: "Pay with M-Pesa to confirm the seat before the hold runs out.",
    driver: "Accepted. The seat is held until they pay.",
  },
  {
    key: "confirmed",
    icon: CheckCircle,
    title: "Paid and confirmed",
    passenger: "Kipita holds your fare until you arrive.",
    driver: "Paid. The fare is held in escrow until you end the ride.",
  },
  {
    key: "in_progress",
    icon: NavigationArrow,
    title: "On the road",
    passenger: "The ride has started. Safe travels.",
    driver: "Under way. End the ride when you arrive.",
  },
  {
    key: "completed",
    icon: Checks,
    title: "Arrived",
    passenger: "The fare has gone to your driver. Rate the trip.",
    driver: "Done. The fare, minus the Kipita fee, is yours.",
  },
];

const ORDER: Record<BookingStatus, number> = {
  requested: 0,
  pending_payment: 1,
  confirmed: 2,
  in_progress: 3,
  completed: 4,
  cancelled: -1,
  rejected: -1,
};

const draw = keyframes`
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
`;

const travel = keyframes`
  0%   { top: 36px; opacity: 0; }
  12%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { top: calc(100% - 6px); opacity: 0; }
`;

const ring = keyframes`
  0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--n-cta-bg) 55%, transparent); }
  70%  { box-shadow: 0 0 0 12px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
`;

const List = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`;

const Item = styled.li<{
  $state: "done" | "now" | "todo" | "stopped";
  $index: number;
}>`
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: start;
  gap: 2px 16px;
  padding: 0 0 clamp(18px, 2.4vh, 26px);
  animation: ${rise} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: ${({ $index }) => 60 + $index * 70}ms;

  &:last-child {
    padding-bottom: 0;
  }

  &::before {
    content: "";
    position: absolute;
    top: 34px;
    bottom: 0;
    left: 16.5px;
    width: 1.5px;
    transform-origin: 50% 0;
    background: ${({ $state }) =>
      $state === "done" ? nocturne.accent : RULE};
    animation: ${draw} 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: ${({ $index }) => 180 + $index * 70}ms;
  }
  &:last-child::before {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &::before {
      animation: none;
      transform: none;
    }
  }

  .mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1.5px solid ${RULE};
    background: ${nocturne.bg};
    color: ${nocturne.muted};
  }

  h3 {
    margin: 5px 0 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.022em;
    color: ${nocturne.muted};
  }
  p {
    grid-column: 2;
    margin: 6px 0 0;
    max-width: 52ch;
    font-size: 15px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }

  ${({ $state }) =>
    $state === "done" &&
    css`
      .mark {
        border-color: transparent;
        background: ${nocturne.surface2};
        color: ${nocturne.accent};
      }
      h3 {
        color: ${nocturne.cream};
      }
    `}

  ${({ $state }) =>
    $state === "now" &&
    css`
      .mark {
        border-color: transparent;
        background: ${nocturne.ctaBg};
        color: ${nocturne.ctaFg};
        animation: ${ring} 2.6s ease-out infinite;
        animation-delay: 1.1s;
      }
      h3 {
        color: ${nocturne.cream};
      }
      p {
        color: ${nocturne.cream};
      }

      @media (prefers-reduced-motion: reduce) {
        .mark {
          animation: none;
        }
      }
    `}

  ${({ $state }) =>
    $state === "stopped" &&
    css`
      .mark {
        border-color: transparent;
        background: ${nocturne.surface2};
        color: ${nocturne.cream};
      }
      h3 {
        color: ${nocturne.cream};
      }
      p {
        color: ${nocturne.cream};
      }
    `}
`;

const Spark = styled.i`
  position: absolute;
  left: 13px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${nocturne.ctaBg};
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--n-cta-bg) 24%, transparent);
  animation: ${travel} 2.6s cubic-bezier(0.4, 0, 0.3, 1) infinite;
  animation-delay: 1.2s;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

export function RideProgress({
  status,
  isDriver,
  stoppedNote,
}: {
  status: BookingStatus;
  isDriver: boolean;
  stoppedNote?: string | null;
}) {
  const stopped = status === "cancelled" || status === "rejected";
  const reached = ORDER[status];

  return (
    <List aria-label="Trip progress">
      {STEPS.map((step, index) => {
        const done = !stopped && index < reached;
        const now = !stopped && index === reached;
        const state = done ? "done" : now ? "now" : "todo";
        const Icon = step.icon;

        return (
          <Item
            key={step.key}
            $state={state}
            $index={index}
            aria-current={now ? "step" : undefined}
          >
            {done && index === reached - 1 && <Spark aria-hidden />}
            <span className="mark">
              <Icon size={18} weight={done || now ? "fill" : "regular"} />
            </span>
            <h3>{step.title}</h3>
            {(now || (stopped && index === 0)) && (
              <p>{isDriver ? step.driver : step.passenger}</p>
            )}
          </Item>
        );
      })}

      {stopped && (
        <Item $state="stopped" $index={STEPS.length}>
          <span className="mark">
            <XCircle size={18} weight="fill" />
          </span>
          <h3>{status === "rejected" ? "Declined" : "Cancelled"}</h3>
          <p>
            {stoppedNote ||
              (status === "rejected"
                ? "The driver could not take this one. Nothing was charged."
                : "This booking was stopped. Anything paid goes back to the wallet in full.")}
          </p>
        </Item>
      )}
    </List>
  );
}
