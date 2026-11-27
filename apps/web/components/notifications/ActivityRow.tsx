"use client";

import { memo, useId, useState, type MouseEvent } from "react";
import Link from "next/link";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import { CheckCircle, Clock, XCircle } from "@/components/icons";
import { Swap } from "@/components/anim/Swap";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { SrOnly } from "@/components/ui/Shimmer";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { activityOf, bookingOf, holdOpen, type ActivityRole } from "@/lib/notifications/activity";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { markRead } from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";
import { answerSeatRequestAction } from "@/lib/trips/request-actions";
import { roleColors } from "./roles";
import { settleSeatRequest, useSeatOutcome, type SeatOutcome } from "./useOpenSeatRequests";

const STAGGER = [0, 40, 70, 100, 120, 140];

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
`;

const layer = (pct: number) => `color-mix(in oklab, ${nocturne.cream} ${pct}%, transparent)`;

const TINTED: ReadonlySet<ActivityRole> = new Set(["warning", "error", "success", "lime"]);

function cardTone(theme: DefaultTheme, role: ActivityRole, unread: boolean): string {
  const base = theme.color.surfaceContainerLowest;
  if (!unread || !TINTED.has(role)) return base;
  return `color-mix(in oklab, ${roleColors(theme, role).bg} 56%, ${base})`;
}

export const RowList = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Row = styled.li<{ $role: ActivityRole; $unread: boolean; $i: number }>`
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
  border-radius: 16px;
  background-color: ${({ theme, $role, $unread }) => cardTone(theme, $role, $unread)};
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};
  ${({ $i }) =>
    $i < STAGGER.length
      ? css`
          animation: ${rise} ${dur.enter} ${ease.enter} ${STAGGER[$i]}ms backwards;
        `
      : ""}

  &:has(> [data-row-link]:active) {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:has(> [data-row-link]:active) {
      transform: none;
    }
  }
