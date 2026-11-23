"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled, { css } from "styled-components";
import {
  ArrowClockwise,
  ArrowLeft,
  CalendarBlank,
  Briefcase,
  CarProfile,
  CheckCircle as CheckCircle2,
  Copy,
  ShareForward,
  Ticket as TicketIcon,
  Lightning,
  Lock,
  MapPin,
  Minus,
  MusicNote as Music,
  PawPrint,
  Plus,
  Users,
  SpeakerSimpleX as VolumeX,
  Warning,
} from "@/components/icons";
import { Collapse } from "@/components/anim/Collapse";
import { Swap } from "@/components/anim/Swap";
import { reserveSeatAction, type BookingResult } from "@/lib/bookings";
import { BoardingPanel, SlideToComplete, useBoarding } from "@/components/trips/Boarding";
import type { BoardingRow } from "@/lib/trips/boarding-actions";
import { Drawer } from "@/components/ui/Drawer";
import { formatRideDate, formatRideTime, type RideDetail } from "@/lib/ride-detail";
import { formatKes } from "@/lib/rides";
import { bookingBreakdown } from "@/lib/platform";
import type { FareConfig } from "@kipita/shared";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { dur as motionDur } from "@/lib/motion";
import { RollingNumber } from "@/components/ui/Counter";
import type { Profile } from "@/lib/auth/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { VerifyStatusCard } from "@/components/publish/VerifyStatus";
import { useMorphNavigate } from "@/lib/ui/viewTransition";
import { MapSheet, useSplitLayout } from "@/components/trips/MapSheet";
import { PersonCard } from "./PersonCard";
import { RideRiders } from "./RideRiders";
import { RideFinish } from "./RideFinish";
import { usePickupLocations, useTripLocation } from "@/lib/trips/live";
import { RouteMap } from "@/components/trips/RouteMap";
import type { TripRoute } from "@/lib/maps/types";
import { BookPanel, RULE } from "./RideLayout";

const ChatPanel = dynamic(() => import("@/components/trips/ChatSheet"), { ssr: false });
const AS_DRIVER = "driver" as const;

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
  margin: 0;
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
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${nocturne.surface};

  > svg {
    flex: none;
    margin-top: 1px;
    color: ${nocturne.accent};
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    text-wrap: pretty;
    color: ${nocturne.muted};
  }
  b {
    color: ${nocturne.cream};
    font-weight: 700;
  }
`;

const Next = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.3;
    color: ${nocturne.cream};
  }
  span {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${nocturne.surface};
    color: ${nocturne.accent};
    font-size: 12.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  li:first-child span {
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
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

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: clamp(20px, 4vh, 36px);

  .desk {
    display: contents;
  }

  @media (max-width: 899px) {
    padding-top: 0;

    .desk {
      display: none;
    }
  }
`;

const BackLink = styled(Link)`
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1.5px solid ${nocturne.muted2};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  transition:
    border-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

type StatusTone = "live" | "wait" | "off";

const Status = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 14px 0 12px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 800;
  ${({ $tone }) =>
    $tone === "live"
      ? `background: color-mix(in oklab, ${nocturne.lime} 55%, ${nocturne.surface}); color: ${nocturne.greenDeep};`
      : $tone === "wait"
        ? `background: color-mix(in oklab, ${nocturne.star} 18%, ${nocturne.surface}); color: ${nocturne.cream};`
        : `background: ${nocturne.surface3}; color: ${nocturne.muted};`}

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $tone }) => ($tone === "live" ? nocturne.green : $tone === "wait" ? nocturne.star : nocturne.muted2)};
  }
`;

const Head = styled.header`
  view-transition-name: morph-hero;
  margin-top: 18px;

  h1 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 14px;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 4.4vw, 42px);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.035em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .leg {
    position: relative;
    flex: none;
    width: 46px;
    height: 2px;
    background: repeating-linear-gradient(90deg, ${nocturne.accent} 0 6px, transparent 6px 11px);

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      transform: translateY(-50%);
    }
    &::before {
      left: -4px;
      background: ${nocturne.surface};
      box-shadow: inset 0 0 0 2.5px ${nocturne.accent};
    }
    &::after {
      right: -4px;
      background: ${nocturne.accent};
    }
  }
  p {
    margin: 10px 0 0;
    font-size: 15.5px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

const Meta = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 14px;
    border-radius: 12px;
    background: ${nocturne.surface};
    font-size: 14.5px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Stack = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 20px;
`;

