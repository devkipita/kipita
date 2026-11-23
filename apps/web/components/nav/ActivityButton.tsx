"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { m, useAnimationControls } from "motion/react";
import { ArrowRight, Bell, Checks, X } from "@/components/icons";
import { MorphMenu, morphHead } from "@/components/ui/MorphMenu";
import { CountBadge } from "@/components/ui/CountBadge";
import { RollingNumber } from "@/components/ui/Counter";
import { Drawer, DrawerBody, DrawerFooter, useIsSheet } from "@/components/ui/Drawer";
import { ActivityRow, RowList } from "@/components/notifications/ActivityRow";
import {
  ActivityEmpty,
  ActivityError,
  ActivitySkeletonRows,
} from "@/components/notifications/ActivityStates";
import { useOpenSeatRequests } from "@/components/notifications/useOpenSeatRequests";
import { useOptionalAppMode } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { bookingOf, groupByDay, settledBookings } from "@/lib/notifications/activity";
import { markAllRead, refreshNotifications } from "@/lib/notifications/store";
import { useClock } from "@/lib/notifications/useClock";
import { useNotifications } from "@/lib/notifications/useNotifications";

const PREVIEW = 8;
const DOT = 44;

const Wrap = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: ${DOT}px;
  padding: 0 16px 0 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklab, ${nocturne.onGreen} 10%, transparent);
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${nocturne.onGreen} 16%, transparent);
    }
  }
  &[aria-expanded="true"] {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 2px solid ${nocturne.lime};
    outline-offset: 3px;
  }

  .glyph {
    position: relative;
    display: inline-grid;
    width: 24px;
    height: 24px;

    > * {
      grid-area: 1 / 1;
      display: grid;
      place-items: center;
    }
  }

  .label {
    white-space: nowrap;
  }
  .label.badged {
    margin-left: 8px;
  }

  @media (max-width: 960px) {
    width: ${DOT}px;
    padding: 0;
    justify-content: center;

    .label {
      display: none;
    }
  }
`;

const HeadTrigger = styled(Trigger)`
  ${morphHead(".glyph", ".label", 24)}

  @media (max-width: 960px) {
    &[data-morph="open"] {
      clip-path: inset(-16px -16px 0 0 round ${DOT / 2}px);
    }
    &[data-morph="open"] .glyph {
      transform: none;
    }
  }
`;

const HeadBar = styled.div`
  position: absolute;
  inset: 0 ${DOT + 8}px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-left: 8px;
  opacity: 0;
  transition: opacity ${dur.press} ${ease.exit};

  &[data-open="true"] {
    opacity: 1;
    transition: opacity ${dur.state} ${ease.standard} ${dur.press};
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-open="true"] {
      transition: opacity ${dur.state} ${ease.standard};
    }
  }
`;

const Summary = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${nocturne.cream};
  white-space: nowrap;

  &[data-quiet="true"] {
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0;
    color: ${nocturne.muted};
  }
`;

const MarkAll = styled.button`
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.popoverControl};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

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
  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const SheetBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 0 4px 8px 12px;
`;

const Scroll = styled.div`
  display: grid;
  max-height: min(60vh, 560px);
  padding: 4px 4px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
`;

const Group = styled.section`
  display: grid;

  & + & {
    margin-top: 8px;
  }

  h3 {
    margin: 0;
    padding: 8px 12px 4px;
    font-size: 13px;
    font-weight: 700;
    color: ${nocturne.muted2};
  }
`;

const SheetBody = styled(DrawerBody)`
  gap: 0;
  padding: 0 8px 12px;
`;

const SheetFoot = styled(DrawerFooter)`
  padding-inline: 12px;

  > a {
    flex: 1;
  }
`;

const SeeAll = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border-radius: 16px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.greenDeep} 10%, transparent);
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

const RING = { rotate: [0, -16, 13, -9, 5, 0], transition: { duration: 0.5 } };
const SHOWN = { opacity: 1, scale: 1, rotate: 0 };

function Face({
  unread,
  closing,
  controls,
}: {
  unread: number;
  closing: boolean;
  controls?: ReturnType<typeof useAnimationControls>;
}) {
  return (
    <>
      <span className="glyph" aria-hidden="true">
        <m.span
          initial={false}
          animate={closing ? { opacity: 0, scale: 0.5, rotate: 60 } : SHOWN}
          transition={spring.morph}
        >
          <m.span animate={controls}>
            <Bell size={24} weight={unread ? "bold" : "regular"} />
          </m.span>
        </m.span>
        <m.span
          initial={false}
          animate={closing ? SHOWN : { opacity: 0, scale: 0.5, rotate: -90 }}
          transition={spring.morph}
        >
          <X size={20} weight="bold" />
        </m.span>
        {unread > 0 ? (
          <CountBadge count={unread} ring={nocturne.greenDeep} leaving={closing} />
        ) : null}
      </span>
      <span className={unread > 0 ? "label badged" : "label"}>Activity</span>
    </>
  );
}