`;

export const overlayInteractive = css`
  position: absolute;
  inset: 0;
  z-index: 0;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background-color: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color ${dur.state} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: ${layer(6)};
    }
  }
  &:active {
    background-color: ${layer(10)};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const RowLink = styled(Link)`
  ${overlayInteractive}
`;

const RowButton = styled.button`
  ${overlayInteractive}
`;

const Tile = styled.span<{ $role: ActivityRole }>`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  pointer-events: none;
  background: ${({ theme, $role }) => roleColors(theme, $role).bg};
  color: ${({ theme, $role }) => roleColors(theme, $role).ink};
  --icon-knockout: ${({ theme, $role }) => roleColors(theme, $role).bg};
`;

const Body = styled.div<{ $lines: number }>`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  min-width: 0;
  pointer-events: none;

  .top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-height: 24px;
  }
  .title {
    flex: 1;
    min-width: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    line-height: 24px;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: ${({ $lines }) => $lines};
    overflow: hidden;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.muted};
    overflow-wrap: anywhere;
  }
`;

const Title = styled.span<{ $unread: boolean }>`
  font-weight: ${({ $unread }) => ($unread ? 800 : 700)};
`;

const Meta = styled.span<{ $unread: boolean }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 16px;
  font-weight: ${({ $unread }) => ($unread ? 700 : 600)};
  color: ${({ theme, $unread }) => ($unread ? theme.color.primary : nocturne.muted2)};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &[data-unread="true"]::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const Hold = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 13px;
  line-height: 16px;
  font-weight: 700;
  color: ${({ theme, $live }) => ($live ? theme.color.warning : nocturne.muted2)};
  font-variant-numeric: tabular-nums;
`;

const Answer = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 8px;
  pointer-events: auto;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const answerInteractive = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      box-shadow: inset 0 0 0 100vmax ${layer(8)};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: progress;
  }
  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const AcceptButton = styled.button`
  ${answerInteractive}
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
`;

const DeclineButton = styled.button`
  ${answerInteractive}
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  color: ${nocturne.cream};
`;

const Settled = styled.p<{ $tone: "success" | "quiet" }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-height: 40px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme, $tone }) => ($tone === "success" ? theme.color.success : nocturne.muted)};
`;

const Problem = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.error};
`;

type Step = "ask" | "accepting" | "declining" | "accepted" | "declined" | "gone";

export function SeatAnswer({
  item,
  bookingId,
  seats,
  outcome,
}: {
  item: AppNotification;
  bookingId: string;
  seats: number;
  outcome: SeatOutcome | null;
}) {
  const [pending, setPending] = useState<"ask" | "accepting" | "declining">("ask");
  const step: Step = outcome ?? pending;
  const [problem, setProblem] = useState<string | null>(null);
  const { ask, confirmNode } = useConfirm();
  const busy = step === "accepting" || step === "declining";
  const seatWord = seats === 1 ? "1 seat" : `${seats} seats`;

  async function answer(decision: "accept" | "decline") {
    setProblem(null);
    setPending(decision === "accept" ? "accepting" : "declining");
    const result = await answerSeatRequestAction(bookingId, decision);
    setPending("ask");
    if (result.ok) {
      void markRead(item.id);
      settleSeatRequest(bookingId, decision === "accept" ? "accepted" : "declined");
      return;
    }
    if (result.code === "P0002" || (result.code === "22023" && decision === "decline")) {
      void markRead(item.id);
      settleSeatRequest(bookingId, "gone");
      return;
    }
    setProblem(result.error);
  }

  async function decline(e: MouseEvent<HTMLButtonElement>) {
    const ok = await ask(e.currentTarget, {
      title: "Decline this seat request?",
      yes: "Decline request",
      no: "Keep request",
      danger: true,
    });
    if (ok) void answer("decline");
  }

  const settled = step === "accepted" || step === "declined" || step === "gone";

  return (
    <Answer>
      <Swap id={settled ? step : "ask"}>
        {step === "accepted" ? (
          <Settled $tone="success" role="status">
            <CheckCircle size={16} weight="fill" />
            Accepted. Waiting for payment
          </Settled>
        ) : step === "declined" ? (
          <Settled $tone="quiet" role="status">
            <XCircle size={16} />
            Request declined
          </Settled>
        ) : step === "gone" ? (
          <Settled $tone="quiet" role="status">
            <CheckCircle size={16} />
            Already answered
          </Settled>
        ) : (
          <Buttons>
            <AcceptButton
              type="button"
              data-quick=""
              disabled={busy}
              aria-busy={step === "accepting"}
              onClick={() => void answer("accept")}
            >
              {step === "accepting" ? (
                <>
                  <ButtonOrb job="committing" /> Accepting request
                </>
              ) : (
                `Accept ${seatWord}`
              )}
            </AcceptButton>
            <DeclineButton
              type="button"
              data-quick=""
              disabled={busy}
              aria-busy={step === "declining"}
              onClick={(e) => void decline(e)}
            >
              {step === "declining" ? (
                <>
                  <ButtonOrb job="committing" on="surface" /> Declining request
                </>
              ) : (
                "Decline request"
              )}
            </DeclineButton>
          </Buttons>
        )}
      </Swap>
      {problem ? <Problem role="alert">{problem}</Problem> : null}
      {confirmNode}
    </Answer>
  );
}

function minutesLeft(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / 60_000);
}

export const ActivityRow = memo(function ActivityRow({
  item,
  now,
  seatOpen = false,
  settled = false,
  onNavigate,
  index = 99,
  lines = 2,
}: {
  item: AppNotification;
  now: number;
  seatOpen?: boolean;
  settled?: boolean;
  onNavigate?: () => void;
  index?: number;
  lines?: number;
}) {
  const id = useId();
  const clock = now || Date.now();
  const a = activityOf(item);
  const unread = !item.read;
  const Icon = a.icon;
  const live = a.expiresAt ? holdOpen(a, clock) : false;
  const bookingId = bookingOf(item);
  const outcome = useSeatOutcome(a.kind === "seat_request" ? bookingId : null);
  const stamp = new Date(item.created_at).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const open = () => {
    if (unread) void markRead(item.id);
    onNavigate?.();
  };

  const holding = Boolean(a.expiresAt && !settled);
  const labelled = [`${id}-title`, item.body ? `${id}-text` : null, `${id}-meta`, holding ? `${id}-hold` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <Row $role={a.role} $unread={unread} $i={index}>
      {a.href ? (
        <RowLink href={a.href} data-row-link="" aria-labelledby={labelled} onClick={open} />
      ) : (
        <RowButton type="button" data-row-link="" aria-labelledby={labelled} onClick={open} />
      )}
      <Tile $role={a.role} aria-hidden="true">
        <Icon size={24} />
      </Tile>
      <Body $lines={lines}>
        <span className="top">
          <span className="title" id={`${id}-title`}>
            <Title $unread={unread}>{item.title}</Title>
          </span>
          <Meta id={`${id}-meta`} $unread={unread} data-unread={unread}>
            <time dateTime={item.created_at} title={stamp}>
              {shortRelativeTime(item.created_at, clock)}
            </time>
            {unread ? <SrOnly>Unread</SrOnly> : null}
          </Meta>
        </span>
        {item.body ? (
          <span className="text" id={`${id}-text`}>
            {item.body}
          </span>
        ) : null}
        {holding ? (
          <Hold id={`${id}-hold`} $live={live}>
            <Clock size={16} />
            {live && a.expiresAt ? `${minutesLeft(a.expiresAt, clock)} min left to pay` : "Seat hold ran out"}
          </Hold>
        ) : null}
        {(seatOpen || outcome) && bookingId ? (
          <SeatAnswer item={item} bookingId={bookingId} seats={a.seats ?? 1} outcome={outcome} />
        ) : null}
      </Body>
    </Row>
  );
});