const Card = styled.section`
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 20px;
  background: ${nocturne.surface};

  h2.label {
    margin: 0;
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${nocturne.muted2};
  }
`;

const Ticket = styled(Card)`
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  background: ${({ theme }) => theme.tone.amber.bg};
  color: ${({ theme }) => theme.tone.amber.on};

  && small,
  && b,
  && .seats,
  && .seats strong {
    color: inherit;
  }

  small {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  b {
    display: block;
    margin-top: 4px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 3.6vw, 38px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.035em;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .seats {
    text-align: right;
    font-size: 14.5px;
    color: ${nocturne.muted};

    strong {
      display: block;
      font-size: 20px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: ${nocturne.cream};
    }
  }
`;

const actButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    min-height: 48px;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const OwnerActs = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
  gap: 8px;

  > :first-child {
    grid-column: 1 / -1;
  }
`;

const ShareCta = styled.button<{ $quiet?: boolean }>`
  ${actButton}
  background: ${({ $quiet, theme }) => ($quiet ? theme.tone.green.bg : nocturne.ctaBg)};
  color: ${({ $quiet, theme }) => ($quiet ? theme.tone.green.on : nocturne.ctaFg)};
`;

const EndError = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  color: ${({ theme }) => theme.color.error};
  font-size: 14px;
  font-weight: 600;
`;

function EndRide({ onRun, error }: { onRun: () => void; error: string }) {
  return (
    <div>
      <SlideToComplete label="Slide to end ride" busyLabel="Ending ride…" busy={false} onComplete={onRun} />
      {error ? (
        <EndError role="alert">
          <Warning size={16} aria-hidden />
          {error}
        </EndError>
      ) : null}
    </div>
  );
}

const ManageLink = styled(Link)`
  ${actButton}
  background: ${({ theme }) => theme.tone.green.bg};
  color: ${({ theme }) => theme.tone.green.on};
`;

