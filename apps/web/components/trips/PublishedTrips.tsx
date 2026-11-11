"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  NavigationArrow,
  Users,
  Warning,
} from "@/components/icons";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { releaseEscrowForAll } from "@/lib/escrow";
import { cancelTripAction } from "@/lib/trips/booking-actions";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { PublishedTrip } from "@/lib/trips/types";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";
const SHOWN = 4;

const Section = styled.section`
  margin: clamp(26px, 4vh, 38px) 0 clamp(30px, 4.5vh, 46px);
  padding-bottom: clamp(26px, 4vh, 36px);
  border-bottom: 1.5px solid ${RULE};

  section + & {
    margin-top: 0;
  }

  > h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 6px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 800;
    letter-spacing: -0.033em;
    line-height: 1.08;
    color: ${nocturne.cream};
  }
  > p {
    margin: 0 0 20px;
    max-width: 58ch;
    font-size: 16px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border-radius: 999px;
  background: ${nocturne.surface2};
  color: ${nocturne.cream};
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px 32px;
  padding: clamp(18px, 2.4vh, 24px) 0;

  & + & {
    border-top: 1.5px solid ${RULE};
  }

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Route = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(20px, 2.1vw, 25px);
  font-weight: 800;
  letter-spacing: -0.028em;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Running = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 11px;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;

  svg {
    color: inherit;
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 15px;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  b {
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Acts = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 760px) {
    width: 100%;
    > * {
      flex: 1;
    }
  }
`;

const Act = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 20px;
  border: 1.5px solid ${({ $primary }) => ($primary ? "transparent" : RULE)};
  border-radius: 999px;
  background: ${({ $primary }) => ($primary ? nocturne.ctaBg : "transparent")};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 700;
  color: ${({ $primary }) => ($primary ? nocturne.ctaFg : nocturne.cream)};
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    transform 0.16s ease;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ $primary }) =>
        $primary ? nocturne.green : nocturne.surface2};
      color: ${({ $primary }) =>
        $primary ? nocturne.onGreen : nocturne.accent};
      border-color: ${({ $primary }) =>
        $primary ? "transparent" : nocturne.accent};
      transform: translateY(-1px);
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

const More = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 16px;
  padding: 0 2px;
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  color: ${nocturne.muted};
  cursor: pointer;
  box-shadow: inset 0 -2px 0 ${RULE};
  transition:
    color 0.16s ease,
    box-shadow 0.16s ease;

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      box-shadow: inset 0 -2px 0 ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Err = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 600;
  color: ${nocturne.cream};

  svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.ctaBg};
  }
