"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Warning } from "@/components/icons";
import { useAppMode } from "@/components/nav/AppShell";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { nocturne } from "@/lib/nocturne";
import { releaseEscrowForAll } from "@/lib/escrow";
import { cancelTripAction } from "@/lib/trips/booking-actions";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import type { PublishedTrip } from "@/lib/trips/types";
import {
  Act,
  Acts,
  Count,
  Depart,
  Meta,
  Road,
  Row,
  RULE,
  SectionHead,
  SectionLead,
  Tag,
  fs,
} from "./RideRow";

const SHOWN = 4;

const Section = styled.section`
  margin: clamp(40px, 6vh, 64px) 0 0;
`;

const Meter = styled.span`
  display: inline-flex;
  gap: 4px;

  i {
    width: 20px;
    height: 10px;
    border-radius: 3px;
    border: 2px solid var(--row-mark);
  }
  i[data-seat="paid"] {
    background: var(--row-mark);
  }
  i[data-seat="taken"] {
    background: color-mix(in oklab, var(--row-mark) 35%, transparent);
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
  font-size: ${fs.meta};
  font-weight: 800;
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
  font-size: ${fs.meta};
  font-weight: 600;
  color: ${nocturne.cream};

  svg {
    flex: none;
    margin-top: 1px;
    color: ${nocturne.ctaBg};
  }
`;

type Job = "cancel" | "start" | "complete";

function departsAt(t: PublishedTrip) {
  return `${t.departure_date ?? "9999-12-31"}T${t.departure_time ?? "23:59"}`;
}

function seatLine(trip: PublishedTrip) {
  const parts = [`${trip.seats_taken} of ${trip.seats_total} seats booked`];
  if (trip.seats_taken > 0) {
    parts.push(trip.paid_seats >= trip.seats_taken ? "all paid" : `${trip.paid_seats} paid`);
  }
  if (trip.pending_requests > 0) parts.push(`${trip.pending_requests} to answer`);
  return parts.join(" · ");
}

export function PublishedTrips({ initial }: { initial: PublishedTrip[] }) {
  const router = useRouter();
  const { kycStatus, requireKyc } = useAppMode();
  const canVerify = kycStatus === "not_submitted" || kycStatus === "rejected";
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const nextId = useMemo(
    () =>
      items
        .filter((t) => t.status !== "awaiting_approval" && t.status !== "in_progress")
        .sort((a, b) => departsAt(a).localeCompare(departsAt(b)))[0]?.id ?? null,
    [items],
  );

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

    if (!window.confirm(`Start ${trip.from_location} to ${trip.to_location}?${warning}`)) {
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
            ? { ...t, status: "in_progress", pending_requests: 0, awaiting_payment: 0 }
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
      <SectionHead>
        Rides you published <Count>{items.length}</Count>
      </SectionHead>
      <SectionLead>Start each ride when you leave. Ending it pays you.</SectionLead>

      {error && (
        <Err role="alert">
          <Warning size={20} aria-hidden />
          {error}
        </Err>
      )}

      {shown.map((trip) => {
        const running = trip.status === "in_progress";
        const held = trip.status === "awaiting_approval";
        const full = trip.seats_taken >= trip.seats_total;
        const working = busy === trip.id;
        const paid = Math.min(trip.paid_seats, trip.seats_total);
        const taken = Math.min(Math.max(trip.seats_taken, paid), trip.seats_total);
        const seats = Array.from({ length: trip.seats_total }, (_, i) =>
          i < paid ? "paid" : i < taken ? "taken" : "free",
        );

        return (
          <Row
            key={trip.id}
            $mood={running ? "running" : "plain"}
            aria-label={`${trip.from_location} to ${trip.to_location}`}
          >
            <Depart>
              <span>{formatTripDate(trip.departure_date) || "Date to confirm"}</span>
              <b>{formatTripTime(trip.departure_time) || "Time to confirm"}</b>
              {running ? (
                <Tag $tone="live">
                  <i data-pulse aria-hidden />
                  Under way
                </Tag>
              ) : held ? (
                <Tag $tone={canVerify ? "pay" : "wait"}>
                  {canVerify ? "Not live yet" : "ID in review"}
                </Tag>
              ) : full ? (
                <Tag $tone="wait">Full</Tag>
              ) : (
                <Tag $tone="go">Open for booking</Tag>
              )}
            </Depart>

            <div>
              <Road $moving={running || trip.id === nextId}>
                <span>{trip.from_location}</span>
                <i aria-hidden />
                <span>{trip.to_location}</span>
              </Road>
              <Meta>
                <span>
                  <Meter aria-hidden>
                    {seats.map((s, i) => (
                      <i key={i} data-seat={s} />
                    ))}
                  </Meter>
                  {seatLine(trip)}
                </span>
                <span>
                  <b>{formatCurrency(trip.price_per_seat)}</b> a seat
                </span>
              </Meta>
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
                    $quiet
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
                  {held ? (
                    canVerify && (
                      <Act $primary type="button" onClick={() => requireKyc()}>
                        Finish verification
                      </Act>
                    )
                  ) : (
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
                  )}
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
          {expanded ? "Show fewer" : `Show all ${items.length} published rides`}
        </More>
      )}
    </Section>
  );
}
