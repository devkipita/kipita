"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { m, useAnimationControls } from "motion/react";
import { ArrowRight, Bell, Checks, X } from "@/components/icons";
import { MorphMenu } from "@/components/ui/MorphMenu";
import { Chip } from "@/components/ui/Chip";
import { CountBadge } from "@/components/ui/CountBadge";
import { Drawer, DrawerBody, DrawerFooter, useIsSheet } from "@/components/ui/Drawer";
import { ActivityRow } from "@/components/notifications/ActivityRow";
import {
  ActivityEmpty,
  ActivityError,
  ActivitySkeletonRows,
} from "@/components/notifications/ActivityStates";
import { useOptionalAppMode } from "@/components/nav/AppShell";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { spring } from "@/lib/motion";
import { markAllRead, refreshNotifications } from "@/lib/notifications/store";
import { useNotifications } from "@/lib/notifications/useNotifications";

const PREVIEW = 8;

const Wrap = styled.div`
  position: relative;

  @media (max-width: 599px) {
    position: static;
    --morph-right: 8px;
  }
`;

const Trigger = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 16px 0 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklab, ${nocturne.onGreen} 10%, transparent);
  color: ${nocturne.onGreen};
  font: inherit;
  font-size: 15.5px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
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

  @media (max-width: 960px) {
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;

    .label {
      display: none;
    }
  }
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 6px 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: ${nocturne.muted2};
`;

const MarkAll = styled(Chip)`
  min-height: 36px;
  padding: 4px 12px;
  font-size: 14px;
`;

const List = styled.div<{ $sheet: boolean }>`
  display: grid;
  gap: 2px;
  max-height: ${({ $sheet }) => ($sheet ? "none" : "min(58vh, 520px)")};
  overflow-y: ${({ $sheet }) => ($sheet ? "visible" : "auto")};
  overscroll-behavior: contain;
  scrollbar-width: thin;
`;

const SheetBody = styled(DrawerBody)`
  gap: 4px;
  padding: 0 12px 12px;
`;

const SheetFoot = styled(DrawerFooter)`
  padding-inline: 12px;

  > a {
    flex: 1;
    margin-top: 0;
  }
`;

const SeeAll = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 6px;
  border-radius: 14px;
  background: ${nocturne.surface2};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  transition: background ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.lime};
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
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
      <span className="label">Activity</span>

    </>
  );
}

export function ActivityButton({ userId }: { userId: string }) {
  const { status, items, unread } = useNotifications(userId);
  // No AppShell on /help and /legal, so there is no mode there: use the rider copy.
  const mode = useOptionalAppMode()?.mode ?? "passenger";
  const pathname = usePathname();
  const sheet = useIsSheet();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ring = useAnimationControls();
  const seen = useRef(unread);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (unread > seen.current) void ring.start(RING);
    seen.current = unread;
  }, [unread, ring]);

  const close = () => setOpen(false);
  const shown = sheet ? items : items.slice(0, PREVIEW);
  const itemRole = sheet ? undefined : "menuitem";

  const content = (
    <>
      {status === "ready" ? (
        <Bar>
          <span aria-live="polite">{unread ? `${unread} new` : "You're all caught up"}</span>
          <MarkAll
            type="button"
            role={itemRole}
            disabled={unread === 0}
            onClick={() => void markAllRead()}
          >
            <Checks size={16} weight="bold" />
            Mark all read
          </MarkAll>
        </Bar>
      ) : null}

      <List $sheet={sheet}>
        {status === "loading" || status === "idle" ? (
          <ActivitySkeletonRows rows={sheet ? 7 : 4} />
        ) : status === "error" ? (
          <ActivityError compact={!sheet} onRetry={refreshNotifications} />
        ) : shown.length === 0 ? (
          <ActivityEmpty compact={!sheet} driver={mode === "driver"} onNavigate={close} />
        ) : (
          shown.map((n) => (
            <ActivityRow key={n.id} item={n} inMenu={!sheet} onNavigate={close} />
          ))
        )}
      </List>
    </>
  );

  const seeAll = (
    <SeeAll href="/notifications" role={itemRole} onClick={close}>
      See all activity
      <ArrowRight size={18} weight="bold" />
    </SeeAll>
  );

  return (
    <Wrap>
      <Trigger
        ref={triggerRef}
        type="button"
        aria-haspopup={sheet ? "dialog" : "menu"}
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
          <SheetBody>{content}</SheetBody>
        </Drawer>
      ) : (
        <MorphMenu
          open={open}
          onClose={close}
          triggerRef={triggerRef}
          label="Activity"
          width={400}
          head={(shut, isOpen) => (
            <Trigger
              type="button"
              aria-expanded="true"
              aria-label="Close activity"
              tabIndex={-1}
              onClick={shut}
            >
              <Face unread={unread} closing={isOpen} />
            </Trigger>
          )}
        >
          {content}
          {seeAll}
        </MorphMenu>
      )}
    </Wrap>
  );
}
