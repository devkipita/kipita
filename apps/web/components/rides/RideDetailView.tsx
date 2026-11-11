"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { ArrowLeft, SealCheck as BadgeCheck, Briefcase, CarProfile, CheckCircle as CheckCircle2, MapPin, Minus, MusicNote as Music, PawPrint, Phone, Plus, DeviceMobile as Smartphone, Star, Users, SpeakerSimpleX as VolumeX } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { EscrowHeldArt } from "@/components/ui/MoneyArt";
import { reserveSeatAction, type BookingResult } from "@/lib/bookings";
import { formatRideDate, formatRideTime, type RideDetail } from "@/lib/ride-detail";
import { safeTelHref } from "@/lib/security/url";
import { formatKes } from "@/lib/rides";
import { fareBreakdown } from "@/lib/platform";
import { nocturne } from "@/lib/nocturne";
import { RollingNumber } from "@/components/ui/Counter";
import type { Profile } from "@/lib/auth/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const RULE = "color-mix(in oklab, var(--n-accent) 58%, transparent)";

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Wrap = styled(ContentWidth)`
  padding-block: 18px 56px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${nocturne.bg};

  ::selection {
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 960px) {
    padding-bottom: calc(44px + var(--bottom-bar-space, 0px));
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

const PageHead = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: clamp(26px, 4vh, 40px);

  h1 {
    margin: 0;
    max-width: 18ch;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(32px, 5vw, 56px);
    font-weight: 800;
    line-height: 1.04;
    letter-spacing: -0.035em;
    color: ${nocturne.cream};
    text-wrap: balance;
  }
  p {
    margin: 0;
    max-width: 48ch;
    font-size: 17px;
    line-height: 1.55;
    color: ${nocturne.muted};
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 352px;
  align-items: start;
  gap: clamp(28px, 4vw, 64px);

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 34px;
  }
`;

const MainCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const SideCol = styled.div`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 20px);
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 960px) {
    position: static;
    order: -1;
  }
`;

const Route = styled.div`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 0 18px;
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.44em;

  .node {
    width: 17px;
    height: 17px;
    flex: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 5px ${nocturne.accent};
  }
  .line {
    flex: 1;
    width: 2.5px;
    min-height: 24px;
    margin: 8px 0;
    border-radius: 2px;
    background: ${nocturne.accent};
    opacity: 0.4;
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Stops = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 2.4vh, 26px);
  min-width: 0;

  b {
    display: block;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(25px, 3.1vw, 38px);
    font-weight: 800;
    line-height: 1.04;
    letter-spacing: -0.032em;
    color: ${nocturne.cream};
  }
  span.point {
    display: block;
    margin-top: 7px;
    font-size: 15px;
    line-height: 1.45;
    color: ${nocturne.muted};
  }
`;

const When = styled.p`
  margin: clamp(22px, 3vh, 30px) 0 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(19px, 2.1vw, 25px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${nocturne.cream};

  em {
    font-style: normal;
    font-weight: 500;
    color: ${nocturne.muted};
  }
`;

const Band = styled.div`
  margin-top: clamp(24px, 3.2vh, 34px);
  padding-top: clamp(22px, 3vh, 30px);
  border-top: 1.5px solid ${RULE};
`;

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

