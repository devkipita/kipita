"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled, { css } from "styled-components";
import {
  ArrowClockwise,
  CalendarBlank,
  SealCheck as BadgeCheck,
  Briefcase,
  CarProfile,
  CheckCircle as CheckCircle2,
  Clock,
  Lightning,
  MapPin,
  Minus,
  MusicNote as Music,
  PawPrint,
  Plus,
  Star,
  Users,
  SpeakerSimpleX as VolumeX,
  Warning,
} from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { EscrowHeldArt } from "@/components/ui/MoneyArt";
import { Collapse } from "@/components/anim/Collapse";
import { Swap } from "@/components/anim/Swap";
import { reserveSeatAction, type BookingResult } from "@/lib/bookings";
import { formatRideDate, formatRideTime, type RideDetail } from "@/lib/ride-detail";
import { formatKes } from "@/lib/rides";
import { bookingBreakdown } from "@/lib/platform";
import type { FareConfig } from "@kipita/shared";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { dur as motionDur } from "@/lib/motion";
import { RollingNumber } from "@/components/ui/Counter";
import type { Profile } from "@/lib/auth/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { VerifyStatusCard } from "@/components/publish/VerifyStatus";
import { GreenHero, HeroTicket } from "@/components/ui/GreenHero";
import { useMorphNavigate } from "@/lib/ui/viewTransition";
import { Band, BookPanel, HeroFrame, Layout, MainCol, RULE, SideCol, Wrap } from "./RideLayout";

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 30px;
  margin: 0;
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

