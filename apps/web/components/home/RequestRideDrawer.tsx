"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Calendar, Check, MapPin, NavigationArrow, Users, Warning } from "@/components/icons";
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

const Summary = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px 16px;
  margin: 0;
  padding: 16px;
  border-radius: 16px;
  background: ${nocturne.bg};
  font-size: 16px;

  dt {
    display: flex;
    align-items: center;
    gap: 9px;
    color: ${nocturne.muted2};
  }
  dt svg {
    color: ${nocturne.accent};
  }
  dd {
    margin: 0;
    min-width: 0;
    text-align: right;
    font-weight: 700;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
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

function dayLabel(date: string) {
  if (!date) return "Any day";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "Any day";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
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
            When a driver offers a seat to {to}, it shows up in your Kipita notifications.
          </p>
        </DoneBox>
      ) : (
        <Body>
          <Lead>Drivers heading that way see your request. You pay only once one accepts.</Lead>

          <Summary>
            <dt>
              <NavigationArrow size={18} aria-hidden />
              From
            </dt>
            <dd>{from || "Anywhere"}</dd>
            <dt>
              <MapPin size={18} aria-hidden />
              To
            </dt>
            <dd>{to}</dd>
            <dt>
              <Users size={18} aria-hidden />
              Seats
            </dt>
            <dd>{seats}</dd>
            <dt>
              <Calendar size={18} aria-hidden />
              When
            </dt>
            <dd>{dayLabel(date)}</dd>
          </Summary>

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
