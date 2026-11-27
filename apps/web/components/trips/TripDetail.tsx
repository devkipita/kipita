"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { ArrowLeft, CaretRight, ChatCircle, Check, CheckCircle, Clock, Flag, Lock, Phone, SealCheck, ShareForward, Star, X } from "@/components/icons";
import { contactPhoneAction, markArrivedAction } from "@/lib/trips/journey-actions";
import { completeTripAction, startTripAction } from "@/lib/trips/trip-actions";
import { reportProblemAction } from "@/lib/trips/boarding-actions";
import type { ProblemKind } from "@/lib/trips/problems";
import dynamic from "next/dynamic";
import type { TripRoute } from "@/lib/maps/types";
import { ArrivedStatus, LiveStatus, useLiveEta } from "./LiveCard";
import { useTripLocation } from "@/lib/trips/live";
import { RouteMap } from "./RouteMap";

const ChatPanel = dynamic(() => import("./ChatSheet"), { ssr: false });
import { Avatar } from "@/components/profile/Avatar";
import { ContentWidth } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { formatCurrency, formatTripDate, formatTripTime } from "@/lib/trips/format";
import { cancellationRuleLines, freeUntil, noShowOpensAt, type CancellationConfig } from "@kipita/shared";
import {
  cancelBookingAction,
  disputeNoShowAction,
  getCancellationQuoteAction,
  markNoShowAction,
  type CancellationQuoteView,
} from "@/lib/trips/booking-actions";
import { answerSeatRequestAction } from "@/lib/trips/request-actions";
import { useBookingStream } from "@/lib/trips/realtime";
import type { Booking, JourneyState, NoShowState } from "@/lib/trips/types";
import { CancelPanel } from "./CancelPanel";
import { NoShowPanel } from "./NoShowPanel";
import { ProblemPanel } from "./ProblemPanel";
import { BoardingPanel, PickupCodeCard, SlideToComplete, earningsLine, useBoarding } from "./Boarding";
import { FinishScene } from "./FinishScene";
import { useSplitLayout } from "./MapSheet";
import { PersonCard } from "@/components/rides/PersonCard";
import { Drawer, DrawerBody, SIDE_PUSH, useRoomy } from "@/components/ui/Drawer";
import { RateRide } from "./RateRide";
import { PayPanel } from "./PayPanel";
import { PANEL_IN, PANEL_IN_MS, PANEL_OUT, SidePanel, type PanelMode } from "./SidePanel";
import { PushBanner } from "@/components/notifications/PushBanner";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Chip, STATUS } from "./BookingCard";
import { TripHelp } from "./TripHelp";
import { StoppedTrip } from "./StoppedTrip";

const DESK = "@media (min-width: 861px)";

const Page = styled(ContentWidth)<{ $map: boolean; $side?: boolean; $squeeze?: boolean; $split?: boolean }>`
  padding-block: 0 64px;
  padding-left: max(16px, var(--page-pad), env(safe-area-inset-left));
  padding-right: max(16px, var(--page-pad), env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  background: ${nocturne.bg};

  @media (max-width: 960px) {
    padding-bottom: calc(48px + var(--bottom-bar-space, 0px));
  }

  ${({ $map, $side, $squeeze, $split }) =>
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
      @media (min-width: 900px) {
        ${$split ? "grid-template-columns: minmax(320px, 440px) minmax(360px, 1fr) minmax(320px, 420px);" : ""}
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
    min-height: 0;
    padding-top: 0;

    > a {
      display: none;
    }
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
  gap: 16px;
  margin-top: 18px;

  ${DESK} {
    grid-template-columns: ${({ $single }) => ($single ? "minmax(0, 1fr)" : "minmax(0, 1fr) 380px")};
    align-items: start;
    gap: ${({ $single }) => ($single ? "16px" : "20px")};
  }
`;

