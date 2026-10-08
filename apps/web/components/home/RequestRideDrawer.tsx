"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { ArrowRight, Check, MapPin, NavigationArrow, Users, Warning } from "@/components/icons";
import { Drawer } from "@/components/ui/Drawer";
import { nocturne } from "@/lib/nocturne";
import { createRideRequestAction } from "@/lib/home/posts";

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Lead = styled.p`
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: ${nocturne.muted};
`;

const Summary = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
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
    text-align: right;
    font-weight: 700;
    color: ${nocturne.cream};
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
    color: ${nocturne.ctaBg};
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }
`;

const DoneBox = styled.div`
  text-align: center;
  padding: 12px 0 4px;

  .tick {
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  h3 {
    margin: 0 0 8px;
    font-size: 22px;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: ${nocturne.muted};
  }
`;

function dayLabel(date: string) {
  if (!date) return "Any day";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Any day";
  return d.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/**
 * A passenger-side request: "nobody is driving this yet, tell drivers I want
 * it". Deliberately not the same thing as publishing a ride.
 */
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
  const [done, setDone] = useState(false);
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
      setDone(true);
    });
  }

  return (
    <Drawer
      open={open}
      onClose={() => {
        setDone(false);
        setError(null);
        onClose();
      }}
      title={done ? "Request posted" : "Request this ride"}
      dismissible={!pending}
      footer={
        done ? undefined : (
          <Primary type="button" onClick={submit} disabled={pending}>
            {pending ? "Posting…" : "Post my request"}
            {!pending && <ArrowRight size={18} aria-hidden />}
          </Primary>
        )
      }
    >
      {done ? (
        <DoneBox>
          <span className="tick" aria-hidden>
            <Check size={28} />
          </span>
          <h3>Drivers can see it now</h3>
          <p>
            We will notify you as soon as a driver offers a seat on {from} to{" "}
            {to}.
          </p>
        </DoneBox>
      ) : (
        <Body>
          <Lead>
            No one has posted this route yet. Put in a request and drivers
            heading that way will see it — you only pay once someone accepts.
          </Lead>

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
            <dt>When</dt>
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