const Person = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;

  > .avatar {
    flex: none;
    box-shadow: 0 0 0 1.5px ${RULE};
  }
  .who {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0 0 9px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(22px, 2.4vw, 29px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.028em;
    overflow-wrap: anywhere;
    color: ${nocturne.cream};
  }

  @media (max-width: 560px) {
    gap: 16px;
  }
`;

const Creds = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 15px;
  color: ${nocturne.muted};
`;

const Verified = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  color: ${({ $on }) => ($on ? nocturne.accent : nocturne.muted)};

  svg {
    flex: none;
  }
`;

const Rating = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 7px;

  b {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  svg {
    color: ${nocturne.star};
  }
`;

const Vehicle = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 14px;

  > svg {
    flex: none;
    align-self: center;
    color: ${nocturne.accent};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(19px, 2vw, 23px);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  span.colour {
    font-size: 16px;
    color: ${nocturne.muted};
  }
`;

const Plate = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 7px;
  background: ${nocturne.surface2};
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: ${nocturne.cream};
`;

const Note = styled.p`
  margin: 16px 0 0;
  max-width: 60ch;
  font-size: 16px;
  line-height: 1.55;
  color: ${nocturne.muted};
`;

const greenPill = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.greenDeep};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const GreenLink = styled(Link)`
  ${greenPill}
`;

const GreenButton = styled.button`
  ${greenPill}
`;

const Fare = styled.p`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(36px, 4vw, 46px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.035em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  small {
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Left = styled.p<{ $scarce: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: -4px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ $scarce }) => ($scarce ? nocturne.danger : nocturne.muted)};

  b {
    font-variant-numeric: tabular-nums;
    color: inherit;
  }
  svg {
    flex: none;
  }
`;

const Split = styled.dl`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px 16px;
  margin: 0;
  padding-top: 14px;
  border-top: 1.5px solid ${RULE};

  dt {
    font-size: 15px;
    color: ${nocturne.muted};
  }
  dd {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: ${nocturne.cream};
  }
  dt.total,
  dd.total {
    font-weight: 800;
    color: ${nocturne.cream};
  }
`;

const Escrow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 4px;

  .art {
    width: 124px;
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 14px;
    line-height: 1.5;
    text-align: center;
    text-wrap: pretty;
    color: ${nocturne.muted};
  }
  b {
    color: ${nocturne.cream};
    font-weight: 700;
  }
`;

const Bar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Outcome = styled.div`
  position: relative;
  padding-top: 12px;
`;

const Seats = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px;
  border-radius: 999px;
  background: ${nocturne.surface};

  button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: none;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${nocturne.cream};
    cursor: pointer;
    transition:
      background-color ${dur.state} ${ease.standard},
      transform ${dur.press} ${ease.standard};
  }
  button:disabled {
    color: ${nocturne.muted2};
    cursor: default;
  }
  @media (hover: hover) {
    button:not(:disabled):hover {
      background: ${nocturne.surface3};
    }
  }
  button:not(:disabled):active {
    transform: scale(0.97);
  }
  button:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -1px;
  }
  b {
    flex: 1;
    text-align: center;
    font-size: 15px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  @media (prefers-reduced-motion: reduce) {
    button:not(:disabled):active {
      transform: none;
    }
  }
`;

const primaryCta = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 10px 24px;
  border: none;
  border-radius: 999px;
  text-align: center;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-variant-numeric: tabular-nums;
  transition:
    color ${dur.state} ${ease.standard} ${dur.press},
    transform ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${nocturne.green};
    clip-path: circle(0% at 50% 50%);
    transition: clip-path ${dur.enter} ${ease.enter};
  }

  @media (hover: hover) {
    &:hover:not(:disabled)::before {
      clip-path: circle(72% at 50% 50%);
    }
    &:hover:not(:disabled) {
      color: ${nocturne.onGreen};
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px
        color-mix(in oklab, var(--n-green) 80%, transparent);
    }
  }
  &:active:not(:disabled)::before {
    clip-path: circle(72% at 50% 50%);
    transition: clip-path ${dur.press} ${ease.standard};
  }
  &:active:not(:disabled) {
    color: ${nocturne.onGreen};
    transform: scale(0.97);
    box-shadow: none;
  }
  &:disabled {
    opacity: 0.72;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
    &:hover:not(:disabled)::before {
      clip-path: circle(100% at 50% 50%);
    }
    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Primary = styled.button`
  ${primaryCta}
`;

const PrimaryLink = styled(Link)`
  ${primaryCta}
`;

const Banner = styled.div<{ $tone: "ok" | "bad" | "info" }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  background: ${({ $tone }) =>
    $tone === "ok" ? nocturne.green : $tone === "bad" ? nocturne.surface : nocturne.surface2};
  color: ${({ $tone }) => ($tone === "ok" ? nocturne.onGreen : nocturne.cream)};

  > svg {
    flex: none;
    margin-top: 2px;
    color: ${({ $tone }) =>
      $tone === "ok"
        ? nocturne.lime
        : $tone === "bad"
          ? nocturne.danger
          : nocturne.accent};
  }
  b {
    display: block;
    font-weight: 800;
    font-size: 16px;
  }
  p {
    margin: 5px 0 0;
    font-size: 14.5px;
    line-height: 1.5;
    color: ${({ $tone }) =>
      $tone === "ok" ? nocturne.onGreenMuted : nocturne.muted};
  }
`;

type NavigationLike = {
  currentEntry?: { index: number } | null;
  entries?: () => { url: string | null }[];
};

function isInAppUrl(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    const url = new URL(href);
    return (
      url.origin === window.location.origin &&
      !url.pathname.startsWith("/auth") &&
      url.pathname !== window.location.pathname
    );
  } catch {
    return false;
  }
}

function hasInAppHistory(): boolean {
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  if (nav?.entries && nav.currentEntry) {
    const previous = nav.entries()[nav.currentEntry.index - 1];
    return isInAppUrl(previous?.url);
  }
  return isInAppUrl(document.referrer);
}

function routeSearch(from: string, to: string, seats?: number): string {
  const params = new URLSearchParams({ from, to });
  if (seats && seats > 1) params.set("seats", String(seats));
  return `/home?${params.toString()}`;
}

function preferenceFacts(prefs: RideDetail["preferences"]) {
  return [
    prefs.luggage && { icon: Briefcase, label: "Luggage fits" },
    prefs.pets && { icon: PawPrint, label: "Pets welcome" },
    prefs.silent_ride && { icon: VolumeX, label: "Quiet ride" },
    prefs.music && { icon: Music, label: "Music on" },
  ].filter(Boolean) as { icon: typeof Briefcase; label: string }[];
}

function seatWord(n: number): string {
  return n === 1 ? "seat" : "seats";
}

export function RideDetailView({
  ride,
  profile,
  fareConfig,
}: {
  ride: RideDetail;
  profile: Profile | null;
  fareConfig: FareConfig | null;
}) {
  const router = useRouter();
  const morphTo = useMorphNavigate();
  const reserveRef = useRef<HTMLButtonElement>(null);
  const isTrip = ride.kind === "trip";
  const person = isTrip ? ride.driver : ride.passenger;
  const maxSeats = isTrip ? Math.max(1, ride.seats_available) : ride.seats_needed;

  const [seats, setSeats] = useState(1);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const date = formatRideDate(isTrip ? ride.departure_date : ride.preferred_date);
  const time = formatRideTime(isTrip ? ride.departure_time : ride.preferred_time);
  const prefs = preferenceFacts(ride.preferences);

  const rawNote = isTrip ? ride.description?.trim() : null;
  const note = rawNote && !/^seed:/i.test(rawNote) ? rawNote : null;
  const rawPlate = isTrip ? ride.vehicle?.plate_number?.trim() : null;
  const plate = rawPlate && !/^PENDING-/i.test(rawPlate) ? rawPlate : null;
  const vehicleName = isTrip && ride.vehicle && (ride.vehicle.make || ride.vehicle.model)
    ? [ride.vehicle.make, ride.vehicle.model, ride.vehicle.year].filter(Boolean).join(" ")
    : null;

  const isOwn = !!profile && !!person && profile.id === person.id;
  const awaiting = isTrip && ride.status === "awaiting_approval";
  const soldOut = isTrip && ride.seats_available < 1;
  const closed = isTrip
    ? !["posted", "active"].includes(ride.status) && !(isOwn && awaiting)
    : ride.status !== "pending";
  const scarce = isTrip && ride.seats_available > 0 && ride.seats_available <= 2;
  const ownerView = isOwn && isTrip && !closed;
  const bookable = isTrip && !closed && !ownerView;
  const breakdown = isTrip && fareConfig ? bookingBreakdown(ride.price_per_seat, seats, fareConfig) : null;
  const searchHref = routeSearch(ride.from_location, ride.to_location, isTrip ? undefined : ride.seats_needed);

  const lead = ownerView
    ? awaiting
      ? "Saved and waiting on your verification. This is how passengers will see it."
      : "This is how passengers see your ride."
    : isTrip
      ? "Check the driver and the car, then request your seat."
      : isOwn
        ? "This is how drivers see your request."
        : "Driving this route? Post your ride and they can request a seat.";

  const backHref = ownerView ? "/trips" : "/home";

  function goBack(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest("a");
    if (!link || link.getAttribute("href") !== backHref) return;
    if (!hasInAppHistory()) return;
    event.preventDefault();
    router.back();
  }

  function changeSeats(next: number) {
    setSeats(next);
    if (result && !result.ok) setOutcomeOpen(false);
  }

  useEffect(() => {
    if (isTrip && !ownerView) router.prefetch("/trips/00000000-0000-4000-8000-000000000000");
  }, [isTrip, ownerView, router]);

  function reserve() {
    if (!isTrip || !breakdown) return;
    startTransition(async () => {
      const booked = await reserveSeatAction(ride.id, seats);
      setResult(booked);
      setOutcomeOpen(true);
      if (booked.ok) {
        morphTo(`/trips/${booked.bookingId}?new=1`, reserveRef.current, "morph-booked");
      }
    });
  }

  return (
    <Wrap $max={1120}>
      <HeroFrame onClickCapture={goBack}>
        <GreenHero
          back={{ href: backHref, label: "Back" }}
          status={
            ownerView
              ? awaiting
                ? "Your ride · waiting on verification"
                : "Your ride · live"
              : closed
                ? "Closed"
                : isTrip
                  ? soldOut
                    ? "Full"
                    : "Taking seat requests"
                  : "Passenger looking for a ride"
          }
          route={{ from: ride.from_location, to: ride.to_location }}
          lead={lead}
          meta={[
            ...(date || time
              ? [{ icon: <CalendarBlank size={20} />, label: [date, time].filter(Boolean).join(" at ") }]
              : []),
            ...(isTrip && ride.pickup_point ? [{ icon: <MapPin size={20} />, label: `Pickup: ${ride.pickup_point}` }] : []),
            ...(isTrip && ride.dropoff_point ? [{ icon: <MapPin size={20} />, label: `Drop-off: ${ride.dropoff_point}` }] : []),
            ...(!isTrip ? [{ icon: <Users size={20} />, label: `${ride.seats_needed} ${seatWord(ride.seats_needed)} needed` }] : []),
          ]}
          aside={
            isTrip && !bookable ? (
              <HeroTicket>
                <small>Per seat</small>
                <b>{formatKes(ride.price_per_seat)}</b>
                <p>
                  <strong>
                    {ride.seats_available} of {ride.seats_total}
                  </strong>{" "}
                  seats left
                </p>
              </HeroTicket>
            ) : undefined
          }
        />
      </HeroFrame>

      <Layout>
        <MainCol>
          {prefs.length > 0 && (
            <Band>
              <Facts>
                {prefs.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <Icon size={19} /> {label}
                  </li>
                ))}
              </Facts>
            </Band>
          )}

          {isTrip && note && <Note>{note}</Note>}

          {person && (
            <Band>
              <Person>
                <Avatar
                  className="avatar"
                  name={person.full_name ?? "Kipita user"}
                  src={person.avatar_url}
                  size={88}
                />
                <div className="who">
                  <h2>
                    {person.full_name?.trim() ||
                      (isTrip ? "Kipita driver" : "Kipita passenger")}
                  </h2>
                  <Creds>
                    <Verified $on={!!person.is_verified}>
                      <BadgeCheck
                        size={18}
                        weight={person.is_verified ? "fill" : "regular"}
                      />
                      {person.is_verified
                        ? isTrip
                          ? "Verified driver"
                          : "Verified"
                        : "Not yet verified"}
                    </Verified>
                    <Rating>
                      <b>
                        <Star size={16} weight="fill" />
                        {Number(person.rating ?? 0) > 0
                          ? Number(person.rating).toFixed(1)
                          : "New"}
                      </b>
                      {person.total_trips
                        ? `${person.total_trips} trip${person.total_trips === 1 ? "" : "s"}`
                        : "no trips yet"}
                    </Rating>
                  </Creds>
                </div>
              </Person>
            </Band>
          )}

          {isTrip && ride.vehicle && vehicleName && (
            <Band>
              <Vehicle>
                <CarProfile size={22} aria-hidden />
                <b>{vehicleName}</b>
                {ride.vehicle.color && (
                  <span className="colour">{ride.vehicle.color}</span>
                )}
                {plate && <Plate>{plate.toUpperCase()}</Plate>}
              </Vehicle>
            </Band>
          )}
        </MainCol>

        <SideCol>
          {ownerView && (
            <>
              <VerifyStatusCard compact context="ride" stage={awaiting ? "pending" : "live"} />
              <GreenLink href="/trips">Manage in your trips</GreenLink>
            </>
          )}

          {bookable && renderBookPanel()}

          {!bookable && !ownerView && renderSideAction()}
        </SideCol>
      </Layout>
    </Wrap>
  );

  function renderBookPanel() {
    if (!isTrip) return null;
    return (
      <BookPanel aria-label="Request a seat">
        <Fare>
          <b>{formatKes(ride.price_per_seat)}</b>
          <small>per seat</small>
        </Fare>
        {!soldOut && (
          <Left $scarce={scarce}>
            {scarce ? (
              <>
                <Lightning size={16} weight="fill" aria-hidden />
                <span>
                  Only <b>{ride.seats_available}</b> {seatWord(ride.seats_available)} left
                </span>
              </>
            ) : (
              <span>
                <b>{ride.seats_available}</b> of {ride.seats_total} seats left
              </span>
            )}
          </Left>
        )}

        {breakdown ? (
          <>
            <div>
              {renderAction(breakdown.total)}
              <Collapse open={outcomeOpen && !!result}>
                <Outcome>
                  <Swap id={result ? (result.ok ? "ok" : `bad:${result.error}`) : "none"}>
                    {result && renderOutcome(result)}
                  </Swap>
                </Outcome>
              </Collapse>
            </div>
            <Split>
              <dt>
                {seats} {seatWord(seats)}
              </dt>
              <dd>{formatKes(breakdown.subtotal)}</dd>
              {breakdown.onTop ? (
                <>
                  <dt>Kipita service fee ({breakdown.feePercent}%)</dt>
                  <dd>{formatKes(breakdown.fee)}</dd>
                  <dt className="total">You pay</dt>
                  <dd className="total">{formatKes(breakdown.total)}</dd>
                  <dt>Your driver receives</dt>
                  <dd>{formatKes(breakdown.driverEarning)}</dd>
                </>
              ) : (
                <>
                  <dt>Goes to your driver</dt>
                  <dd>{formatKes(breakdown.driverEarning)}</dd>
                  <dt>Kipita fee ({breakdown.feePercent}%)</dt>
                  <dd>{formatKes(breakdown.subtotal - breakdown.driverEarning)}</dd>
                  <dt className="total">You pay</dt>
                  <dd className="total">{formatKes(breakdown.total)}</dd>
                </>
              )}
            </Split>
          </>
        ) : (
          <>
            <Banner $tone="bad" role="alert">
              <Warning size={20} />
              <div>
                <b>Couldn&apos;t load Kipita&apos;s fees</b>
                <p>Your total can&apos;t be shown yet, so requests are paused.</p>
              </div>
            </Banner>
            <GreenButton type="button" onClick={() => router.refresh()}>
              <ArrowClockwise size={18} /> Reload your total
            </GreenButton>
          </>
        )}

        <Escrow>
          <span className="art">
            <EscrowHeldArt />
          </span>
          <p>
            <b>Kipita holds your fare.</b> It is only released to the
            driver once the trip is done.
          </p>
        </Escrow>
      </BookPanel>
    );
  }

  function renderOutcome(outcome: BookingResult) {
    if (outcome.ok) {
      return (
        <Banner $tone="ok" role="status">
          <CheckCircle2 size={20} />
          <div>
            <b>
              {outcome.awaitingDriver ? "Request sent" : "Seat held"}
              {outcome.reference ? ` · ${outcome.reference}` : ""}
            </b>
            <p>
              {outcome.seats} {seatWord(outcome.seats)} · {formatKes(outcome.total)}. Opening your trip.
            </p>
          </div>
        </Banner>
      );
    }
    return (
      <Banner $tone="bad" role="alert">
        <Warning size={20} />
        <div>
          <b>Couldn&apos;t send that request</b>
          <p>{outcome.error}</p>
        </div>
      </Banner>
    );
  }

  function renderSideAction() {
    if (closed) {
      return (
        <>
          <Banner $tone="info">
            <Clock size={20} />
            <div>
              <b>{isTrip ? "This ride has closed" : "This request has closed"}</b>
            </div>
          </Banner>
          {isOwn && isTrip ? (
            <GreenLink href="/trips">See your trips</GreenLink>
          ) : (
            <PrimaryLink href={searchHref}>
              Find rides from {ride.from_location} to {ride.to_location}
            </PrimaryLink>
          )}
        </>
      );
    }

    if (isOwn) {
      return (
        <>
          <Banner $tone="info">
            <CheckCircle2 size={20} />
            <div>
              <b>Your request is live</b>
              <p>We&apos;ll tell you when a driver posts this route.</p>
            </div>
          </Banner>
          <PrimaryLink href={searchHref}>
            Find rides from {ride.from_location} to {ride.to_location}
          </PrimaryLink>
        </>
      );
    }

    if (!profile) {
      const next = encodeURIComponent(`/ride/${ride.id}?kind=request`);
      return (
        <PrimaryLink href={`/auth/sign-in?next=${next}`}>
          Sign in to offer a ride
        </PrimaryLink>
      );
    }

    return <PrimaryLink href="/publish">Post a ride on this route</PrimaryLink>;
  }

  function renderAction(total: number) {
    if (!profile) {
      const next = encodeURIComponent(`/ride/${ride.id}`);
      return (
        <Bar>
          <PrimaryLink href={`/auth/sign-in?next=${next}`}>
            Sign in to request a seat
          </PrimaryLink>
        </Bar>
      );
    }

    const done = result?.ok === true;
    const label = `Request ${seats} ${seatWord(seats)}, ${formatKes(total)}`;

    return (
      <Bar>
        <Seats>
          <button
            type="button"
            onClick={() => changeSeats(Math.max(1, seats - 1))}
            disabled={seats <= 1 || pending || done}
            aria-label="Fewer seats"
          >
            <Minus size={16} />
          </button>
          <b aria-live="polite">
            {seats} {seatWord(seats)}
          </b>
          <button
            type="button"
            onClick={() => changeSeats(Math.min(maxSeats, seats + 1))}
            disabled={seats >= maxSeats || pending || done}
            aria-label="More seats"
          >
            <Plus size={16} />
          </button>
        </Seats>
        <Primary
          ref={reserveRef}
          type="button"
          onClick={reserve}
          disabled={pending || soldOut || done}
          aria-busy={pending}
          aria-label={pending || done || soldOut ? undefined : label}
        >
          {pending ? (
            <>
              <ButtonOrb job="committing" /> Sending your request
            </>
          ) : done ? (
            <>
              <ButtonOrb job="committing" /> Opening your trip
            </>
          ) : soldOut ? (
            "Fully booked"
          ) : (
            <>
              <span>
                Request {seats} {seatWord(seats)} · KES
              </span>
              <RollingNumber
                value={total}
                duration={motionDur.long2}
                ariaLabel={formatKes(total)}
              />
            </>
          )}
        </Primary>
      </Bar>
    );
  }
}