const CopyButton = styled.button`
  ${actButton}
  background: ${({ theme }) => theme.tone.surface.bg};
  color: ${({ theme }) => theme.tone.surface.on};

  > * {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

const CarCard = styled(Card)`
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};

  h2.label,
  .colour,
  svg,
  b {
    color: inherit;
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
  route,
  fareConfig,
}: {
  ride: RideDetail;
  profile: Profile | null;
  route: Promise<TripRoute | null>;
  fareConfig: FareConfig | null;
}) {
  const router = useRouter();
  const morphTo = useMorphNavigate();
  const reserveRef = useRef<HTMLButtonElement>(null);
  const isTrip = ride.kind === "trip";
  const split = useSplitLayout();
  const person = isTrip ? ride.driver : ride.passenger;
  const maxSeats = isTrip ? Math.max(1, ride.seats_available) : ride.seats_needed;

  const [seats, setSeats] = useState(1);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [override, setOverride] = useState<"in_progress" | "completed" | null>(null);
  const [runError, setRunError] = useState("");
  const phase = isTrip ? (override ?? ride.status) : ride.status;
  const settling = override !== null;

  useEffect(() => {
    if (override && ride.status === override) setOverride(null);
  }, [override, ride.status]);

  function runRide(next: "in_progress" | "completed") {
    setRunError("");
    setOverride(next);
    void (next === "in_progress" ? startTripAction(ride.id) : completeTripAction(ride.id)).then((result) => {
      if (!result.ok) {
        setOverride(null);
        setRunError(result.error);
        return;
      }
      router.refresh();
    });
  }

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
  const awaiting = isTrip && phase === "awaiting_approval";
  const soldOut = isTrip && ride.seats_available < 1;
  const closed = isTrip
    ? !["posted", "active"].includes(phase) && !(isOwn && awaiting)
    : phase !== "pending";
  const scarce = isTrip && ride.seats_available > 0 && ride.seats_available <= 2;
  const ownerView = isOwn && isTrip && !closed;
  const bookable = isTrip && !closed && !ownerView;
  const breakdown = isTrip && fareConfig ? bookingBreakdown(ride.price_per_seat, seats, fareConfig) : null;
  const searchHref = routeSearch(ride.from_location, ride.to_location, isTrip ? undefined : ride.seats_needed);

  const ended = isTrip && closed ? phase : null;
  const carLoc = useTripLocation(isTrip ? ride.id : null, isOwn && isTrip && phase === "in_progress");
  const board = useBoarding(isTrip ? ride.id : null, ownerView && !awaiting);
  const pickups = usePickupLocations(isTrip ? ride.id : null, ownerView && !awaiting);
  const people = board.rows
    .filter((r) => r.state === "waiting" && pickups[r.bookingId])
    .map((r) => ({
      id: r.bookingId,
      lat: pickups[r.bookingId].lat,
      lng: pickups[r.bookingId].lng,
      name: r.passengerName.split(" ")[0] || r.passengerName,
    }));
  const [chatWith, setChatWith] = useState<BoardingRow | null>(null);
  const [shownChat, setShownChat] = useState<BoardingRow | null>(null);
  if (chatWith && chatWith !== shownChat) setShownChat(chatWith);
  const ready = ownerView && !awaiting && board.summary.loaded && board.rows.length > 0 && board.summary.waiting === 0;
  const endedLabel =
    ended === "completed" ? "Completed" : ended === "cancelled" ? "Cancelled" : ended === "in_progress" ? "On the road" : "Not taking bookings";
  const endedLead = !ended
    ? null
    : isOwn
      ? ended === "completed"
        ? `You drove this ride${date ? ` on ${date}` : ""}.`
        : ended === "cancelled"
          ? "You cancelled this ride, so it no longer takes bookings."
          : ended === "in_progress"
            ? "You are driving this ride now."
            : "This ride no longer takes bookings."
      : ended === "completed"
        ? "This ride has already happened."
        : ended === "cancelled"
          ? "The driver cancelled this ride."
          : ended === "in_progress"
            ? "This ride is already on the road."
            : "This ride no longer takes bookings.";

  const lead = endedLead
    ? endedLead
    : ownerView
    ? awaiting
      ? "Your ride is saved. It goes live for passengers as soon as your verification clears."
      : `Your ride is posted. Anyone heading to ${ride.to_location} can find it and book a seat now.`
    : isTrip
      ? "Request a seat. Once the driver accepts, you pay to lock it in."
      : isOwn
        ? "This is how drivers see your request."
        : "Driving this route? Post your ride and they can request a seat.";

  const backHref = isOwn ? "/trips" : "/home";

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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

  const status = ownerView
    ? awaiting
      ? "Saved · waiting on verification"
      : "Posted · open for booking"
    : closed
      ? isTrip
        ? endedLabel
        : "Closed"
      : isTrip
        ? soldOut
          ? "Full"
          : scarce
            ? `Only ${ride.seats_available} ${seatWord(ride.seats_available)} left`
            : "Seats available"
        : "Passenger looking for a ride";
  const statusTone: StatusTone = ownerView
    ? awaiting
      ? "wait"
      : "live"
    : ended === "completed" || ended === "in_progress"
      ? "live"
      : closed || soldOut
        ? "off"
        : "live";
  const meta = [
    ...(date || time
      ? [{ icon: <CalendarBlank size={18} />, label: [date, time].filter(Boolean).join(" at ") }]
      : []),
    ...(isTrip && ride.pickup_point ? [{ icon: <MapPin size={18} />, label: `Pickup: ${ride.pickup_point}` }] : []),
    ...(isTrip && ride.dropoff_point ? [{ icon: <MapPin size={18} />, label: `Drop-off: ${ride.dropoff_point}` }] : []),
    ...(!isTrip ? [{ icon: <Users size={18} />, label: `${ride.seats_needed} ${seatWord(ride.seats_needed)} needed` }] : []),
  ];
  const back = (
    <BackLink href={backHref} aria-label="Back" onClick={goBack}>
      <ArrowLeft size={20} />
    </BackLink>
  );

  const docked = ownerView && !awaiting && split;
  const ownDone = isOwn && isTrip && ended === "completed" && !!profile;
  const doneDocked = ownDone && split;
  const ownLive = isOwn && isTrip && ended === "in_progress" && !!profile;
  const liveDocked = ownLive && split;
  const priceTile =
    isTrip && !bookable ? (
      <Ticket aria-label="Price and seats">
        <div>
          <small>Per seat</small>
          <b>{formatKes(ride.price_per_seat)}</b>
        </div>
        {isOwn ? (
          <p className="seats">
            <strong>
              {Math.max(0, ride.seats_total - ride.seats_available)} of {ride.seats_total}
            </strong>
            seats booked
          </p>
        ) : (
          <p className="seats">
            <strong>
              {ride.seats_available} of {ride.seats_total}
            </strong>
            seats left
          </p>
        )}
      </Ticket>
    ) : null;
  const carTile =
    isTrip && ride.vehicle && vehicleName ? (
      <CarCard aria-label="Car">
        <h2 className="label">Car</h2>
        <Vehicle>
          <CarProfile size={24} aria-hidden />
          <b>{vehicleName}</b>
          {ride.vehicle.color && <span className="colour">{ride.vehicle.color}</span>}
          {plate && <Plate>{plate.toUpperCase()}</Plate>}
        </Vehicle>
      </CarCard>
    ) : null;

  return (
    <MapSheet
      map={(padding) =>
        ownDone ? (
          <RideFinish tripId={ride.id} destination={ride.to_location} pending={settling} />
        ) : (
          <RouteMap
            route={route}
            fromLabel={ride.from_location}
            toLabel={ride.to_location}
            padding={padding}
            car={carLoc}
            follow={carLoc != null}
            people={people}
          />
        )
      }
      mapTop={ownDone ? undefined : back}
      aside={
        docked ? (
          <>
            <BoardingPanel tripId={ride.id} board={board} always onMessage={setChatWith} />
            {priceTile}
            {carTile}
          </>
        ) : liveDocked && profile ? (
          <>
            <RideRiders tripId={ride.id} viewerId={profile.id} live pending={settling} />
            {carTile}
          </>
        ) : doneDocked && profile ? (
          <>
            <RideRiders tripId={ride.id} viewerId={profile.id} pending={settling} />
            {carTile}
          </>
        ) : undefined
      }
      expandLabel="Show all ride details"
    >
      <Top>
        <span className="desk">{back}</span>
        <Status $tone={statusTone}>
          <i aria-hidden />
          {status}
        </Status>
      </Top>

      <Head>
        <h1>
          <span>{ride.from_location}</span>
          <i className="leg" aria-hidden />
          <span>{ride.to_location}</span>
        </h1>
        {lead && !ownDone ? <p>{lead}</p> : null}
      </Head>

      {meta.length > 0 && (
        <Meta>
          {meta.map(({ icon, label }) => (
            <li key={label}>
              {icon}
              {label}
            </li>
          ))}
        </Meta>
      )}

      <Stack>
        {ownerView && !awaiting && !split && (
          <BoardingPanel tripId={ride.id} board={board} always onMessage={setChatWith} />
        )}

        {ownerView && !awaiting && (
          <ShareRide
            rideId={ride.id}
            from={ride.from_location}
            to={ride.to_location}
            when={[date, time].filter(Boolean).join(" at ")}
            start={ready ? <StartRide onRun={() => runRide("in_progress")} error={runError} /> : undefined}
          />
        )}

        {ownerView && awaiting && <VerifyStatusCard compact context="ride" stage="pending" />}

        {ownDone && !split && profile ? <RideRiders tripId={ride.id} viewerId={profile.id} pending={settling} /> : null}
        {ownLive && !split && profile ? (
          <RideRiders tripId={ride.id} viewerId={profile.id} live pending={settling} />
        ) : null}
        {!docked && !ownDone && !ownLive && priceTile}



        {bookable && renderBookPanel()}

        {!bookable && !ownerView && renderSideAction()}

          {person && (
            <PersonCard
              person={person}
              label={isTrip ? (isOwn ? (ended === "completed" ? "You drove" : "You, driving") : "Your driver") : "Passenger"}
              role={isTrip ? "driver" : "passenger"}
            />
          )}

          {!docked && !doneDocked && !liveDocked && carTile}


          {prefs.length > 0 && (
            <Card aria-label="On this ride">
              <h2 className="label">On this ride</h2>
              <Facts>
                {prefs.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <Icon size={18} /> {label}
                  </li>
                ))}
              </Facts>
            </Card>
          )}

          {isTrip && note && (
            <Card aria-label="Driver's note">
              <h2 className="label">Note from the driver</h2>
              <Note>{note}</Note>
            </Card>
          )}
      </Stack>
      {ownerView && profile ? (
        <Drawer
          open={chatWith !== null}
          onClose={() => setChatWith(null)}
          title={chatWith ? chatWith.passengerName : "Messages"}
          side
          fill
        >
          {shownChat ? (
            <ChatPanel
              key={shownChat.bookingId}
              open={chatWith !== null}
              bookingId={shownChat.bookingId}
              me={profile.id}
              otherName={shownChat.passengerName}
              otherAvatar={shownChat.avatarUrl}
              role={AS_DRIVER}
              status="confirmed"
            />
          ) : null}
        </Drawer>
      ) : null}
    </MapSheet>
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
                </>
              ) : (
                <>
                  <dt>Includes Kipita fee ({breakdown.feePercent}%)</dt>
                  <dd>{formatKes(breakdown.subtotal - breakdown.driverEarning)}</dd>
                </>
              )}
              <dt className="total">You pay</dt>
              <dd className="total">{formatKes(breakdown.total)}</dd>
            </Split>
            <Next aria-label="What happens next">
              <li>
                <span>1</span>Request
              </li>
              <li>
                <span>2</span>Driver accepts
              </li>
              <li>
                <span>3</span>You pay
              </li>
            </Next>
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
          <Lock size={18} aria-hidden />
          <p>
            <b>Your fare is safe.</b> Kipita holds it and only pays the driver after the trip.
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
      if (ownLive) return <EndRide onRun={() => runRide("completed")} error={settling ? "" : runError} />;
      if (ownDone) return null;
      return isOwn && isTrip ? (
        <ManageLink href="/trips">
          <TicketIcon size={20} /> See your trips
        </ManageLink>
      ) : (
        <PrimaryLink href={searchHref}>
          Find rides from {ride.from_location} to {ride.to_location}
        </PrimaryLink>
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

function StartRide({ onRun, error }: { onRun: () => void; error: string }) {
  return (
    <div>
      <SlideToComplete label="Slide to start ride" busyLabel="Starting ride…" busy={false} onComplete={onRun} />
      {error ? (
        <EndError role="alert">
          <Warning size={16} aria-hidden />
          {error}
        </EndError>
      ) : null}
    </div>
  );
}

function ShareRide({
  rideId,
  from,
  to,
  when,
  start,
}: {
  rideId: string;
  from: string;
  to: string;
  when: string;
  start?: ReactNode;
}) {
  const [origin, setOrigin] = useState("");
  const [native, setNative] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setNative(typeof navigator.share === "function");
  }, []);

  const url = `${origin}/ride/${rideId}`;
  const text = `I'm driving ${from} to ${to}${when ? `, ${when}` : ""}. Book a seat on Kipita:`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (!native) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: `${from} to ${to} on Kipita`, text, url });
    } catch {
      return;
    }
  }

  return (
    <Card aria-label="Share your ride">
      <OwnerActs>
        {start}
        <ShareCta type="button" onClick={() => void share()} $quiet={!!start}>
          <ShareForward size={20} /> Share your ride
        </ShareCta>
        <ManageLink href="/trips">
          <TicketIcon size={20} /> Manage in your trips
        </ManageLink>
        <CopyButton type="button" onClick={() => void copy()}>
          <Swap id={copied ? "copied" : "idle"}>
            {copied ? (
              <>
                <CheckCircle2 size={20} weight="bold" /> Link copied
              </>
            ) : (
              <>
                <Copy size={20} /> Copy link
              </>
            )}
          </Swap>
        </CopyButton>
      </OwnerActs>
    </Card>
  );
}