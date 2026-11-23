"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { X } from "@/components/icons";
import { Drawer, useIsSheet } from "@/components/ui/Drawer";
import { IconAction } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { createClient } from "@/lib/supabase/client";
import { recordOneView, ALERT_VIEWED_EVENT } from "@/lib/alerts/api";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { nocturne } from "@/lib/nocturne";
import type { Alert } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { AlertReplies } from "./AlertReplies";
import { CategoryBadge } from "./CategoryBadge";
import { useAlertsDock } from "./AlertsColumns";

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 8px 8px 8px 16px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  .count {
    display: inline-flex;
    align-items: center;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.muted};
  }
`;

const Summary = styled.div`
  display: grid;
  gap: 8px;
  margin: -16px -16px 0;
  padding: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: ${nocturne.muted};
  }
  h3 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 16px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
  p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    font-size: 14px;
    line-height: 20px;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
  }
`;

export function AlertRepliesPanel({
  alert,
  profile,
  onClose,
  onChange,
}: {
  alert: Alert | null;
  profile: Profile | null;
  onClose: () => void;
  onChange: (next: Alert) => void;
}) {
  const sheet = useIsSheet();
  const { slot, dock } = useAlertsDock();
  const [shown, setShown] = useState<Alert | null>(alert);
  if (alert && alert !== shown) setShown(alert);
  const openId = alert?.id ?? null;
  const isOpen = openId !== null;
  const latest = useRef({ alert, onChange, onClose });
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    latest.current = { alert, onChange, onClose };
  });

  useEffect(() => {
    dock(isOpen && !sheet);
  }, [dock, isOpen, sheet]);

  useEffect(() => () => dock(false), [dock]);

  useEffect(() => {
    if (!isOpen || sheet) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus({ preventScroll: true });
    };
  }, [isOpen, sheet]);

  useEffect(() => {
    if (!slot || !isOpen) return;
    const t = window.setTimeout(() => {
      slot.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, [slot, isOpen, openId]);

  useEffect(() => {
    if (!openId) return;
    let alive = true;
    void (async () => {
      const total = await recordOneView(createClient(), openId);
      window.dispatchEvent(new CustomEvent(ALERT_VIEWED_EVENT, { detail: openId }));
      const now = latest.current.alert;
      if (alive && total != null && now?.id === openId) {
        latest.current.onChange({ ...now, views_count: total });
      }
    })();
    return () => {
      alive = false;
    };
  }, [openId]);

  const current = alert ?? shown;
  if (!current) return null;
  const place = current.location.split(",")[0]?.trim() || current.location;

  const replies = (
    <AlertReplies
      key={current.id}
      alertId={current.id}
      profile={profile}
      layout="panel"
      onReplied={() => onChange({ ...current, comments_count: current.comments_count + 1 })}
      onRemoved={(n) => onChange({ ...current, comments_count: Math.max(0, current.comments_count - n) })}
      header={
        <Summary>
          <div className="head">
            <CategoryBadge category={current.category} />
            <time dateTime={current.created_at}>{shortRelativeTime(current.created_at)}</time>
          </div>
          <h3>{place}</h3>
          <p>{current.content}</p>
        </Summary>
      }
    />
  );

  if (sheet) {
    return (
      <Drawer open={isOpen} onClose={onClose} title="Replies" fill>
        {replies}
      </Drawer>
    );
  }

  if (!slot) return null;

  return createPortal(
    <>
      <Head>
        <h2>
          Replies
          <span className="count">
            <RollingNumber value={current.comments_count} />
          </span>
        </h2>
        <IconAction type="button" aria-label="Close replies" title="Close replies" onClick={onClose}>
          <X size={20} aria-hidden />
        </IconAction>
      </Head>
      {replies}
    </>,
    slot,
  );
}
