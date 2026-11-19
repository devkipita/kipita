"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { ArrowLeft, ChatCircle, Check, Clock, Flag, Lock, NavigationArrow, Phone, SealCheck, ShareNetwork, Star, X } from "@/components/icons";
import { contactPhoneAction } from "@/lib/trips/journey-actions";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { releaseEscrowForAll } from "@/lib/escrow";
import dynamic from "next/dynamic";
import type { TripRoute } from "@/lib/maps/types";
import { LiveStatus, useLiveEta } from "./LiveCard";
import { placeKey } from "@/lib/maps/types";
import { useTripLocation } from "@/lib/trips/live";
import { RouteMap } from "./RouteMap";

const ChatPanel = dynamic(() => import("./ChatSheet"), { ssr: false });
import { Avatar } from "@/components/profile/Avatar";
import { ContentWidth } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { cancelBookingAction } from "@/lib/trips/booking-actions";
import { answerSeatRequestAction } from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking } from "@/lib/trips/types";
import { CancelPanel } from "./CancelPanel";
import { FinishScene } from "./FinishScene";
import { RateRide } from "./RateRide";
import { PayPanel } from "./PayPanel";
import { PANEL_IN, PANEL_IN_MS, PANEL_OUT, SidePanel, type PanelMode } from "./SidePanel";
import { PushBanner } from "@/components/notifications/PushBanner";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Chip, STATUS } from "./BookingCard";
import { TripHelp } from "./TripHelp";

const DESK = "@media (min-width: 861px)";

const Page = styled(ContentWidth)<{ $map: boolean; $side?: boolean; $squeeze?: boolean }>`
  padding-block: 0 64px;
  padding-left: max(16px, var(--page-pad), env(safe-area-inset-left));
  padding-right: max(16px, var(--page-pad), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};

  @media (max-width: 960px) {
    padding-bottom: calc(48px + var(--bottom-bar-space, 0px));
  }

  ${({ $map, $side, $squeeze }) =>
    $map &&
    css`
      @media (min-width: 900px) {
        display: grid;
        grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
        align-items: start;
        gap: 24px;
        transform: translate3d(${$side ? "calc(-1 * var(--shift, 0px))" : "0"}, 0, 0);
        transition: transform ${$side ? PANEL_IN : PANEL_OUT};
        padding-right: ${$squeeze ? "calc(max(16px, var(--page-pad)) + var(--squeeze, 0px))" : "max(16px, var(--page-pad))"};
      }
      @media (min-width: 900px) and (prefers-reduced-motion: reduce) {
        transition: none;
      }
      @media (max-width: 899px) {
        min-height: calc(100dvh - var(--topbar-h, 56px) - var(--bottom-bar-space, 0px));
        padding: 0;
      }
    `}
`;

const Bar = styled.header<{ $map?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding-top: clamp(20px, 4vh, 40px);

  ${({ $map }) =>
    $map &&
    css`
      @media (max-width: 899px) {
        display: none;
      }
    `}

  h1 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(30px, 4vw, 40px);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: ${nocturne.cream};
  }

  @media (max-width: 960px) {
    padding-top: 0;
  }