const Col = styled.div<{ $single?: boolean }>`
  display: contents;

  ${DESK} {
    display: ${({ $single }) => ($single ? "contents" : "grid")};
    gap: 16px;
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
  justify-content: flex-end;
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
type Side = "pay" | "chat" | "cancel" | "dispute" | "problem";

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

const Dock = styled.aside`
  order: 3;
  position: sticky;
  top: calc(var(--topbar-h, 64px) + 16px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 16px;
  min-width: 0;
  max-height: calc(100dvh - var(--topbar-h, 64px) - 32px);
  margin-top: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TimelineRow = styled.button<{ $order?: number }>`
  order: ${({ $order }) => $order ?? 0};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 16px 20px;
  border: 0;
  border-radius: 20px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  span {
    display: grid;
    gap: 2px;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
  }
  small {
    font-size: 14px;
    color: ${nocturne.muted};
  }
  svg {
    flex: none;
    color: ${nocturne.muted};
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 4%, transparent);
    }
  }
  &:active {
    transform: scale(0.98);
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

const FareCard = styled.section<{ $order?: number }>`
  order: ${({ $order }) => $order ?? 0};
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: ${({ theme }) => theme.tone.amber.bg};
  color: ${({ theme }) => theme.tone.amber.on};

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: inherit;
  }
  dl dt {
    color: color-mix(in oklab, ${({ theme }) => theme.tone.amber.on} 78%, transparent);
    font-weight: 600;
  }
  dl dd,
  dl .total dt {
    color: ${({ theme }) => theme.tone.amber.on};
  }
  dl .total {
    border-top-color: color-mix(in oklab, ${({ theme }) => theme.tone.amber.on} 16%, transparent);
  }

  ${DESK} {
    padding: 24px;
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

const Slot = styled.div<{ $order: number }>`
  order: ${({ $order }) => $order};
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
  background: ${({ $warn }) =>
    $warn ? "color-mix(in oklab, var(--n-cta-bg) 14%, transparent)" : `color-mix(in oklab, ${nocturne.cream} 8%, transparent)`};
  color: ${nocturne.cream};
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  svg {
    flex: none;
  }
`;

const Settled = styled.p<{ $pending?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: inherit;

  svg {
    flex: none;
    color: ${({ theme, $pending }) => ($pending ? "currentColor" : theme.color.success)};
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
  li[data-state="next"] {
    color: ${nocturne.muted2};
    font-weight: 600;
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

const Booked = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.successContainer};
  color: ${({ theme }) => theme.color.onSuccessContainer};
  font-weight: 700;
`;

const Help = styled.div`
  margin-top: clamp(32px, 5vh, 48px);
`;

const ORDER = ["requested", "pending_payment", "confirmed", "in_progress", "completed"] as const;

const RIDER_STEPS = ["Request sent", "Driver accepted", "Paid", "On the way", "Arrived"];
const DRIVER_STEPS = ["Request received", "You accepted", "Passenger paid", "On the way", "Arrived"];

function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(d);
}

function stampLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(d);
}

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
  cancelConfig,
  noShow,
  cancelledBy,
  journey,
  route,
}: {
  booking: Booking;
  viewerId: string;
  viewerPhone?: string | null;
  walletBalance: number | null;
  cancelConfig: CancellationConfig;
  noShow: NoShowState | null;
  cancelledBy: string | null;
  journey: JourneyState;
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
  const status =
    isDriver && booking.status === "confirmed" ? { ...STATUS.confirmed, label: "Passenger paid" } : STATUS[booking.status];
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

  const [busy, setBusy] = useState<"cancel" | "accept" | "decline" | "run" | "noshow" | "arrive" | "dispute" | "problem" | null>(null);
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

  const board = useBoarding(booking.trip_id, isDriver && (paid || live));

  const ridePage = booking.trip_id ? `/ride/${booking.trip_id}` : null;

  useEffect(() => {
    if (runnable && ridePage) router.prefetch(ridePage);
  }, [runnable, ridePage, router]);

  function runTrip(starting: boolean) {
    if (!booking.trip_id) return;
    setBusy("run");
    setError("");
    startTransition(async () => {
      const result = starting ? await startTripAction(booking.trip_id) : await completeTripAction(booking.trip_id);
      if (!result.ok) {
        setBusy(null);
        setError(result.error);
        return;
      }
      if (ridePage) {
        router.push(ridePage);
        return;
      }
      setBusy(null);
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
  const wide = useSplitLayout();
  const split = wide && hasMap;
  const roomy = useRoomy();
  const [timelineOpen, setTimelineOpen] = useState(false);
  const arrived = journey.arrivedAt != null;
  const loc = useTripLocation(booking.trip_id, live && !isDriver && !arrived);
  const eta = useLiveEta(booking.id, loc);

  const [snap, setSnap] = useState<Snap>("half");
  const [mapPad, setMapPad] = useState<google.maps.Padding | undefined>(undefined);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const dragged = useRef(false);

  const [mobile, setMobile] = useState(false);
  const [side, setSide] = useState<Side | null>(null);
  const [lastSide, setLastSide] = useState<Side>("pay");
  const [payBusy, setPayBusy] = useState(false);

  const departsAt = (() => {
    const d = booking.trip?.departure_date;
    const t = booking.trip?.departure_time;
    if (!d || !t) return null;
    const when = new Date(`${d}T${t.slice(0, 8)}+03:00`);
    return Number.isNaN(when.getTime()) ? null : when;
  })();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!paid && !live && booking.status !== "completed") return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [paid, live, booking.status]);

  const paidAtDate = booking.paid_at ? new Date(booking.paid_at) : null;
  const freeEnds = departsAt && paidAtDate ? freeUntil(departsAt, paidAtDate, cancelConfig) : null;
  const freeNow = freeEnds ? nowMs <= freeEnds.getTime() : false;
  const canReportNoShow =
    isDriver && paid && departsAt != null && nowMs >= noShowOpensAt(departsAt, cancelConfig).getTime();

  const markedMs = noShow?.markedAt ? new Date(noShow.markedAt).getTime() : null;
  const disputeOpen =
    markedMs != null && !noShow?.disputedAt && nowMs <= markedMs + cancelConfig.noShowDisputeHours * 3_600_000;
  const noShowNote: string | null =
    stopped && noShow?.tier === "no_show"
      ? noShow.disputedAt
        ? "Under review. Fare on hold"
        : isDriver
          ? disputeOpen
            ? `${formatCurrency(subtotal)} to your wallet in ${cancelConfig.noShowDisputeHours} hours unless disputed`
            : `${formatCurrency(subtotal)} was added to your wallet`
          : disputeOpen
            ? `Marked no-show. Dispute within ${cancelConfig.noShowDisputeHours} hours or the fare goes to your driver`
            : "No-show. The seat price went to your driver"
      : stopped && noShow?.tier === "late" && booking.refunded_amount == null
        ? "Cancelled late. No refund"
        : null;

  const [quote, setQuote] = useState<CancellationQuoteView | "loading" | "failed" | null>(null);
  useEffect(() => {
    if (side !== "cancel" || !paid) return;
    let current = true;
    setQuote("loading");
    getCancellationQuoteAction(booking.id).then((r) => {
      if (current) setQuote(r.ok ? r.quote : "failed");
    });
    return () => {
      current = false;
    };
  }, [side, paid, booking.id]);

  const cancelCopy: { money: string; detail: string | null; refund: boolean } = (() => {
    if (!paid) return { money: "Nothing has been charged", detail: null, refund: false };
    if (quote === "loading" || quote === null) {
      return { money: "Checking refund…", detail: null, refund: true };
    }
    if (quote === "failed") {
      return {
        money: "Couldn't check your refund",
        detail: cancellationRuleLines(cancelConfig).slice(0, 2).join(" "),
        refund: true,
      };
    }
    if (quote.tier === "free" || quote.tier === "driver") {
      return {
        money: `${formatCurrency(quote.passengerGets)} refunded to your wallet`,
        detail: "Free cancellation. Nothing is kept.",
        refund: true,
      };
    }
    if (quote.tier === "late") {
      const ended = quote.freeUntil ? `Free cancellation ended ${whenLabel(quote.freeUntil)}.` : "Free cancellation has ended.";
      const fee = `the ${formatCurrency(quote.kipitaKeeps)} service fee isn't refunded`;
      return {
        money: quote.passengerGets > 0 ? `${formatCurrency(quote.passengerGets)} refunded to your wallet` : "Nothing is refunded",
        detail:
          quote.passengerGets > 0
            ? `${ended} The other ${formatCurrency(quote.driverGets)} goes to your driver and ${fee}.`
            : `${ended} The seat price goes to your driver and ${fee}.`,
        refund: quote.passengerGets > 0,
      };
    }
    return { money: "Nothing has been charged", detail: null, refund: false };
  })();

  async function reportNoShow(anchor: Element) {
    const ok = await ask(anchor, {
      title: `Report ${firstName} as a no-show?`,
      yes: "Report no-show",
      no: "Not yet",
      danger: true,
    });
    if (!ok) return;
    setBusy("noshow");
    setError("");
    startTransition(async () => {
      const result = await markNoShowAction(booking.id);
      setBusy(null);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  async function markArrived(anchor: Element) {
    const ok = await ask(anchor, {
      title: "You've arrived?",
      yes: "I've arrived",
      no: "Not yet",
    });
    if (!ok) return;
    setBusy("arrive");
    setError("");
    startTransition(async () => {
      const result = await markArrivedAction(booking.id);
      setBusy(null);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  const [disputeError, setDisputeError] = useState("");

  function sendDispute(reason: string) {
    setBusy("dispute");
    setDisputeError("");
    startTransition(async () => {
      const result = await disputeNoShowAction(booking.id, reason);
      setBusy(null);
      if (!result.ok) {
        setDisputeError(result.error);
        return;
      }
      setSide(null);
      router.refresh();
    });
  }

  const [problemError, setProblemError] = useState("");

  function sendProblem(kind: ProblemKind, note: string) {
    setBusy("problem");
    setProblemError("");
    startTransition(async () => {
      const result = await reportProblemAction(booking.id, kind, note);
      setBusy(null);
      if (!result.ok) {
        setProblemError(result.error);
        return;
      }
      setSide(null);
      router.refresh();
    });
  }

  // A passenger can report a problem from the moment the ride starts until the fare is released.
  const releaseMs = journey.releaseDueAt ? new Date(journey.releaseDueAt).getTime() : null;
  const problemOpen =
    !isDriver &&
    !journey.problem &&
    (live || (booking.status === "completed" && journey.escrow === "held" && releaseMs != null && nowMs <= releaseMs));
  const problemNote: string | null = journey.problem
    ? journey.problem.status === "open"
      ? "Under review. Fare on hold"
      : journey.problem.outcome === "refund"
        ? "Refunded to your wallet"
        : "No problem found. Contact support if you disagree"
    : null;

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

  const pushing = hasMap && !mobile && roomy;

  useEffect(() => {
    if (!pushing || side === null) return;
    const root = document.documentElement.style;
    root.setProperty("--side-panel", `${SIDE_PUSH}px`);
    root.setProperty("--dock-w", `${SIDE_PUSH - 32}px`);
    root.setProperty("--dock-r", "16px");
    return () => {
      root.removeProperty("--side-panel");
    };
  }, [pushing, side]);

  const openSide = (s: Side) => {
    if (!mobile && !pushing && side === null) measure();
    setLastSide(s);
    setSide(s);
  };

  // Chat opens when the driver accepts (the seat is waiting for payment) and stays open once it is paid.
  const chatOpen = journey.contactOpen || booking.status === "pending_payment";

  const wantPanel: Side | null =
    params?.get("pay") === "1" ? "pay" : params?.get("chat") === "1" && chatOpen ? "chat" : null;

  useEffect(() => {
    if (!wantPanel) return;
    const frame = requestAnimationFrame(() => {
      window.history.replaceState(null, "", `/trips/${booking.id}`);
      const allowed =
        wantPanel === "pay"
          ? due && !isDriver
          : ["requested", "pending_payment", "confirmed", "in_progress", "completed"].includes(booking.status);
      if (!allowed) return;
      if (window.matchMedia("(min-width: 861px) and (max-width: 1199px)").matches) measure();
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
    if (page) page.dataset.side = side && !mobile && !pushing ? "1" : "0";
    if (!side || mobile || pushing) {
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
  }, [side, mobile, pushing, measure]);

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
      title={
        shown === "chat"
          ? name
          : shown === "cancel"
            ? "Cancel ride"
            : shown === "dispute"
              ? "Dispute no-show"
              : shown === "problem"
                ? "Report a problem"
                : "Pay for your seat"
      }
      closeLabel={
        shown === "chat" ? "Close messages" : shown === "cancel" ? "Keep ride" : shown === "dispute" || shown === "problem" ? "Close" : "Close payment"
      }
      onClose={() => setSide(null)}
      locked={
        (shown === "pay" && payBusy) ||
        (shown === "cancel" && busy === "cancel") ||
        (shown === "dispute" && busy === "dispute") ||
        (shown === "problem" && busy === "problem")
      }
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
          ruleLines={cancellationRuleLines(cancelConfig)}
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
          money={cancelCopy.money}
          detail={cancelCopy.detail}
          refund={cancelCopy.refund}
          busy={busy === "cancel"}
          error={cancelError}
          onKeep={() => setSide(null)}
          onCancel={cancel}
        />
      )}
      {shown === "dispute" && (
        <NoShowPanel busy={busy === "dispute"} error={disputeError} onBack={() => setSide(null)} onSend={sendDispute} />
      )}
      {shown === "problem" && (
        <ProblemPanel busy={busy === "problem"} error={problemError} onBack={() => setSide(null)} onSend={sendProblem} held={journey.escrow === "held"} />
      )}
      {shown === "chat" && chatOpen && (
        <ChatPanel
          open={side === "chat"}
          bookingId={booking.id}
          me={viewerId}
          otherName={name}
          otherAvatar={person?.avatar_url ?? null}
          role={isDriver ? "driver" : "passenger"}
          status={booking.status}
        />
      )}
    </SidePanel>
  );
  const [calling, setCalling] = useState(false);
  const talkable = journey.contactOpen;

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

  const released = journey.escrow === "released";
  const driverTake = journey.payout ?? subtotal;
  const driverFee = journey.payout != null ? Math.max(0, subtotal - journey.payout) : 0;
  const driverPayLine =
    booking.status !== "completed"
      ? "Paid if no dispute"
      : released
        ? "Paid to your wallet"
        : journey.escrow === "refunded" || journey.escrow === "refund_pending"
          ? `Refunded to ${firstName}`
          : journey.escrow === "held"
            ? journey.problem?.status === "open"
              ? "On hold. Problem reported"
              : "Paid if no dispute"
            : "Trip complete";
  const baseNote: string | null = due
    ? hold
      ? isDriver
        ? `Waiting for ${firstName} to pay · ${hold} left`
        : `Pay within ${hold} to keep your ${seatWord}`
      : isDriver
        ? `${firstName} didn't pay in time`
        : "Hold expired. Request again if still free"
    : booking.status === "requested"
      ? isDriver
        ? `${firstName} can message you after you accept. Number shared after payment.`
        : "Not charged until accepted"
      : live
        ? null
        : paid || booking.status === "completed"
          ? isDriver
            ? driverPayLine
            : booking.status === "completed"
              ? "Trip complete"
              : null
          : booking.refunded_amount != null
            ? `${formatCurrency(booking.refunded_amount)} refunded ${booking.refund_to === "mpesa" ? "to M-Pesa" : "to your Kipita wallet"}`
            : booking.paid_at
              ? "Refund sent to your wallet"
              : "Nothing was charged";
  const note = noShowNote ?? baseNote;
  const waiting = isDriver && (due || (!noShowNote && !released && (paid || booking.status === "completed")));

  const timeline = (
            <Steps>
              {stopped ? (
                <>
                  <li data-state="done">
                    <span className="dot">
                      <Check size={13} weight="bold" />
                    </span>
                    {labels[0]}
                    <time dateTime={booking.created_at}>{stampLabel(booking.created_at)}</time>
                  </li>
                  <li data-state="stop">
                    <span className="dot">
                      <X size={12} weight="bold" />
                    </span>
                    {booking.status === "rejected" ? "Declined" : "Cancelled"}
                    {booking.cancelled_at && <time dateTime={booking.cancelled_at}>{stampLabel(booking.cancelled_at)}</time>}
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
                      {stamp && <time dateTime={stamp}>{stampLabel(stamp)}</time>}
                    </li>
                  );
                })
              )}
            </Steps>
  );

  const right = (
    <>
          {!isDriver && paid && journey.code && (
            <Slot $order={0}>
              <PickupCodeCard code={journey.code} />
            </Slot>
          )}
          {isDriver && paid && booking.trip_id && (
            <Slot $order={2}>
              <BoardingPanel tripId={booking.trip_id} board={board} />
            </Slot>
          )}

          <FareCard $order={2} aria-label="Fare">
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
              {isDriver && driverFee > 0 && (
                <div>
                  <dt>Kipita fee</dt>
                  <dd>&minus;{formatCurrency(driverFee)}</dd>
                </div>
              )}
              <div className="total">
                <dt>{isDriver ? receiveTotal : "Total"}</dt>
                <dd>{formatCurrency(isDriver ? driverTake : booking.total_price)}</dd>
              </div>
            </Lines>
            {note &&
              (finished && journey.escrow === "released" ? (
                <Settled>
                  <CheckCircle size={20} weight="fill" aria-hidden />
                  {note}
                </Settled>
              ) : isDriver && !finished ? (
                <Settled $pending>
                  <Clock size={20} aria-hidden />
                  {note}
                </Settled>
              ) : (
                <Hint $warn={due || (stopped && booking.refunded_amount == null && !!booking.paid_at)}>
                  {waiting ? <Clock size={18} /> : <Lock size={18} />}
                  {note}
                </Hint>
              ))}
            {!isDriver && paid && freeEnds && (
              <Hint>
                <Clock size={18} />
                {freeNow
                  ? `Free cancellation until ${whenLabel(freeEnds.toISOString())}`
                  : cancelConfig.latePercent > 0
                    ? `Free cancellation ended. You get ${cancelConfig.latePercent}% back`
                    : "Free cancellation ended. No refund"}
              </Hint>
            )}
            {runnable && paid && (
              <>
                {board.summary.waiting > 0 ? (
                  <Hint $warn>
                    <Lock size={18} />
                    Check everyone in to start
                  </Hint>
                ) : (
                  <SlideToComplete
                    label="Slide to start trip"
                    busyLabel="Starting trip…"
                    busy={busy === "run"}
                    onComplete={() => runTrip(true)}
                  />
                )}
              </>
            )}
            {runnable && live && (
              <>
                <Hint>
                  <Clock size={18} />
                  {earningsLine(board.summary)}
                </Hint>
                <SlideToComplete
                  label="Slide to end trip"
                  busyLabel="Ending trip…"
                  busy={busy === "run"}
                  onComplete={() => runTrip(false)}
                />
              </>
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
          </FareCard>

          {finished && person ? (
            <Slot $order={3}>
              <PersonCard person={person} label={isDriver ? "Your passenger" : "Your driver"} role={isDriver ? "passenger" : "driver"} />
            </Slot>
          ) : (
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
              {(chatOpen || talkable) && (
                <Talk>
                  {chatOpen && (
                    <RoundAct type="button" aria-label={`Message ${name}`} onClick={() => openSide("chat")} aria-expanded={side === "chat"}>
                      <ChatCircle size={20} />
                    </RoundAct>
                  )}
                  {talkable && (
                    <RoundAct type="button" aria-label={`Call ${name}`} onClick={call} disabled={calling}>
                      <Phone size={20} />
                    </RoundAct>
                  )}
                </Talk>
              )}
            </Who>
          </Card>
          )}

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
                <>
                  {noShow?.tier === "no_show" && disputeOpen && (
                    <Outline
                      type="button"
                      onClick={() => openSide("dispute")}
                      aria-expanded={side === "dispute"}
                      disabled={busy !== null}
                    >
                      This isn't right
                    </Outline>
                  )}
                  {problemOpen && (
                    <Outline type="button" onClick={() => openSide("problem")} aria-expanded={side === "problem"} disabled={busy !== null}>
                      Report a problem
                    </Outline>
                  )}
                  <Outline as={Link} href="/home">
                    Find another ride
                  </Outline>
                </>
              )
            ) : (
              <>
                {live && !isDriver && !arrived && (
                  <Solid
                    type="button"
                    onClick={(e) => markArrived(e.currentTarget)}
                    disabled={busy !== null}
                    aria-busy={busy === "arrive"}
                  >
                    {busy === "arrive" ? <ButtonOrb job="committing" /> : null}
                    I&rsquo;ve arrived
                  </Solid>
                )}
                <Outline type="button" onClick={share}>
                  {copied ? <Check size={18} weight="bold" /> : <ShareForward size={18} />}
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
                {problemOpen && (
                  <Outline type="button" onClick={() => openSide("problem")} aria-expanded={side === "problem"} disabled={busy !== null}>
                    Report a problem
                  </Outline>
                )}
                {canReportNoShow && (
                  <Outline
                    type="button"
                    onClick={(e) => reportNoShow(e.currentTarget)}
                    disabled={busy !== null}
                    aria-busy={busy === "noshow"}
                  >
                    {busy === "noshow" ? <ButtonOrb job="committing" /> : null}
                    Passenger didn't show up
                  </Outline>
                )}
              </>
            )}
          </Acts>

          {!isDriver && problemNote && (
            <Hint $order={4}>
              <Flag size={18} />
              {problemNote}
            </Hint>
          )}

          {error && (
            <Hint $warn $order={4} role="alert">
              {error}
            </Hint>
          )}
    </>
  );

  return (
    <>
    <Page
      ref={pageRef}
      $max={split ? 1600 : hasMap ? 1320 : 1060}
      $map={hasMap}
      $split={split}
      $side={side !== null && panelMode === "map" && !pushing}
      $squeeze={squeeze}
    >
      {hasMap && (
        <MapPane data-map-pane>
          {booking.status !== "completed" && (
            <MapTop>
              <Share type="button" aria-label={copied ? "Link copied" : "Share ride"} onClick={share} $done={copied}>
                {copied ? <Check size={20} weight="bold" /> : <ShareForward size={20} />}
              </Share>
            </MapTop>
          )}
          {booking.status === "completed" ? (
            <FinishScene
              destination={destination}
              startedAt={booking.started_at}
              completedAt={booking.completed_at}
              amount={isDriver ? driverTake : booking.total_price}
              seats={booking.seats_booked}
              isDriver={isDriver}
              passengerName={isDriver ? firstName : undefined}
              arrival={isDriver ? undefined : { at: journey.arrivedAt, place: journey.arrivedPlace }}
            />
          ) : (
            <RouteMap
              route={route}
              car={loc}
              etaSeconds={eta}
              fromLabel={origin}
              toLabel={destination}
              follow={live && !arrived}
              padding={mapPad}
              onboard={live && !isDriver && !arrived}
              people={
                journey.arrivedPlace
                  ? [{ id: "arrived", lat: journey.arrivedPlace.lat, lng: journey.arrivedPlace.lng, name: "Got off here" }]
                  : undefined
              }
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
        <h1 data-bar-title="">Trip</h1>
        {!stopped && booking.status !== "completed" && (
          <Share
            type="button"
            aria-label={copied ? "Link copied" : "Share ride"}
            onClick={share}
            $done={copied}
          >
            {copied ? <Check size={20} weight="bold" /> : <ShareForward size={20} />}
          </Share>
        )}
      </Bar>

      {justBooked && (
        <Booked role="status">
          <Check size={18} weight="bold" /> You&rsquo;re booked in
        </Booked>
      )}

      {live && !isDriver && (
        <LiveWrap>
          {journey.arrivedAt ? (
            <ArrivedStatus
              from={origin}
              to={destination}
              at={journey.arrivedAt}
              approximate={journey.arrivedPlace?.approximate ?? false}
            />
          ) : (
            <LiveStatus from={origin} to={destination} loc={loc} eta={eta} />
          )}
        </LiveWrap>
      )}

      {stopped ? (
        <StoppedTrip
          booking={booking}
          viewerId={viewerId}
          cancelledBy={cancelledBy}
          noShowTier={noShow?.tier ?? null}
          moneyLine={note ?? "Nothing was charged"}
        />
      ) : (
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

          {booking.status === "completed" ? (
            <TimelineRow $order={5} type="button" aria-haspopup="dialog" aria-expanded={timelineOpen} onClick={() => setTimelineOpen(true)}>
              <span>
                <b>Trip timeline</b>
                {booking.completed_at ? <small>Completed {stampLabel(booking.completed_at)}</small> : null}
              </span>
              <CaretRight size={20} aria-hidden />
            </TimelineRow>
          ) : (
            <Card $order={5} aria-label="Progress">
              <h2>Progress</h2>
              {timeline}
            </Card>
          )}
        </Col>

        {!split && <Col $single={hasMap}>{right}</Col>}
      </Grid>
      )}

      {!finished && <PushBanner />}

      <Help>
        <TripHelp booking={booking} viewer={isDriver ? "driver" : "rider"} />
      </Help>
        </SheetBody>
      </Sheet>

      {split ? <Dock aria-label="Trip money and people">{right}</Dock> : null}

      {confirmNode}

    </Page>
    <Drawer open={timelineOpen} onClose={() => setTimelineOpen(false)} title="Trip timeline" side>
      <DrawerBody>{timeline}</DrawerBody>
    </Drawer>
    {sidePanel}
    </>
  );
}
