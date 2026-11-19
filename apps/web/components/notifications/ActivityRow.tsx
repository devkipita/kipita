"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import { m } from "motion/react";
import { ArrowRight, Clock } from "@/components/icons";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { activityOf, ordinal, type ActivityTone } from "@/lib/notifications/activity";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { markRead } from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";

export const TONE: Record<ActivityTone, string> = {
  urgent: `background: ${nocturne.ctaBg}; color: ${nocturne.ctaFg};`,
  celebrate: `background: ${nocturne.lime}; color: ${nocturne.greenDeep};`,
  opportunity: `background: color-mix(in oklab, ${nocturne.lime} 55%, ${nocturne.surface}); color: ${nocturne.greenDeep};`,
  done: `background: ${nocturne.green}; color: ${nocturne.onGreen};`,
  calm: `background: ${nocturne.surface2}; color: ${nocturne.accent};`,
  caution: `background: color-mix(in oklab, ${nocturne.ctaBg} 16%, ${nocturne.surface}); color: ${nocturne.danger};`,
  neutral: `background: ${nocturne.surface3}; color: ${nocturne.muted};`,
  danger: `background: color-mix(in oklab, ${nocturne.danger} 14%, ${nocturne.surface}); color: ${nocturne.danger};`,
};

const LIVENS = new Set<ActivityTone>(["opportunity", "calm", "caution", "neutral"]);

const STAGGER = [0, 40, 75, 105, 130, 150];

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

type RowProps = { $unread: boolean; $celebrate: boolean; $i: number };

const rowBase = css<RowProps>`
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  width: 100%;
  padding: 14px 16px 14px 14px;
  border: 0;
  border-radius: 18px;
  background: ${({ $unread, $celebrate }) =>
    $celebrate
      ? `color-mix(in oklab, ${nocturne.lime} 34%, ${nocturne.surface})`
      : $unread
        ? nocturne.surface
        : "transparent"};
  box-shadow: ${({ $unread }) => ($unread ? nocturne.cardShadow : "none")};
  color: ${nocturne.cream};
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    transform ${dur.press} ${ease.standard};
  ${({ $i }) =>
    $i < STAGGER.length
      ? css`
          animation: ${rise} 280ms ${ease.enter} ${STAGGER[$i]}ms backwards;
        `
      : ""}

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 16px;
    bottom: 16px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${nocturne.accent};
    opacity: ${({ $unread, $celebrate }) => ($unread && !$celebrate ? 1 : 0)};
    transition: opacity 160ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ $celebrate }) =>
        $celebrate ? `color-mix(in oklab, ${nocturne.lime} 46%, ${nocturne.surface})` : nocturne.surface2};
    }
    &:hover [data-well][data-live="true"] {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
    }
    &:hover .go {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
    }
    &:hover .go[data-urgent="true"] {
      background: ${nocturne.greenDeep};
      color: ${nocturne.lime};
    }
    &:hover .go svg {
      transform: translateX(2px);
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
    animation: none;
    &:active {
      transform: none;
    }
  }
`;

const RowLink = styled(Link)<RowProps>`
  ${rowBase}
`;

const RowButton = styled.button<RowProps>`
  ${rowBase}
`;

const Well = styled(m.span)<{ $tone: ActivityTone }>`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  transition:
    background 160ms ease,
    color 160ms ease;
  ${({ $tone }) => TONE[$tone]}
`;

const Body = styled.span`
  display: grid;
  gap: 3px;
  min-width: 0;

  .kind {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: ${nocturne.muted2};
  }
  .title {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    line-height: 1.3;
    letter-spacing: -0.015em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.45;
    color: ${nocturne.muted};
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
`;

const Title = styled.span<{ $unread: boolean }>`
  font-weight: ${({ $unread }) => ($unread ? 800 : 650)};
`;

const Meta = styled.span`
  display: grid;
  justify-items: end;
  gap: 10px;
  padding-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: ${nocturne.muted2};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${nocturne.accent};
`;

const Go = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${nocturne.surface2};
  color: ${nocturne.greenDeep};
  font-size: 13.5px;
  font-weight: 800;
  transition:
    background 160ms ease,
    color 160ms ease;

  &[data-urgent="true"] {
    background: ${nocturne.ctaBg};
    color: ${nocturne.ctaFg};
  }

  svg {
    transition: transform 160ms ${ease.enter};
  }
`;

const Hold = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  ${({ $live }) =>
    $live
      ? `background: color-mix(in oklab, ${nocturne.ctaBg} 16%, ${nocturne.surface}); color: ${nocturne.danger};`
      : `background: ${nocturne.surface3}; color: ${nocturne.muted};`}
`;

function useMinutesLeft(iso: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const end = new Date(iso).getTime();
    if (end <= Date.now()) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= end) window.clearInterval(id);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [iso]);
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - now) / 60_000);
}

function HoldChip({ iso }: { iso: string }) {
  const left = useMinutesLeft(iso);
  if (left == null) return null;
  const live = left > 0;
  return (
    <Hold $live={live}>
      <Clock size={14} weight="bold" />
      {live ? `${left} min left to pay` : "Seat hold ran out"}
    </Hold>
  );
}

export const ActivityRow = memo(function ActivityRow({
  item,
  onNavigate,
  inMenu = false,
  index = 99,
}: {
  item: AppNotification;
  onNavigate?: () => void;
  inMenu?: boolean;
  index?: number;
}) {
  const a = activityOf(item);
  const unread = !item.read;
  const celebrate = a.kind === "milestone";
  const Icon = a.icon;
  const role = inMenu ? "menuitem" : undefined;
  const expired = a.expiresAt ? new Date(a.expiresAt).getTime() <= Date.now() : false;
  const action = a.kind === "pay_due" && expired ? "View booking" : a.action;
  const stamp = new Date(item.created_at).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const content: ReactNode = (
    <>
      <Well
        $tone={a.tone}
        data-well=""
        data-live={LIVENS.has(a.tone) ? "true" : "false"}
        aria-hidden="true"
        initial={celebrate && unread ? { scale: 0.7, rotate: -18 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.success}
      >
        <Icon size={22} weight={unread ? "bold" : "regular"} />
      </Well>
      <Body>
        <span className="kind">
          {celebrate && a.milestone ? `${ordinal(a.milestone)} ride complete` : a.label}
        </span>
        <span className="title">
          <Title $unread={unread}>{item.title}</Title>
        </span>
        {item.body ? <span className="text">{item.body}</span> : null}
        {a.expiresAt || (action && a.href) ? (
          <span className="foot">
            {a.expiresAt ? <HoldChip iso={a.expiresAt} /> : null}
            {action && a.href ? (
              <Go className="go" data-urgent={a.tone === "urgent" && !expired ? "true" : "false"}>
                {action}
                <ArrowRight size={15} weight="bold" />
              </Go>
            ) : null}
          </span>
        ) : null}
      </Body>
      <Meta>
        <time dateTime={item.created_at} title={stamp}>
          {shortRelativeTime(item.created_at)}
        </time>
        {unread ? <Dot aria-label="Unread" role="img" /> : null}
      </Meta>
    </>
  );

  const onClick = () => {
    if (unread) void markRead(item.id);
    onNavigate?.();
  };

  const props = { $unread: unread, $celebrate: celebrate, $i: index, role, onClick };

  return a.href ? (
    <RowLink href={a.href} {...props}>
      {content}
    </RowLink>
  ) : (
    <RowButton type="button" {...props}>
      {content}
    </RowButton>
  );
});