function Tally({ unread }: { unread: number }) {
  return unread > 0 ? (
    <Summary aria-live="polite">
      <RollingNumber value={unread} ariaLabel={`${unread} new`} />
      <span aria-hidden="true">new</span>
    </Summary>
  ) : (
    <Summary data-quiet="true" aria-live="polite">
      You&apos;re all caught up
    </Summary>
  );
}

export function ActivityButton({ userId }: { userId: string }) {
  const { status, items, unread } = useNotifications(userId);
  const mode = useOptionalAppMode()?.mode ?? "passenger";
  const pathname = usePathname();
  const sheet = useIsSheet();
  const now = useClock();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ring = useAnimationControls();
  const seen = useRef<number | null>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (status !== "ready") return;
    if (seen.current !== null && unread > seen.current) void ring.start(RING);
    seen.current = unread;
  }, [status, unread, ring]);

  const close = () => setOpen(false);
  const shown = useMemo(() => (sheet ? items : items.slice(0, PREVIEW)), [sheet, items]);
  const seatsOpen = useOpenSeatRequests(shown, open);
  const settled = useMemo(() => settledBookings(items), [items]);
  const days = useMemo(() => groupByDay(shown, now || Date.now()), [shown, now]);

  const markAll =
    status === "ready" && unread > 0 ? (
      <MarkAll type="button" onClick={() => void markAllRead()}>
        <Checks size={20} weight="bold" />
        Mark all read
      </MarkAll>
    ) : null;

  const feed =
    status === "loading" || status === "idle" ? (
      <ActivitySkeletonRows rows={sheet ? 7 : 4} />
    ) : status === "error" ? (
      <ActivityError compact={!sheet} onRetry={refreshNotifications} />
    ) : shown.length === 0 ? (
      <ActivityEmpty compact={!sheet} driver={mode === "driver"} onNavigate={close} />
    ) : (
      days.map((day) => (
        <Group key={day.key} aria-label={day.label}>
          <h3>{day.label}</h3>
          <RowList>
            {day.items.map((n) => (
              <ActivityRow
                key={n.id}
                item={n}
                now={now}
                seatOpen={seatsOpen.has(bookingOf(n) ?? "")}
                settled={settled.has(bookingOf(n) ?? "")}
                onNavigate={close}
              />
            ))}
          </RowList>
        </Group>
      ))
    );

  const seeAll = (
    <SeeAll href="/notifications" onClick={close}>
      See all activity
      <ArrowRight size={20} weight="bold" />
    </SeeAll>
  );

  return (
    <Wrap>
      <Trigger
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Activity, ${unread} unread` : "Activity"}
        onClick={() => setOpen((v) => !v)}
      >
        <Face unread={unread} closing={false} controls={ring} />
      </Trigger>

      {sheet ? (
        <Drawer
          open={open}
          onClose={close}
          title="Activity"
          fill
          footer={<SheetFoot>{seeAll}</SheetFoot>}
        >
          <SheetBody>
            {status === "ready" ? (
              <SheetBar>
                <Tally unread={unread} />
                {markAll}
              </SheetBar>
            ) : null}
            {feed}
          </SheetBody>
        </Drawer>
      ) : (
        <MorphMenu
          open={open}
          onClose={close}
          triggerRef={triggerRef}
          label="Activity"
          kind="dialog"
          width={420}
          head={(shut, isOpen) => (
            <>
              <HeadBar data-open={isOpen ? "true" : "false"}>
                {status === "ready" ? <Tally unread={unread} /> : <span />}
                {markAll}
              </HeadBar>
              <HeadTrigger
                type="button"
                data-morph={isOpen ? "open" : "closed"}
                aria-expanded="true"
                aria-label="Close activity"
                onClick={shut}
              >
                <Face unread={unread} closing={isOpen} />
              </HeadTrigger>
            </>
          )}
        >
          <Scroll>{feed}</Scroll>
          {seeAll}
        </MorphMenu>
      )}
    </Wrap>
  );
}
