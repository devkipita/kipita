"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Calendar, Check, Users, Warning } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { createRideRequestAction } from "@/lib/home/posts";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const Body = styled(DrawerBody)`
  gap: 14px;
`;

const Lead = styled.p`
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: ${nocturne.muted};
`;

/* The request as a trip: a line from where you start to where you are going, then seats and day. */
const Card = styled.div`
  border-radius: 18px;
  background: ${nocturne.surface2};
  border: 1px solid ${nocturne.line2};
  overflow: hidden;
`;

const Route = styled.dl`
  margin: 0;
  padding: 18px 18px 16px;

  .stop {
    position: relative;
    padding-left: 30px;
  }
  .stop + .stop {
    margin-top: 18px;
  }
  .stop::before {
    content: "";
    position: absolute;
    left: 0;
    top: 1px;
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
  .start::before {
    border: 3px solid ${nocturne.accent};
    background: ${nocturne.surface};
  }
  .end::before {
    background: ${nocturne.accent};
    box-shadow: 0 0 0 4px color-mix(in oklab, ${nocturne.accent} 22%, transparent);
  }
  .start::after {
    content: "";
    position: absolute;
    left: 6px;
    top: 20px;
    bottom: -14px;
    width: 2px;
    background: repeating-linear-gradient(
      to bottom,
      ${nocturne.outline} 0 4px,
      transparent 4px 8px
    );
  }

  dt {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 1.2;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
  dd {
    margin: 3px 0 0;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.25;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 14px 18px 16px;
  list-style: none;
  border-top: 1px solid ${nocturne.line2};

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px 8px 12px;
    border-radius: 999px;
    border: 1px solid ${nocturne.line};
    background: ${nocturne.surface};
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  li svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Err = styled.p`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${nocturne.surface2};
  color: ${nocturne.cream};
  font-size: 15px;

  svg {
    flex: none;
    color: ${nocturne.danger};
  }
`;


const action = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Primary = styled.button`
  ${action}
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

const SeeRequest = styled(Link)`
  ${action}
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
`;

const DoneBox = styled(DrawerBody)`
  align-items: center;
  gap: 0;
  text-align: center;

  .tick {
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
  }
  h3 {
    margin: 0 0 8px;
    font-size: 22px;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
  }
`;

function seatsLabel(seats: number) {
  return `${seats} ${seats === 1 ? "seat" : "seats"}`;
}

function dayLabel(date: string) {
  if (!date) return "Any day";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "Any day";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function RequestRideDrawer({
  open,
  from,
  to,
  date,
  seats,
  onClose,
}: {
  open: boolean;
  from: string;
  to: string;
  date: string;
  seats: number;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [postedId, setPostedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createRideRequestAction({
        from_location: from.trim(),
        to_location: to.trim(),
        preferred_date: date || null,
        preferred_time: null,
        seats_needed: seats,
        preferences: {
          luggage: false,
          pets: false,
          silent_ride: false,
          music: false,
          no_smoking: false,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPostedId(result.id);
    });
  }

  const done = postedId !== null;

  return (
    <Drawer
      open={open}
      onClose={() => {
        setPostedId(null);
        setError(null);
        onClose();
      }}
      title={done ? "Request posted" : "Ask drivers for this route"}
      dismissible={!pending}
      footer={
        <DrawerFooter>
          {done ? (
            <SeeRequest href={`/ride/${postedId}?kind=request`}>
              See your request <ArrowRight size={18} aria-hidden />
            </SeeRequest>
          ) : (
            <Primary type="button" onClick={submit} disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <ButtonOrb job="committing" /> Posting request…
                </>
              ) : (
                <>
                  Post my request <ArrowRight size={18} aria-hidden />
                </>
              )}
            </Primary>
          )}
        </DrawerFooter>
      }
    >
      {done ? (
        <DoneBox>
          <span className="tick" aria-hidden>
            <Check size={28} />
          </span>
          <h3>Drivers can see it now</h3>
          <p>
            We'll notify you when a driver offers a seat to {to}.
          </p>
        </DoneBox>
      ) : (
        <Body>
          <Lead>Drivers see your request. You pay only after one accepts.</Lead>

          <Card>
            <Route>
              <div className="stop start">
                <dt>From</dt>
                <dd>{from || "Anywhere"}</dd>
              </div>
              <div className="stop end">
                <dt>To</dt>
                <dd>{to}</dd>
              </div>
            </Route>
            <Facts>
              <li>
                <Users size={16} aria-hidden />
                {seatsLabel(seats)}
              </li>
              <li>
                <Calendar size={16} aria-hidden />
                {dayLabel(date)}
              </li>
            </Facts>
          </Card>

          {error && (
            <Err role="alert">
              <Warning size={18} aria-hidden />
              {error}
            </Err>
          )}
        </Body>
      )}
    </Drawer>
  );
}
