"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import styled, { css, useTheme } from "styled-components";
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Clock,
  MapPin,
  Receipt,
  SealCheck,
  Star,
  Users,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ContentWidth } from "@/components/nav/AppShell";
import { nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { cancelBookingAction } from "@/lib/trips/booking-actions";
import type { Booking } from "@/lib/trips/types";
import { STATUS_ICON, STATUS_LABEL, statusTone } from "./statusTone";
import { TripHelp } from "./TripHelp";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const Page = styled(ContentWidth)`
  padding-block: 18px 64px;
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 960px) {
    padding-bottom: calc(48px + var(--bottom-bar-space, 0px));
  }
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  min-height: 44px;
  padding: 8px 2px;
  font-size: 15px;
  font-weight: 700;
  color: ${nocturne.muted};
  text-decoration: none;
  box-shadow: inset 0 -2px 0 transparent;
  transition:
    color 0.16s ease,
    box-shadow 0.16s ease;

  svg {
    flex: none;
    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.cream};
      box-shadow: inset 0 -2px 0 ${RULE};
    }
    &:hover svg {
      transform: translateX(-3px);
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
    &:hover svg {
      transform: none;
    }
  }
`;

const Status = styled.p<{ $on: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: clamp(14px, 2vh, 22px) 0 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: ${({ $on }) => $on};

  svg {
    flex: none;
  }
`;

const Headline = styled.h1`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 10px 0 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(32px, 5.2vw, 60px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.038em;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 30px;
  margin: clamp(20px, 2.8vh, 28px) 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.cream};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: clamp(28px, 4vw, 60px);
  margin-top: clamp(26px, 3.6vh, 38px);

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
`;

const MainCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Band = styled.div`
  padding-top: clamp(20px, 2.8vh, 28px);
  margin-top: clamp(20px, 2.8vh, 28px);
  border-top: 1.5px solid ${RULE};

  &:first-child {
    padding-top: 0;
    margin-top: 0;
    border-top: none;
  }
`;

const Person = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;

  > .avatar {
    flex: none;
    box-shadow: 0 0 0 1.5px ${RULE};
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 7px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(21px, 2.3vw, 27px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.028em;
    color: ${nocturne.cream};
  }
  h2 svg {
    flex: none;
    color: ${nocturne.accent};
  }
  .meta {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    font-size: 15px;
    color: ${nocturne.muted};
  }
  .meta b {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .meta svg {
    color: ${nocturne.star};
  }
`;

const Reference = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  font-size: 15px;
  color: ${nocturne.muted};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  b {
    padding: 5px 12px;
    border-radius: 7px;
    background: ${nocturne.surface2};
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: ${nocturne.cream};
  }
`;

const SideCol = styled.div`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);

  @media (max-width: 860px) {
    position: static;
    order: -1;
  }
`;

const Money = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(22px, 2.6vw, 28px);
  border-radius: 20px;
  background: ${nocturne.surface2};
`;

const Amount = styled.p`
  margin: 0;

  small {
    display: block;
    margin-bottom: 4px;
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(36px, 4vw, 46px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.035em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
`;

const action = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 0 24px;
  border-radius: 999px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;

  svg {
    flex: none;
    overflow: visible;
  }
  svg .shaft {
    transform-origin: 0% 50%;
    transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  svg .head {
    transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
`;

const Pay = styled(Link)`
  ${action}
  border: none;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  transition:
    color 0.16s ease 0.34s,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.24s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${nocturne.green};
    clip-path: circle(0% at 50% 50%);
    transition: clip-path 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    &:hover::before {
      clip-path: circle(72% at 50% 50%);
    }
    &:hover {
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px
        color-mix(in oklab, var(--n-green) 80%, transparent);
    }
    &:hover svg .shaft {
      transform: scaleX(1.55);
    }
    &:hover svg .head {
      transform: translateX(5px);
    }
  }
  &:active::before {
    clip-path: circle(72% at 50% 50%);
    transition: clip-path 0.24s cubic-bezier(0.3, 0, 0.2, 1);
  }
  &:active {
    color: ${nocturne.onGreen};
    transition-delay: 0s;
    transform: translateY(1px);
    box-shadow: none;
  }
  @media (prefers-reduced-motion: reduce) {
    &::before,
    svg .shaft,
    svg .head {
      transition: none;
    }
    &:hover::before {
      clip-path: circle(100% at 50% 50%);
    }
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const Secondary = styled(Link)`
  ${action}
  min-height: 50px;
  background: transparent;
  color: ${nocturne.cream};
  box-shadow: inset 0 0 0 1.5px ${RULE};
  transition:
    box-shadow 0.16s ease,
    color 0.16s ease,
    background-color 0.16s ease;

  @media (hover: hover) {
    &:hover {
      color: ${nocturne.accent};
      box-shadow: inset 0 0 0 1.5px ${nocturne.accent};
      background: ${nocturne.surface};
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Drop = styled.button`
  ${action}
  min-height: 50px;
  border: none;
  background: transparent;
  color: ${nocturne.muted};
  box-shadow: inset 0 0 0 1.5px transparent;
  transition:
    box-shadow 0.16s ease,
    color 0.16s ease;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      color: ${nocturne.cream};
      box-shadow: inset 0 0 0 1.5px ${RULE};
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

const Note = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${nocturne.muted};
`;

const Helping = styled.div`
  margin-top: clamp(34px, 5vh, 56px);
  padding-top: clamp(26px, 3.4vh, 36px);
  border-top: 1.5px solid ${RULE};
`;

function LongArrow({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.778}
      viewBox="0 0 18 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path className="shaft" d="M2.4 7h6.4" />
      <path className="head" d="M9.6 2.2 14.6 7l-5 4.8" />
    </svg>
  );
}

export function TripDetail({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId: string;
}) {
  const theme = useTheme();
  const tone = statusTone(theme, booking.status);
  const Icon = STATUS_ICON[booking.status];

  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const destination = booking.trip?.to_location ?? "Trip";
  const origin = booking.trip?.from_location ?? "";
  const finished = booking.status === "completed" || booking.status === "cancelled";
  const due = booking.status === "pending_payment";

  const date = formatTripDate(booking.trip?.departure_date ?? null);
  const time = formatTripTime(booking.trip?.departure_time ?? null);
  const rating = person?.rating ? person.rating.toFixed(1) : null;

  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const paid = booking.status === "confirmed";
  const canCancel =
    booking.status === "requested" ||
    booking.status === "pending_payment" ||
    paid;

  function cancel() {
    const message = paid
      ? `Cancel this trip? ${formatCurrency(booking.total_price)} goes back to your Kipita wallet in full.`
      : "Cancel this request? The seat is released straight away.";
    if (!window.confirm(message)) return;

    setBusy(true);
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id);
      if (!result.ok) window.alert(result.error);
      setBusy(false);
    });
  }

  return (
    <Page $max={1060}>
      <Back href="/trips">
        <ArrowLeft size={17} /> All trips
      </Back>

      <Status $on={tone.bg}>
        <Icon size={17} weight="fill" />
        {STATUS_LABEL[booking.status]}
      </Status>

      <Headline>
        {origin && (
          <>
            <span>{origin}</span>
            <ArrowRight size={34} aria-hidden />
          </>
        )}
        <span>{destination}</span>
      </Headline>

      <Facts>
        <li>
          <CalendarBlank size={19} />
          {date || "Date to confirm"}
        </li>
        <li>
          <Clock size={19} />
          {time || "Time to confirm"}
        </li>
        <li>
          <Users size={19} />
          {booking.seats_booked} {booking.seats_booked === 1 ? "seat" : "seats"}
        </li>
      </Facts>

      <Layout>
        <MainCol>
          <Band>
            <Person>
              <Avatar
                className="avatar"
                name={person?.full_name || "Kipita user"}
                src={person?.avatar_url}
                size={76}
              />
              <div className="who">
                <h2>
                  {person?.full_name || "Kipita user"}
                  {person?.is_verified && (
                    <SealCheck
                      size={19}
                      weight="fill"
                      aria-label="Verified"
                    />
                  )}
                </h2>
                <span className="meta">
                  {rating ? (
                    <>
                      <b>
                        <Star size={16} weight="fill" />
                        {rating}
                      </b>
                      {person?.total_trips
                        ? `${person.total_trips} trips`
                        : "rating"}
                    </>
                  ) : (
                    "New to Kipita"
                  )}
                </span>
              </div>
            </Person>
          </Band>

          {booking.booking_reference && (
            <Band>
              <Reference>
                <Receipt size={19} />
                Reference
                <b>{booking.booking_reference}</b>
              </Reference>
            </Band>
          )}
        </MainCol>

        <SideCol>
          <Money>
            <Amount>
              <small>{due ? "Due now" : "Total paid"}</small>
              <b>{formatCurrency(booking.total_price)}</b>
            </Amount>
            <Actions>
              {due && (
                <Pay href={`/ride/${booking.trip_id}`}>
                  Pay this fare <LongArrow size={28} />
                </Pay>
              )}
              {booking.status === "completed" && (
                <Secondary href={`/ride/${booking.trip_id}`}>
                  <Star size={17} weight="fill" /> Rate this trip
                </Secondary>
              )}
              {!finished && (
                <Secondary href={`/ride/${booking.trip_id}`}>
                  <MapPin size={17} /> View the ride
                </Secondary>
              )}
              {canCancel && !isDriver && (
                <Drop
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? "Cancelling…" : "Cancel this trip"}
                </Drop>
              )}
            </Actions>
            {canCancel && !isDriver && (
              <Note>
                {paid
                  ? "Cancelling is free during the pilot. The full fare returns to your wallet."
                  : "Cancelling is free. Nothing has been charged yet."}
              </Note>
            )}
          </Money>
        </SideCol>
      </Layout>

      <Helping>
        <TripHelp booking={booking} />
      </Helping>
    </Page>
  );
}
