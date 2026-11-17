"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import styled from "styled-components";
import { Clock } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { cancelBookingAction } from "@/lib/trips/booking-actions";
import type { Booking } from "@/lib/trips/types";
import { Act, Acts, Depart, Meta, Road, Row, RowError, Tag, type TagTone } from "./RideRow";
import { STATUS_LABEL } from "./statusTone";

const TONE: Record<Booking["status"], TagTone> = {
  requested: "wait",
  pending_payment: "pay",
  confirmed: "go",
  in_progress: "live",
  completed: "done",
  cancelled: "off",
  rejected: "off",
};

const SHORT: Partial<Record<Booking["status"], string>> = {
  requested: "Requested",
};

const HINT:Partial<Record<Booking["status"], string>> = {
  requested: "The driver accepts or declines your request.",
  pending_payment: "Pay to keep your seat.",
  confirmed: "Paid. Your seat is held.",
};

const Expiry = styled.span<{ $soon: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ $soon }) => ($soon ? nocturne.danger : "var(--row-ink)")};
`;

function useCountdown(iso: string | null): string | null {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (!Number.isFinite(ms) || ms <= 0) {
        setLeft(null);
        return;
      }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setLeft(`${mins}:${String(secs).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  return left;
}

export function BookingCard({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId: string;
}) {
  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const name = person?.full_name || "Kipita user";
  const destination = booking.trip?.to_location ?? "Trip";
  const origin = booking.trip?.from_location ?? "";
  const live = booking.status === "in_progress";
  const hint = HINT[booking.status];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const left = useCountdown(booking.expires_at);
  const soon = left !== null && left.startsWith("0:");

  const canPay = !isDriver && booking.status === "pending_payment";
  const canCancel =
    !isDriver &&
    (booking.status === "requested" ||
      booking.status === "pending_payment" ||
      booking.status === "confirmed");

  function cancel() {
    const paid = booking.status === "confirmed";
    const msg = paid
      ? `Cancel this trip? ${formatCurrency(booking.total_price)} goes back to your Kipita wallet in full.`
      : "Cancel this request? The seat is released straight away.";
    if (!window.confirm(msg)) return;

    setBusy(true);
    setError("");
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id);
      if (!result.ok) setError(result.error ?? "We couldn't cancel that. Try again.");
      setBusy(false);
    });
  }

  return (
    <Row $mood={live ? "running" : "plain"} aria-label={`${origin} to ${destination}`}>
      <Depart>
        <span>{formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm"}</span>
        <b>{formatTripTime(booking.trip?.departure_time ?? null) || "Time to confirm"}</b>
        <Tag $tone={TONE[booking.status]}>
          {live && <i data-pulse aria-hidden />}
          {SHORT[booking.status] ?? STATUS_LABEL[booking.status]}
        </Tag>
      </Depart>

      <div>
        <Road $moving={live}>
          {origin && (
            <>
              <span>{origin}</span>
              <i aria-hidden />
            </>
          )}
          <span>{destination}</span>
        </Road>
        <Meta>
          <span>
            <Avatar name={name} src={person?.avatar_url} size={28} />
            {name}
          </span>
          <span>
            <b>{formatCurrency(booking.total_price)}</b>
            {booking.seats_booked} {booking.seats_booked === 1 ? "seat" : "seats"}
          </span>
          {canPay && left ? (
            <Expiry $soon={soon}>
              <Clock size={16} aria-hidden />
              {soon ? `Seat released in ${left}` : `Pay within ${left}`}
            </Expiry>
          ) : (
            hint && <span>{hint}</span>
          )}
        </Meta>
      </div>

      <Acts>
        {canCancel && (
          <Act $quiet type="button" onClick={cancel} disabled={busy} aria-busy={busy}>
            {busy ? "Cancelling…" : "Cancel"}
          </Act>
        )}
        {canPay && (
          <Act as={Link} $primary href={`/ride/${booking.trip_id}?booking=${booking.id}`}>
            Pay {formatCurrency(booking.total_price)}
          </Act>
        )}
        <Act as={Link} href={`/trips/${booking.id}`}>
          View
        </Act>
      </Acts>

      {error && <RowError role="alert">{error}</RowError>}
    </Row>
  );
}