const PhoneRow = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin-top: 14px;
  font-size: 16px;
  font-weight: 700;
  color: ${nocturne.cream};
  text-decoration: none;
  box-shadow: inset 0 -2px 0 ${RULE};
  transition:
    box-shadow 0.16s ease,
    color 0.16s ease;

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
  @media (hover: hover) {
    &:hover {
      color: ${nocturne.accent};
      box-shadow: inset 0 -3px 0 ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
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

const BookPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(22px, 2.6vw, 28px);
  border-radius: 20px;
  background: ${nocturne.surface2};
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
  margin: -4px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ $scarce }) => ($scarce ? nocturne.ctaBg : nocturne.muted)};

  b {
    font-variant-numeric: tabular-nums;
    color: inherit;
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
  .total dt,
  .total dd {
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
    width: 42px;
    height: 42px;
    flex: none;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${nocturne.cream};
    cursor: pointer;
    transition:
      background-color 0.16s ease,
      transform 0.12s ease;
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
    transform: scale(0.92);
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
  padding: 0 24px;
  border: none;
  border-radius: 999px;
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
    transition: clip-path 0.24s cubic-bezier(0.3, 0, 0.2, 1);
  }
  &:active:not(:disabled) {
    color: ${nocturne.onGreen};
    transform: translateY(1px);
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
    $tone === "ok" ? nocturne.green : nocturne.surface2};
  color: ${({ $tone }) => ($tone === "ok" ? nocturne.onGreen : nocturne.cream)};
  animation: ${rise} 0.24s ease-out;

  > svg {
    flex: none;
    margin-top: 2px;
    color: ${({ $tone }) =>
      $tone === "ok"
        ? nocturne.lime
        : $tone === "bad"
          ? nocturne.ctaBg
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

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

function preferenceFacts(prefs: RideDetail["preferences"]) {
  return [
    prefs.luggage && { icon: Briefcase, label: "Luggage fits" },
    prefs.pets && { icon: PawPrint, label: "Pets welcome" },
    prefs.silent_ride && { icon: VolumeX, label: "Quiet ride" },
    prefs.music && { icon: Music, label: "Music on" },
  ].filter(Boolean) as { icon: typeof Briefcase; label: string }[];
}

export function RideDetailView({
  ride,
  profile,
  feePercent = 12,
}: {
  ride: RideDetail;
  profile: Profile | null;
  feePercent?: number;
}) {
  const router = useRouter();
  const isTrip = ride.kind === "trip";
  const person = isTrip ? ride.driver : ride.passenger;
  const maxSeats = isTrip ? Math.max(1, ride.seats_available) : ride.seats_needed;

  const [seats, setSeats] = useState(1);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pending, startTransition] = useTransition();

  const date = formatRideDate(isTrip ? ride.departure_date : ride.preferred_date);
  const time = formatRideTime(isTrip ? ride.departure_time : ride.preferred_time);
  const prefs = preferenceFacts(ride.preferences);

  const rawNote = isTrip ? ride.description?.trim() : null;
  const note = rawNote && !/^seed:/i.test(rawNote) ? rawNote : null;
  const rawPlate = isTrip ? ride.vehicle?.plate_number?.trim() : null;
  const plate = rawPlate && !/^PENDING-/i.test(rawPlate) ? rawPlate : null;

  const lead = isTrip
    ? "Check the driver and the car, then reserve your seat. You only pay once you're happy."
    : "If you're driving this route, you can offer them a seat.";
  const isOwn = !!profile && !!person && profile.id === person.id;
  const soldOut = isTrip && ride.seats_available < 1;
  const closed = isTrip
    ? !["posted", "active"].includes(ride.status)
    : ride.status !== "pending";
  const scarce = isTrip && ride.seats_available > 0 && ride.seats_available <= 2;

  const back = profile
    ? { href: "/notifications", label: "Notifications" }
    : { href: "/home", label: "Find a ride" };

  function reserve() {
    if (!isTrip) return;
    startTransition(async () => {
      const booked = await reserveSeatAction(ride.id, seats);
      setResult(booked);
      if (!booked.ok) return;

      router.push(`/trips/${booked.bookingId}?new=1`);
    });
  }

  return (
    <>
      <Wrap $max={1120}>
        <Back href={back.href}>
          <ArrowLeft size={17} /> {back.label}
        </Back>

        <PageHead>
          <h1>
            {isTrip
              ? `Get your ride to ${ride.to_location}`
              : `Offer a ride to ${ride.to_location}`}
          </h1>
          <p>{lead}</p>
        </PageHead>

        <Layout>
          <MainCol>
            <Route>
              <Rail>
                <span className="node" />
                <span className="line" />
                <MapPin size={19} weight="fill" />
              </Rail>
              <Stops>
                <div>
                  <b>{ride.from_location}</b>
                  {isTrip && ride.pickup_point && (
                    <span className="point">Pickup: {ride.pickup_point}</span>
                  )}
                </div>
                <div>
                  <b>{ride.to_location}</b>
                  {isTrip && ride.dropoff_point && (
                    <span className="point">
                      Drop-off: {ride.dropoff_point}
                    </span>
                  )}
                </div>
              </Stops>
            </Route>

            {(date || time) && (
              <When>
                {date}
                {date && time ? <em> at </em> : null}
                {time}
              </When>
            )}

            {(prefs.length > 0 || (!isTrip && ride.seats_needed > 0)) && (
              <Band>
                <Facts>
                  {!isTrip && (
                    <li>
                      <Users size={19} />
                      {ride.seats_needed} seat
                      {ride.seats_needed === 1 ? "" : "s"} needed
                    </li>
                  )}
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
                          ? "Verified driver"
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
                {safeTelHref(person.phone) && (
                  <PhoneRow href={safeTelHref(person.phone) as string}>
                    <Phone size={18} />
                    {person.phone}
                  </PhoneRow>
                )}
              </Band>
            )}

            {isTrip && ride.vehicle && (
              <Band>
                <Vehicle>
                  <CarProfile size={22} aria-hidden />
                  <b>
                    {[ride.vehicle.make, ride.vehicle.model, ride.vehicle.year]
                      .filter(Boolean)
                      .join(" ")}
                  </b>
                  {ride.vehicle.color && (
                    <span className="colour">{ride.vehicle.color}</span>
                  )}
                  {plate && <Plate>{plate.toUpperCase()}</Plate>}
                </Vehicle>
              </Band>
            )}
          </MainCol>

          <SideCol>
            {isTrip && !closed && (
              <BookPanel>
                <Fare>
                  <b>{formatKes(ride.price_per_seat)}</b>
                  <small>per seat</small>
                </Fare>
                <Left $scarce={scarce}>
                  <b>{ride.seats_available}</b> of {ride.seats_total} seats left
                </Left>
                {renderAction()}
                {(() => {
                  const total = ride.price_per_seat * seats;
                  const { fee, driverEarning } = fareBreakdown(total, feePercent);
                  return (
                    <Split>
                      <dt>
                        {seats} {seats === 1 ? "seat" : "seats"} at{" "}
                        {formatKes(ride.price_per_seat)}
                      </dt>
                      <dd>{formatKes(total)}</dd>
                      <dt>Goes to your driver</dt>
                      <dd>{formatKes(driverEarning)}</dd>
                      <dt>Kipita fee ({feePercent}%)</dt>
                      <dd>{formatKes(fee)}</dd>
                      <dt className="total">You pay</dt>
                      <dd className="total">{formatKes(total)}</dd>
                    </Split>
                  );
                })()}
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
            )}

            {result?.ok && (
              <Banner $tone="ok">
                <CheckCircle2 size={20} />
                <div>
                  <b>
                    {result.awaitingDriver ? "Request sent" : "Seat held"}
                    {result.reference ? ` · ${result.reference}` : ""}
                  </b>
                  <p>
                    {result.seats} seat{result.seats === 1 ? "" : "s"} ·{" "}
                    {formatKes(result.total)}. Taking you to your trip, where
                    you can watch every step.
                  </p>
                </div>
              </Banner>
            )}

            {result && !result.ok && (
              <Banner $tone="bad">
                <Smartphone size={20} />
                <div>
                  <b>Couldn&apos;t send that request</b>
                  <p>{result.error}</p>
                </div>
              </Banner>
            )}

            {(!isTrip || closed) && renderAction()}
          </SideCol>
        </Layout>
      </Wrap>

    </>
  );

  function renderAction() {
    if (closed) {
      return (
        <Banner $tone="info">
          <Smartphone size={20} />
          <div>
            <b>{isTrip ? "This ride has closed" : "This request has closed"}</b>
            <p>Browse what&apos;s running now from your notifications.</p>
          </div>
        </Banner>
      );
    }

    if (isOwn) {
      return (
        <Banner $tone="info">
          <CheckCircle2 size={20} />
          <div>
            <b>This is your own post</b>
            <p>Manage it from the Kipita app.</p>
          </div>
        </Banner>
      );
    }

    if (!profile) {
      const next = encodeURIComponent(
        `/ride/${ride.id}${isTrip ? "" : "?kind=request"}`,
      );
      return (
        <Bar>
          <PrimaryLink href={`/auth/sign-in?next=${next}`}>
            Sign in to {isTrip ? "request a seat" : "respond"}
          </PrimaryLink>
        </Bar>
      );
    }

    if (!isTrip) {
      return (
        <Banner $tone="info">
          <Smartphone size={20} />
          <div>
            <b>Respond in the app</b>
            <p>
              Offering this passenger a ride opens a chat, which lives in the
              Kipita app for now.
            </p>
          </div>
        </Banner>
      );
    }

    if (result?.ok) return null;

    return (
      <Bar>
        <Seats>
          <button
            type="button"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            disabled={seats <= 1 || pending}
            aria-label="Fewer seats"
          >
            <Minus size={16} />
          </button>
          <b aria-live="polite">
            {seats} seat{seats === 1 ? "" : "s"}
          </b>
          <button
            type="button"
            onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
            disabled={seats >= maxSeats || pending}
            aria-label="More seats"
          >
            <Plus size={16} />
          </button>
        </Seats>
        <Primary type="button" onClick={reserve} disabled={pending || soldOut} aria-busy={pending}>
          {pending ? (
            <>
              <ButtonOrb job="committing" /> Sending…
            </>
          ) : soldOut ? (
            "Fully booked"
          ) : (
            <>
              <span>Request · KES</span>
              <RollingNumber
                value={ride.price_per_seat * seats}
                duration={520}
                ariaLabel={formatKes(ride.price_per_seat * seats)}
              />
            </>
          )}
        </Primary>
      </Bar>
    );
  }
}
