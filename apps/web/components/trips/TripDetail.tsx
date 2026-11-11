"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { answerSeatRequestAction } from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking } from "@/lib/trips/types";
import { PaymentDrawer } from "@/components/rides/PaymentDrawer";
import { PushBanner } from "@/components/notifications/PushBanner";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Reveal } from "@/components/anim/Reveal";
import { RideProgress } from "./RideProgress";
import { TripStage } from "./TripStage";
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

const Stage = styled.div`
  margin-top: clamp(22px, 3vh, 32px);
`;

const Landed = styled.p`
  margin: clamp(18px, 2.4vh, 26px) 0 0;
  padding: 14px 18px;
  border-radius: 16px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font-size: 15px;
  line-height: 1.5;

  b {
    font-weight: 800;
  }
`;

const StageAct = styled.button<{ $quiet?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 52px;
  padding: 0 24px;
  border: 1.5px solid ${({ $quiet }) => ($quiet ? RULE : "transparent")};
  border-radius: 999px;
  background: ${({ $quiet }) => ($quiet ? "transparent" : nocturne.ctaBg)};
  color: ${({ $quiet }) => ($quiet ? nocturne.cream : nocturne.ctaFg)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease,
    transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1);

  svg {
    flex: none;
  }

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ $quiet }) => ($quiet ? nocturne.surface : nocturne.green)};
      color: ${({ $quiet }) => ($quiet ? nocturne.accent : nocturne.onGreen)};
      border-color: ${({ $quiet }) => ($quiet ? nocturne.accent : "transparent")};
      transform: translateY(-2px);
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

const StageError = styled.p`
  flex-basis: 100%;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const BandHead = styled.h2`
  margin: 0 0 18px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(20px, 2.2vw, 25px);
  font-weight: 800;
  letter-spacing: -0.028em;
  color: ${nocturne.cream};
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

const payLook = css`
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

const PayButton = styled.button`
  ${payLook}

  &:disabled {
    opacity: 0.6;
    cursor: progress;
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

function holdLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "The hold has run out";

  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m left to pay`;
  return `${minutes}:${String(seconds).padStart(2, "0")} left to pay`;
}

export function TripDetail({
  booking,
  viewerId,
  viewerPhone,
}: {
  booking: Booking;
  viewerId: string;
  viewerPhone?: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const theme = useTheme();
  const [justBooked, setJustBooked] = useState(
    () => params?.get("new") === "1",
  );

  useEffect(() => {
    if (!justBooked) return;
    window.history.replaceState(null, "", `/trips/${booking.id}`);
    const timer = setTimeout(() => setJustBooked(false), 9000);
    return () => clearTimeout(timer);
  }, [justBooked, booking.id]);
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
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [hold, setHold] = useState<string | null>(() =>
    holdLeft(booking.expires_at),
  );
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => router.refresh(), [router]);
  useBookingStream(`booking:${booking.id}`, `id=eq.${booking.id}`, refresh);

  useEffect(() => {
    if (!due) return;
    setHold(holdLeft(booking.expires_at));
    const timer = setInterval(
      () => setHold(holdLeft(booking.expires_at)),
      1000,
    );
    return () => clearInterval(timer);
  }, [due, booking.expires_at]);

  const paid = booking.status === "confirmed";
  const canCancel =
    booking.status === "requested" ||
    booking.status === "pending_payment" ||
    paid;
  const answerable = isDriver && booking.status === "requested";

  function answer(decision: "accept" | "decline") {
    if (decision === "decline") {
      const name = booking.passenger?.full_name ?? "this passenger";
      if (!window.confirm(`Decline ${name}'s request? They will be told.`)) {
        return;
      }
    }

    setBusy(true);
    setError("");
    startTransition(async () => {
      const result = await answerSeatRequestAction(booking.id, decision);
      if (!result.ok) setError(result.error);
      setBusy(false);
      router.refresh();
    });
  }

  function cancel() {
    const message = paid
      ? `Cancel this trip? ${formatCurrency(booking.total_price)} goes back to your Kipita wallet in full.`
      : "Cancel this request? The seat is released straight away.";
    if (!window.confirm(message)) return;

    setBusy(true);
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id);
      if (!result.ok) setError(result.error);
      setBusy(false);
      router.refresh();
    });
  }

  return (
    <Page $max={1060}>
      <ScrollProgress />
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

      {justBooked && (
        <Landed role="status">
          <b>You are booked in.</b> This page follows the trip by itself — leave
          it open and every step lands here.
        </Landed>
      )}

      <Stage>
        <TripStage
          status={booking.status}
          isDriver={isDriver}
          hold={hold}
          since={booking.created_at}
        >
          {answerable && (
            <>
              <StageAct
                type="button"
                onClick={() => answer("accept")}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Saving…" : "Accept this request"}
              </StageAct>
              <StageAct
                $quiet
                type="button"
                onClick={() => answer("decline")}
                disabled={busy}
              >
                Decline
              </StageAct>
            </>
          )}
          {due && !isDriver && (
            <StageAct
              type="button"
              onClick={() => setPaying(true)}
              disabled={busy}
            >
              Pay {formatCurrency(booking.total_price)} with M-Pesa
            </StageAct>
          )}
          {booking.status === "completed" && (
            <StageAct as={Link} href={`/ride/${booking.trip_id}`}>
              <Star size={17} weight="fill" /> Rate this trip
            </StageAct>
          )}
          {error && <StageError role="alert">{error}</StageError>}
        </TripStage>
      </Stage>

      {!finished && <PushBanner />}

      <Layout>
        <MainCol as={Reveal} stagger={0.08} y={22}>
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

          <Band>
            <BandHead>Where this trip is</BandHead>
            <RideProgress
              status={booking.status}
              isDriver={isDriver}
              stoppedNote={booking.cancel_reason}
            />
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
              <small>
                {due
                  ? (hold ?? "Due now")
                  : booking.status === "requested"
                    ? "To pay once accepted"
                    : "Total paid"}
              </small>
              <b>{formatCurrency(booking.total_price)}</b>
            </Amount>
            <Actions>
              {due && !isDriver && (
                <PayButton
                  type="button"
                  onClick={() => setPaying(true)}
                  disabled={busy}
                >
                  Pay this fare <LongArrow size={28} />
                </PayButton>
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

      {due && !isDriver && (
        <PaymentDrawer
          open={paying}
          bookingId={booking.id}
          userId={viewerId}
          amount={booking.total_price}
          defaultPhone={viewerPhone ?? null}
          onClose={() => {
            setPaying(false);
            router.refresh();
          }}
          onPaid={() => {
            setPaying(false);
            router.refresh();
          }}
        />
      )}
    </Page>
  );
}