`;

const Back = styled(Link)`
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1.5px solid ${nocturne.muted2};
  background: ${nocturne.surface};
  color: ${nocturne.cream};

  @media (hover: hover) {
    &:hover {
      border-color: ${nocturne.accent};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Share = styled.button<{ $done: boolean }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  margin-left: auto;
  padding: 0;
  border-radius: 50%;
  border: 0;
  background: ${({ $done }) => ($done ? nocturne.green : nocturne.surface)};
  color: ${({ $done }) => ($done ? nocturne.onGreen : nocturne.cream)};
  border: 1.5px solid ${nocturne.muted2};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active {
      transform: none;
    }
  }
`;

const Grid = styled.div<{ $single?: boolean }>`
  display: grid;
  gap: 14px;
  margin-top: 18px;

  ${DESK} {
    grid-template-columns: ${({ $single }) => ($single ? "minmax(0, 1fr)" : "minmax(0, 1fr) 380px")};
    align-items: start;
    gap: ${({ $single }) => ($single ? "14px" : "20px")};
  }
`;

const Col = styled.div<{ $single?: boolean }>`
  display: contents;

  ${DESK} {
    display: ${({ $single }) => ($single ? "contents" : "grid")};
    gap: 14px;
  }
`;

const MOB = "@media (max-width: 899px)";
const WIDE = "@media (min-width: 900px)";

const MapPane = styled.div`
  ${WIDE} {
    order: 2;
    position: sticky;
    top: calc(var(--topbar-h, 64px) + 16px);
    min-width: 0;
    height: calc(100dvh - var(--topbar-h, 64px) - 32px);
    margin-top: 16px;
    border-radius: 20px;
    overflow: hidden;
  }
  ${MOB} {
    position: fixed;
    z-index: 1;
    top: var(--topbar-h, 56px);
    left: 0;
    right: 0;
    bottom: var(--sheet-visible, 50dvh);
  }
`;


const MapTop = styled.div`
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;

  > * {
    pointer-events: auto;
    box-shadow: ${nocturne.panelShadow};
  }

  ${WIDE} {
    display: none;
  }
`;

type Snap = "peek" | "half" | "full";
type Side = "pay" | "chat" | "cancel";

const SNAP_Y: Record<Snap, string> = {
  full: "0px",
  half: "42%",
  peek: "calc(100% - 132px - var(--bottom-bar-space, 0px))",
};

const Sheet = styled.div<{ $map: boolean; $snap: Snap }>`
  ${({ $map }) =>
    $map &&
    css`
      ${WIDE} {
        order: 1;
        min-width: 0;
      }
      ${MOB} {
        position: fixed;
        z-index: 4;
        top: var(--topbar-h, 56px);
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        border-radius: 24px 24px 0 0;
        background: ${nocturne.bg};
        box-shadow: ${nocturne.panelShadow};
        transition: transform ${dur.enter} ${ease.enter};
        touch-action: none;
      }
    `}
  ${MOB} {
    transform: ${({ $map, $snap }) => ($map ? `translate3d(0, ${SNAP_Y[$snap]}, 0)` : "none")};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Handle = styled.button`
  display: none;

  ${MOB} {
    display: grid;
    place-items: center;
    flex: none;
    width: 100%;
    height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;

    i {
      width: 44px;
      height: 5px;
      border-radius: 999px;
      background: ${nocturne.muted2};
    }
    &:focus-visible {
      outline: 3px solid ${nocturne.accent};
      outline-offset: -3px;
    }
  }
`;

const SheetBody = styled.div<{ $map: boolean }>`
  ${MOB} {
    ${({ $map }) =>
      $map &&
      css`
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        touch-action: pan-y;
        padding: 0 16px calc(24px + var(--bottom-bar-space, 0px));
      `}
  }
`;

const LiveWrap = styled.div`
  margin-top: 8px;
`;


const Card = styled.section<{ $order?: number }>`
  order: ${({ $order }) => $order ?? 0};
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  background: ${nocturne.surface};

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }

  ${DESK} {
    padding: 22px;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span:last-child:not(:first-child) {
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
`;

const Route = styled.ol`
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    display: grid;
    gap: 2px;
    padding-left: 26px;
  }
  li::before {
    content: "";
    position: absolute;
    left: 3px;
    top: 9px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2.5px ${nocturne.green};
    background: ${nocturne.surface};
  }
  li + li::before {
    background: ${nocturne.green};
  }
  li:first-child::after {
    content: "";
    position: absolute;
    left: 7px;
    top: 23px;
    bottom: -14px;
    border-left: 2px dashed ${nocturne.line2};
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(20px, 2.4vw, 24px);
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.2;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  small {
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const Lines = styled.dl`
  display: grid;
  gap: 10px;
  margin: 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 15px;
  }
  dt {
    color: ${nocturne.muted};
  }
  dd {
    margin: 0;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .total {
    padding-top: 12px;
    border-top: 1px solid ${nocturne.line};
  }
  .total dt {
    font-weight: 800;
    color: ${nocturne.cream};
  }
  .total dd {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 22px;
    letter-spacing: -0.02em;
  }
`;

const Hint = styled.p<{ $warn?: boolean; $order?: number }>`
  order: ${({ $order }) => $order ?? 0};
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${({ $warn }) => ($warn ? "color-mix(in oklab, var(--n-cta-bg) 14%, transparent)" : nocturne.green)};
  color: ${({ $warn }) => ($warn ? nocturne.cream : nocturne.onGreen)};
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  svg {
    flex: none;
  }
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  b {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 16px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  b svg {
    color: ${nocturne.green};
  }
  small {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: ${nocturne.muted};
  }
  small svg {
    color: ${nocturne.star};
  }
`;

const Acts = styled.div<{ $order?: number }>`
  order: ${({ $order }) => $order ?? 0};
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 10px;
`;

const btn = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 999px;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Outline = styled.button`
  ${btn}
  border: 2px solid ${nocturne.green};
  background: ${nocturne.surface};
  color: ${nocturne.green};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.surface2};
    }
  }
`;

const Solid = styled.button`
  ${btn}
  border: 2px solid transparent;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.greenDeep};
    }
  }