`;

type Job = "cancel" | "start" | "complete";

export function PublishedTrips({ initial }: { initial: PublishedTrip[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, SHOWN);
  const hidden = items.length - shown.length;

  function cancel(trip: PublishedTrip) {
    const taken = trip.seats_taken;
    const message =
      taken > 0
        ? `Cancel ${trip.from_location} to ${trip.to_location}? ${taken} ${
            taken === 1 ? "passenger is" : "passengers are"
          } booked. They are told straight away and anyone who paid is refunded in full.`
        : `Cancel ${trip.from_location} to ${trip.to_location}? It comes off the board and nobody can book it.`;

    if (!window.confirm(message)) return;

    setBusy(trip.id);
    setJob("cancel");
    setError("");
    startTransition(async () => {
      const result = await cancelTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== trip.id));
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  function start(trip: PublishedTrip) {
    const unpaid = trip.awaiting_payment + trip.pending_requests;
    const warning =
      unpaid > 0
        ? ` ${unpaid} unpaid ${unpaid === 1 ? "seat is" : "seats are"} released and those passengers are told.`
        : "";

    if (
      !window.confirm(
        `Start ${trip.from_location} to ${trip.to_location}?${warning}`,
      )
    ) {
      return;
    }

    setBusy(trip.id);
    setJob("start");
    setError("");
    startTransition(async () => {
      const result = await startTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      setItems((prev) =>
        prev.map((t) =>
          t.id === trip.id
            ? {
                ...t,
                status: "in_progress",
                pending_requests: 0,
                awaiting_payment: 0,
              }
            : t,
        ),
      );
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  function complete(trip: PublishedTrip) {
    if (
      !window.confirm(
        `End ${trip.from_location} to ${trip.to_location}? Fares held for this ride are released to you, minus the Kipita fee.`,
      )
    ) {
      return;
    }

    setBusy(trip.id);
    setJob("complete");
    setError("");
    startTransition(async () => {
      const result = await completeTripAction(trip.id);
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        setJob(null);
        return;
      }
      await releaseEscrowForAll(result.bookingIds);
      setItems((prev) => prev.filter((t) => t.id !== trip.id));
      setBusy(null);
      setJob(null);
      router.refresh();
    });
  }

  return (
    <Section>
      <h2>
        Rides you published <Count>{items.length}</Count>
      </h2>
      <p>
        Start a ride when you pull off and end it when you arrive — ending
        releases every held fare to you, minus the Kipita fee. Cancelling during
        the pilot costs you nothing, and refunds anyone who has already paid.
      </p>

      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}

      {shown.map((trip) => {
        const running = trip.status === "in_progress";
        const working = busy === trip.id;

        return (
          <Row key={trip.id}>
            <div>
              <Route>
                <span>{trip.from_location}</span>
                <ArrowRight size={19} aria-hidden />
                <span>{trip.to_location}</span>
                {running && (
                  <Running>
                    <NavigationArrow size={14} weight="fill" aria-hidden />
                    Under way
                  </Running>
                )}
              </Route>
              <Facts>
                <li>
                  <CalendarBlank size={16} />
                  {formatTripDate(trip.departure_date) || "Date to confirm"}
                </li>
                <li>
                  <Clock size={16} />
                  {formatTripTime(trip.departure_time) || "Time to confirm"}
                </li>
                <li>
                  <Users size={16} />
                  {trip.seats_taken} of {trip.seats_total} taken
                </li>
                <li>
                  <b>{trip.paid_seats}</b> paid
                  {trip.awaiting_payment > 0
                    ? `, ${trip.awaiting_payment} awaiting payment`
                    : ""}
                  {trip.pending_requests > 0
                    ? `, ${trip.pending_requests} to answer`
                    : ""}
                </li>
                <li>
                  <b>{formatCurrency(trip.price_per_seat)}</b> a seat
                </li>
              </Facts>
            </div>

            <Acts>
              {running ? (
                <Act
                  $primary
                  type="button"
                  onClick={() => complete(trip)}
                  disabled={working}
                  aria-busy={working}
                >
                  {working && job === "complete" ? (
                    <>
                      <ButtonOrb job="committing" /> Ending…
                    </>
                  ) : (
                    "End ride"
                  )}
                </Act>
              ) : (
                <>
                  <Act
                    type="button"
                    onClick={() => cancel(trip)}
                    disabled={working}
                    aria-busy={working && job === "cancel"}
                  >
                    {working && job === "cancel" ? (
                      <>
                        <ButtonOrb job="committing" /> Cancelling…
                      </>
                    ) : (
                      "Cancel ride"
                    )}
                  </Act>
                  <Act
                    $primary
                    type="button"
                    onClick={() => start(trip)}
                    disabled={working}
                    aria-busy={working && job === "start"}
                  >
                    {working && job === "start" ? (
                      <>
                        <ButtonOrb job="committing" /> Starting…
                      </>
                    ) : (
                      "Start ride"
                    )}
                  </Act>
                </>
              )}
              <Act as={Link} href={`/ride/${trip.id}`}>
                View
              </Act>
            </Acts>
          </Row>
        );
      })}

      {(hidden > 0 || expanded) && (
        <More type="button" onClick={() => setExpanded((on) => !on)}>
          {expanded
            ? `Show fewer`
            : `Show all ${items.length} published rides`}
        </More>
      )}
    </Section>
  );
}