`;

const Pay = styled.button<{ $quiet?: boolean }>`
  ${btn}
  width: 100%;
  border: 2px solid ${({ $quiet }) => ($quiet ? nocturne.green : "transparent")};
  background: ${({ $quiet }) => ($quiet ? nocturne.surface : nocturne.ctaBg)};
  color: ${({ $quiet }) => ($quiet ? nocturne.green : nocturne.ctaFg)};
  font-size: 16px;
`;

const beacon = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.1); opacity: 0; }
`;

const Steps = styled.ol`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.muted};
  }
  li:not(:last-child)::after {
    content: "";
    position: absolute;
    left: 11px;
    top: 34px;
    height: 20px;
    border-left: 2px solid ${nocturne.line};
  }
  li[data-state="done"]:not(:last-child)::after {
    border-left-color: ${nocturne.green};
  }
  time {
    margin-left: auto;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted};
  }
  .dot {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid ${nocturne.line2};
    background: ${nocturne.surface};
  }
  li[data-state="done"] {
    color: ${nocturne.cream};
  }
  li[data-state="done"] .dot {
    border-color: ${nocturne.green};
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
  }
  li[data-state="now"] {
    color: ${nocturne.cream};
    font-weight: 800;
  }
  li[data-state="now"] .dot {
    position: relative;
    border-color: ${nocturne.green};
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--n-green) 18%, transparent);

    &::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${nocturne.green};
    }
    &::after {
      content: "";
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 2px solid ${nocturne.green};
      animation: ${beacon} 1.8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    li[data-state="now"] .dot::after {
      animation: none;
      opacity: 0;
    }
  }
  li[data-state="stop"] {
    color: ${nocturne.cream};
    font-weight: 800;
  }
  li[data-state="stop"] .dot {
    border-color: ${nocturne.danger};
    background: ${nocturne.danger};
    color: ${nocturne.onGreen};
  }
`;

const Talk = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const RoundAct = styled.button`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

function when(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  if (yesterday) return "Yesterday";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const Booked = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 0;
  padding: 12px 16px;
  border-radius: 14px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-weight: 800;
`;

const Help = styled.div`
  margin-top: clamp(32px, 5vh, 48px);
`;

const ORDER = ["requested", "pending_payment", "confirmed", "in_progress", "completed"] as const;

const RIDER_STEPS = ["Request sent", "Driver accepted", "Paid, held by Kipita", "On the way", "Arrived"];
const DRIVER_STEPS = ["Request received", "You accepted", "Passenger paid", "On the way", "Arrived"];

function holdLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function TripDetail({
  booking,
  viewerId,
  viewerPhone,
  walletBalance,
  route,
}: {
  booking: Booking;
  viewerId: string;
  viewerPhone?: string | null;
  walletBalance: number | null;
  route: Promise<TripRoute | null>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [justBooked, setJustBooked] = useState(() => params?.get("new") === "1");

  useEffect(() => {
    if (!justBooked) return;
    window.history.replaceState(null, "", `/trips/${booking.id}`);
    const timer = setTimeout(() => setJustBooked(false), 9000);
    return () => clearTimeout(timer);
  }, [justBooked, booking.id]);

  const isDriver = booking.driver_id === viewerId;
  const person = isDriver ? booking.passenger : booking.driver;
  const name = person?.full_name || "Kipita user";
  const origin = booking.trip?.from_location ?? "Pickup to confirm";
  const destination = booking.trip?.to_location ?? "Drop-off to confirm";
  const status = STATUS[booking.status];
  const live = booking.status === "in_progress";
  const due = booking.status === "pending_payment";
  const paid = booking.status === "confirmed";
  const stopped = booking.status === "cancelled" || booking.status === "rejected";
  const finished = booking.status === "completed" || stopped;
  const seatWord = booking.seats_booked === 1 ? "seat" : "seats";

  const date = formatTripDate(booking.trip?.departure_date ?? null) || "Date to confirm";
  const time = formatTripTime(booking.trip?.departure_time ?? null) || "time to confirm";
  const rating = person?.rating ? person.rating.toFixed(1) : null;
  const perSeat = booking.trip?.price_per_seat ?? 0;
  const fee = booking.service_fee;
  const subtotal = fee != null ? booking.total_price - fee : booking.total_price;
  const feePct = fee != null && subtotal > 0 ? Math.round((fee / subtotal) * 100) : null;
  const seatLine = perSeat > 0 && perSeat * booking.seats_booked === subtotal;

  const [busy, setBusy] = useState<"cancel" | "accept" | "decline" | "run" | null>(null);
  const [error, setError] = useState("");
  const [hold, setHold] = useState<string | null>(() => holdLeft(booking.expires_at));
  const [, startTransition] = useTransition();
  const { ask, confirmNode } = useConfirm();
  const lapsed = due && !hold;
  const chip = lapsed ? { label: "Payment missed", tone: "off" as const, icon: X } : status;
  const ChipIcon = chip.icon;
  const earned = paid || live;
  const receiveTitle = booking.status === "completed" ? "What you received" : earned ? "What you receive" : "What you'll receive";
  const receiveTotal = booking.status === "completed" ? "You received" : earned ? "You receive" : "You'll receive";

  const refresh = useCallback(() => router.refresh(), [router]);
  useBookingStream(`booking:${booking.id}`, `id=eq.${booking.id}`, refresh);

  useEffect(() => {
    if (!due) return;
    setHold(holdLeft(booking.expires_at));
    const timer = setInterval(() => setHold(holdLeft(booking.expires_at)), 1000);
    return () => clearInterval(timer);
  }, [due, booking.expires_at]);

  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/ride/${booking.trip_id}`;
    const title = `${origin} to ${destination}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const car = booking.trip?.vehicle;
  const carLine = car
    ? [[car.make, car.model].filter(Boolean).join(" "), car.color && car.color !== "Unspecified" ? car.color.toLowerCase() : null, car.plate_number]
        .filter(Boolean)
        .join(" · ")
    : "";

  const canCancel = !isDriver && (booking.status === "requested" || due || paid);
  const answerable = isDriver && booking.status === "requested";
  const firstName = name.split(" ")[0];
  const runnable = isDriver && (paid || live);

  async function run(anchor: Element) {
    const starting = paid;
    const ok = await ask(anchor, {
      title: starting ? `Start the trip to ${destination}?` : `End the trip at ${destination}?`,
      yes: starting ? "Start trip" : "End trip",
      no: starting ? "Not yet" : "Keep driving",
    });
    if (!ok || !booking.trip_id) return;
    setBusy("run");
    setError("");
    startTransition(async () => {
      const result = starting ? await startTripAction(booking.trip_id) : await completeTripAction(booking.trip_id);
      if (result.ok && !starting) await releaseEscrowForAll(result.bookingIds);
      setBusy(null);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  async function answer(decision: "accept" | "decline", anchor: Element) {
    if (decision === "decline") {
      const ok = await ask(anchor, {
        title: "Decline request?",
        yes: "Decline request",
        no: "Keep request",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(decision);
    setError("");
    startTransition(async () => {
      const result = await answerSeatRequestAction(booking.id, decision);
      if (!result.ok) setError(result.error);
      setBusy(null);
      router.refresh();
    });
  }

  const [cancelError, setCancelError] = useState("");

  function cancel(reason: string | undefined) {
    setBusy("cancel");
    setCancelError("");
    startTransition(async () => {
      const result = await cancelBookingAction(booking.id, reason);
      setBusy(null);
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      setSide(null);
      router.refresh();
    });
  }

  const hasMap = !stopped;
  const loc = useTripLocation(booking.trip_id, live && !isDriver);
  const eta = useLiveEta(loc, booking.trip ? placeKey(booking.trip.to_location, booking.trip.to_lat, booking.trip.to_lng) : "");

  const [snap, setSnap] = useState<Snap>("half");
  const [mapPad, setMapPad] = useState<google.maps.Padding | undefined>(undefined);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const dragged = useRef(false);

  const [mobile, setMobile] = useState(false);
  const [side, setSide] = useState<Side | null>(null);
  const [lastSide, setLastSide] = useState<Side>("pay");
  const [payBusy, setPayBusy] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const [squeeze, setSqueeze] = useState(false);

  const measure = useCallback(() => {
    const page = pageRef.current;
    const map = page?.querySelector<HTMLElement>("[data-map-pane]");
    const details = sheetRef.current;
    if (!page || !map || !details) return false;
    const GAP = 24;
    const vw = document.documentElement.clientWidth;
    const moved = page.dataset.side === "1" ? Number.parseFloat(page.style.getPropertyValue("--shift")) || 0 : 0;
    const squeezed = page.dataset.squeeze === "1" ? Number.parseFloat(page.style.getPropertyValue("--squeeze")) || 0 : 0;
    const left = details.getBoundingClientRect().left + moved;
    const right = map.getBoundingClientRect().right + moved + squeezed;
    const block = right - left;
    const fit = vw - block - GAP - 2 * GAP;
    const width = Math.min(440, Math.max(360, fit));
    const deficit = Math.max(0, 360 - fit);
    const outer = Math.max(GAP, (vw - (block - deficit) - GAP - width) / 2);
    page.style.setProperty("--shift", `${Math.round(left - outer)}px`);
    page.style.setProperty("--squeeze", `${Math.round(deficit)}px`);
    const root = document.documentElement.style;
    root.setProperty("--dock-w", `${Math.round(width)}px`);
    root.setProperty("--dock-r", `${Math.round(outer)}px`);
    return deficit > 0;
  }, []);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--dock-w");
      document.documentElement.style.removeProperty("--dock-r");
    },
    [],
  );

  const openSide = (s: Side) => {
    if (!mobile && side === null) measure();
    setLastSide(s);
    setSide(s);
  };

  const wantPanel: Side | null =
    params?.get("pay") === "1" ? "pay" : params?.get("chat") === "1" ? "chat" : null;

  useEffect(() => {
    if (!wantPanel) return;
    const frame = requestAnimationFrame(() => {
      window.history.replaceState(null, "", `/trips/${booking.id}`);
      const allowed =
        wantPanel === "pay"
          ? due && !isDriver
          : ["pending_payment", "confirmed", "in_progress", "completed"].includes(booking.status);
      if (!allowed) return;
      if (window.matchMedia("(min-width: 861px)").matches) measure();
      setLastSide(wantPanel);
      setSide(wantPanel);
    });
    return () => cancelAnimationFrame(frame);
  }, [wantPanel, booking.id, booking.status, due, isDriver, measure]);

  useEffect(() => {
    if (pageRef.current) pageRef.current.dataset.squeeze = squeeze ? "1" : "0";
  }, [squeeze]);

  useEffect(() => {
    const page = pageRef.current;
    if (page) page.dataset.side = side && !mobile ? "1" : "0";
    if (!side || mobile) {
      const t = setTimeout(() => setSqueeze(false), side ? 0 : 300);
      return () => clearTimeout(t);
    }
    const needsSqueeze = (Number.parseFloat(page?.style.getPropertyValue("--squeeze") ?? "0") || 0) > 0;
    const t = setTimeout(() => setSqueeze(needsSqueeze), PANEL_IN_MS);
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(settle);
      settle = setTimeout(() => setSqueeze(measure()), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      clearTimeout(settle);
      window.removeEventListener("resize", onResize);
    };
  }, [side, mobile, measure]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const set = () => {
      setMobile(mq.matches);
      if (!mq.matches) {
        setMapPad({ top: 72, right: 72, bottom: 72, left: 72 });
        return;
      }
      const el = sheetRef.current;
      if (!el || snap === "full") return;
      const visible = el.offsetHeight - snapOffsets(el.offsetHeight)[snap];
      document.documentElement.style.setProperty("--sheet-visible", `${Math.round(visible - 20)}px`);
      setMapPad({ top: 80, right: 64, left: 40, bottom: 40 });
    };
    const settle = setTimeout(set, 320);
    set();
    mq.addEventListener("change", set);
    window.addEventListener("resize", set);
    return () => {
      clearTimeout(settle);
      mq.removeEventListener("change", set);
      window.removeEventListener("resize", set);
    };
  }, [side, snap]);

  function dragStart(e: React.PointerEvent<HTMLButtonElement>) {
    dragged.current = false;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  const snapOffsets = (h: number): Record<Snap, number> => {
    const bar = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-bar-space")) || 0;
    return { full: 0, half: h * 0.42, peek: h - 132 - bar };
  };

  const snapRef = useRef(snap);
  snapRef.current = snap;
  const bodyRef = useRef<HTMLDivElement>(null);

  function dragTo(dy: number) {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    d.dy = dy;
    if (Math.abs(dy) > 4) dragged.current = true;
    const offsets = snapOffsets(el.offsetHeight);
    const raw = offsets[snapRef.current] + dy;
    const y = raw < 0 ? raw / 4 : Math.min(raw, offsets.peek + 40);
    el.style.transition = "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  function dragMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (d) dragTo(e.clientY - d.y);
  }

  function dragEnd() {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transition = "";
    el.style.transform = "";
    if (!dragged.current) return;
    const current = snapRef.current;
    const offsets = snapOffsets(el.offsetHeight);
    const order: Snap[] = ["full", "half", "peek"];
    const v = d.dy / Math.max(1, performance.now() - d.t);
    const i = order.indexOf(current);
    if (Math.abs(v) > 0.11) {
      setSnap(order[Math.min(2, Math.max(0, i + (v > 0 ? 1 : -1)))]);
      return;
    }
    const y = offsets[current] + d.dy;
    setSnap(order.reduce((best, s) => (Math.abs(offsets[s] - y) < Math.abs(offsets[best] - y) ? s : best), current));
  }

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !mobile || !hasMap) return;
    let startY = 0;
    let t0 = 0;
    let active = false;
    let decided = false;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      t0 = performance.now();
      active = false;
      decided = false;
    };
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (!decided && Math.abs(dy) > 6) {
        decided = true;
        active = snapRef.current !== "full" || (body.scrollTop <= 0 && dy > 0);
        if (active) {
          dragged.current = false;
          drag.current = { y: startY, t: t0, dy: 0 };
        }
      }
      if (active) {
        e.preventDefault();
        dragTo(dy);
      }
    };
    const onEnd = () => {
      if (active) dragEnd();
      active = false;
    };
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, hasMap]);

  const shown = side ?? lastSide;
  const panelMode: PanelMode = hasMap ? (mobile ? "sheet" : "map") : "float";
  const sidePanel = (
    <SidePanel
      open={side !== null}
      mode={panelMode}
      title={shown === "chat" ? name : shown === "cancel" ? "Cancel ride" : "Pay for your seat"}
      closeLabel={shown === "chat" ? "Close messages" : shown === "cancel" ? "Keep ride" : "Close payment"}
      onClose={() => setSide(null)}
      locked={(shown === "pay" && payBusy) || (shown === "cancel" && busy === "cancel")}
    >
      {shown === "pay" && due && !isDriver && (
        <PayPanel
          open={side === "pay"}
          bookingId={booking.id}
          amount={booking.total_price}
          subtotal={subtotal}
          fee={fee}
          feePct={feePct}
          seatsLine={
            seatLine
              ? `${booking.seats_booked} ${seatWord} at ${formatCurrency(perSeat)}`
              : `${booking.seats_booked} ${seatWord}`
          }
          defaultPhone={viewerPhone ?? null}
          walletBalance={walletBalance}
          onBusy={setPayBusy}
          onClose={() => setSide(null)}
          onPaid={() => {
            setSide(null);
            router.refresh();
          }}
        />
      )}
      {shown === "cancel" && (
        <CancelPanel
          money={
            paid
              ? `${formatCurrency(booking.total_price)} goes back to your Kipita wallet`
              : "Nothing has been charged"
          }
          refund={paid}
          busy={busy === "cancel"}
          error={cancelError}
          onKeep={() => setSide(null)}
          onCancel={cancel}
        />
      )}
      {shown === "chat" && ["pending_payment", "confirmed", "in_progress", "completed"].includes(booking.status) && (
        <ChatPanel
          open={side === "chat"}
          bookingId={booking.id}
          me={viewerId}
          otherName={name}
          role={isDriver ? "driver" : "passenger"}
          status={booking.status}
        />
      )}
    </SidePanel>
  );
  const [calling, setCalling] = useState(false);
  const talkable = ["pending_payment", "confirmed", "in_progress", "completed"].includes(booking.status);
  const callable = paid || live;

  async function call() {
    setCalling(true);
    setError("");
    const r = await contactPhoneAction(booking.id);
    setCalling(false);
    if (r.ok) window.location.href = `tel:${r.value}`;
    else setError(r.error);
  }

  const stamps = [booking.created_at, booking.accepted_at, booking.paid_at, booking.started_at, booking.completed_at];
  const labels = isDriver ? DRIVER_STEPS : RIDER_STEPS;
  const at = ORDER.indexOf(booking.status as (typeof ORDER)[number]);

  const note = due
    ? hold
      ? isDriver
        ? `Waiting for ${firstName} to pay · ${hold} left`
        : `Pay within ${hold} to keep your ${seatWord}`
      : isDriver
        ? `${firstName} didn't pay in time, so the seat isn't held for them`
        : "Your hold ran out. Request the seat again if it's still free"
    : booking.status === "requested"
      ? isDriver
        ? `${firstName} pays once you accept`
        : "Nothing is charged until the driver accepts"
      : paid || live
        ? isDriver
          ? `${formatCurrency(subtotal)} held in escrow · yours when you end the trip`
          : fee != null
            ? `Your driver receives the full ${formatCurrency(subtotal)} once the trip ends`
            : "Kipita holds the fare until the trip ends"
        : booking.status === "completed"
          ? isDriver
            ? `${formatCurrency(subtotal)} released to your wallet`
            : "Trip complete"
          : booking.refunded_amount != null
            ? `${formatCurrency(booking.refunded_amount)} refunded ${booking.refund_to === "mpesa" ? "to M-Pesa" : "to your Kipita wallet"}`
            : booking.paid_at
              ? "Refund on its way to your Kipita wallet"
              : "Nothing was charged";

  return (
    <>
    <Page
      ref={pageRef}
      $max={hasMap ? 1320 : 1060}
      $map={hasMap}
      $side={side !== null && panelMode === "map"}
      $squeeze={squeeze}
    >
      {hasMap && (
        <MapPane data-map-pane>
          <MapTop>
            <Back href="/trips" aria-label="Back to trips">
              <ArrowLeft size={20} />
            </Back>
            <Share type="button" aria-label={copied ? "Link copied" : "Share ride"} onClick={share} $done={copied}>
              {copied ? <Check size={20} weight="bold" /> : <ShareNetwork size={20} />}
            </Share>
          </MapTop>
          {booking.status === "completed" ? (
            <FinishScene
              destination={destination}
              startedAt={booking.started_at}
              completedAt={booking.completed_at}
              amount={isDriver ? subtotal : booking.total_price}
              seats={booking.seats_booked}
              isDriver={isDriver}
            />
          ) : (
            <RouteMap
              route={route}
              car={loc}
              etaSeconds={eta}
              fromLabel={origin}
              toLabel={destination}
              follow={live}
              padding={mapPad}
              onboard={live && !isDriver}
            />
          )}
        </MapPane>
      )}
      <Sheet ref={sheetRef} $map={hasMap} $snap={snap}>
        {hasMap && (
          <Handle
            type="button"
            aria-label={snap === "full" ? "Show the map" : "Show all trip details"}
            aria-expanded={snap === "full"}
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={dragEnd}
            onClick={() => {
              if (!dragged.current) setSnap((s) => (s === "full" ? "half" : "full"));
            }}
          >
            <i aria-hidden />
          </Handle>
        )}
        <SheetBody ref={bodyRef} $map={hasMap}>
      <Bar $map={hasMap}>
        <Back href="/trips" aria-label="Back to trips">
          <ArrowLeft size={20} />
        </Back>
        <h1>Trip</h1>
        <Share
          type="button"
          aria-label={copied ? "Link copied" : "Share ride"}
          onClick={share}
          $done={copied}
        >
          {copied ? <Check size={20} weight="bold" /> : <ShareNetwork size={20} />}
        </Share>
      </Bar>

      {justBooked && (
        <Booked role="status">
          <Check size={18} weight="bold" /> You&rsquo;re booked in
        </Booked>
      )}

      {live && !isDriver && (
        <LiveWrap>
          <LiveStatus from={origin} to={destination} loc={loc} eta={eta} />
        </LiveWrap>
      )}

      <Grid $single={hasMap}>
        <Col $single={hasMap}>
          {booking.status === "completed" && (
            <Card $order={-1} aria-label={`Rate ${name}`}>
              <RateRide
                bookingId={booking.id}
                name={name}
                avatarUrl={person?.avatar_url ?? null}
                isDriver={isDriver}
                initial={booking.my_rating}
              />
            </Card>
          )}
          <Card $order={1} aria-label="Route">
            <Top>
              <Chip $tone={chip.tone}>
                {live ? <i aria-hidden /> : <ChipIcon size={15} weight="bold" />}
                {chip.label}
              </Chip>
              {booking.booking_reference && <span>{booking.booking_reference}</span>}
            </Top>
            <Route>
              <li>
                <b>{origin}</b>
                <small>
                  {date} · {time}
                </small>
              </li>
              <li>
                <b>{destination}</b>
                <small>
                  {booking.seats_booked} {seatWord}
                </small>
              </li>
            </Route>
          </Card>

          <Card $order={5} aria-label="Progress">
            <h2>Progress</h2>
            <Steps>
              {stopped ? (
                <>
                  <li data-state="done">
                    <span className="dot">
                      <Check size={13} weight="bold" />
                    </span>
                    {labels[0]}
                    <time dateTime={booking.created_at}>{when(booking.created_at)}</time>
                  </li>
                  <li data-state="stop">
                    <span className="dot">
                      <X size={12} weight="bold" />
                    </span>
                    {booking.status === "rejected" ? "Declined" : "Cancelled"}
                    {booking.cancelled_at && <time dateTime={booking.cancelled_at}>{when(booking.cancelled_at)}</time>}
                  </li>
                </>
              ) : (
                labels.map((label, i) => {
                  const state = i < at || booking.status === "completed" ? "done" : i === at ? "now" : "next";
                  const stamp = state !== "next" ? stamps[i] : null;
                  return (
                    <li key={label} data-state={state}>
                      <span className="dot">{state === "done" && <Check size={13} weight="bold" />}</span>
                      {label}
                      {stamp && <time dateTime={stamp}>{when(stamp)}</time>}
                    </li>
                  );
                })
              )}
            </Steps>
          </Card>
        </Col>

        <Col $single={hasMap}>
          <Card $order={2} aria-label="Fare">
            <h2>{isDriver ? receiveTitle : "What you pay"}</h2>
            <Lines>
              <div>
                <dt>
                  {seatLine
                    ? `${booking.seats_booked} ${seatWord} at ${formatCurrency(perSeat)}`
                    : `${booking.seats_booked} ${seatWord}`}
                </dt>
                <dd>{formatCurrency(subtotal)}</dd>
              </div>
              {fee != null && !isDriver && (
                <div>
                  <dt>Kipita service fee{feePct != null ? ` (${feePct}%)` : ""}</dt>
                  <dd>{formatCurrency(fee)}</dd>
                </div>
              )}
              <div className="total">
                <dt>{isDriver ? receiveTotal : "Total"}</dt>
                <dd style={stopped || lapsed ? { textDecoration: "line-through", color: "var(--n-muted)" } : undefined}>
                  {formatCurrency(isDriver ? subtotal : booking.total_price)}
                </dd>
              </div>
            </Lines>
            <Hint $warn={due || (stopped && booking.refunded_amount == null && !!booking.paid_at)}>
              {due && isDriver ? <Clock size={18} /> : <Lock size={18} />}
              {note}
            </Hint>
            {runnable && (
              <Pay
                type="button"
                onClick={(e) => run(e.currentTarget)}
                disabled={busy !== null}
                aria-busy={busy === "run"}
              >
                {busy === "run" ? <ButtonOrb job="committing" /> : paid ? <NavigationArrow size={18} weight="bold" /> : <Flag size={18} weight="bold" />}
                {paid ? "Start trip" : "End trip"}
              </Pay>
            )}
            {due && !isDriver && (
              <Pay
                type="button"
                $quiet={side === "pay"}
                onClick={() => (side === "pay" ? setSide(null) : openSide("pay"))}
                disabled={busy !== null}
                aria-expanded={side === "pay"}
              >
                {side === "pay" ? "Close payment" : `Pay ${formatCurrency(booking.total_price)}`}
              </Pay>
            )}
          </Card>

          <Card $order={!isDriver && (live || paid) ? 0 : 3} aria-label={isDriver ? "Passenger" : "Driver"}>
            <Who>
              <Avatar name={name} src={person?.avatar_url} size={48} />
              <span>
                <b>
                  {name}
                  {person?.is_verified && <SealCheck size={16} weight="fill" role="img" aria-label="Verified" />}
                </b>
                <small>
                  {rating ? (
                    <>
                      <Star size={13} weight="fill" /> {rating}
                      {person?.total_trips ? ` · ${person.total_trips} trips` : ""}
                    </>
                  ) : isDriver ? (
                    "Passenger"
                  ) : (
                    "Driver"
                  )}
                </small>
                {!isDriver && carLine && <small>{carLine}</small>}
              </span>
              {talkable && (
                <Talk>
                  <RoundAct type="button" aria-label={`Message ${name}`} onClick={() => openSide("chat")} aria-expanded={side === "chat"}>
                    <ChatCircle size={20} />
                  </RoundAct>
                  {callable && (
                    <RoundAct type="button" aria-label={`Call ${name}`} onClick={call} disabled={calling}>
                      <Phone size={20} />
                    </RoundAct>
                  )}
                </Talk>
              )}
            </Who>
          </Card>

          <Acts $order={4}>
            {answerable ? (
              <>
                <Outline
                  type="button"
                  onClick={(e) => answer("decline", e.currentTarget)}
                  disabled={busy !== null}
                >
                  {busy === "decline" ? <ButtonOrb job="committing" /> : null}
                  Decline request
                </Outline>
                <Solid
                  type="button"
                  onClick={(e) => answer("accept", e.currentTarget)}
                  disabled={busy !== null}
                  aria-busy={busy === "accept"}
                >
                  {busy === "accept" ? <ButtonOrb job="committing" /> : null}
                  Accept request
                </Solid>
              </>
            ) : finished ? (
              !isDriver && (
                <Outline as={Link} href="/home">
                  Find another ride
                </Outline>
              )
            ) : (
              <>
                <Outline type="button" onClick={share}>
                  {copied ? <Check size={18} weight="bold" /> : <ShareNetwork size={18} />}
                  {copied ? "Link copied" : "Share ride"}
                </Outline>
                {canCancel && (
                  <Outline
                    type="button"
                    onClick={() => openSide("cancel")}
                    aria-expanded={side === "cancel"}
                    disabled={busy !== null}
                    aria-busy={busy === "cancel"}
                  >
                    {busy === "cancel" ? <ButtonOrb job="committing" /> : null}
                    Cancel ride
                  </Outline>
                )}
              </>
            )}
          </Acts>

          {error && (
            <Hint $warn $order={4} role="alert">
              {error}
            </Hint>
          )}
        </Col>
      </Grid>

      {!finished && <PushBanner />}

      <Help>
        <TripHelp booking={booking} />
      </Help>
        </SheetBody>
      </Sheet>

      {confirmNode}

    </Page>
    {sidePanel}
    </>
  );
}
