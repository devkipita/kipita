"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled, { useTheme } from "styled-components";
import {
  BarChart,
  BookmarkSmall,
  CheckCircle,
  HeartSmall,
  Message,
  ShareForward,
  Warning,
} from "@/components/icons";
import Link from "next/link";
import { Chip, IconAction } from "@/components/ui/Chip";
import { RollingNumber } from "@/components/ui/Counter";
import { createClient } from "@/lib/supabase/client";
import { confirmAlert, reactToAlert, setAlertSaved } from "@/lib/alerts/api";
import { SITE } from "@/lib/site";
import { nocturne } from "@/lib/nocturne";
import type { Alert, ConfirmKind } from "@/lib/alerts/types";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
`;

const Confirm = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const Engage = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-inline-end: -8px;
`;

function whatsappHref(alert: Alert): string {
  const url = `${SITE.websiteUrl}/alerts/${alert.id}`;
  return `https://wa.me/?text=${encodeURIComponent(`${alert.location}: ${alert.content}\n${url}`)}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function AlertActions({
  alert,
  viewerId,
  onChange,
  onRequireAuth,
  onComment,
}: {
  alert: Alert;
  viewerId: string | null;
  onMedia?: boolean;
  onChange?: (next: Alert) => void;
  onRequireAuth?: () => void;
  onComment?: () => void;
}) {
  const router = useRouter();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  async function vote(kind: ConfirmKind) {
    if (!viewerId) return onRequireAuth?.();
    if (busy) return;

    const current = alert.my_confirmation;
    const next: ConfirmKind | null = current === kind ? null : kind;

    const confirms =
      alert.confirms_count +
      (next === "still_there" ? 1 : 0) -
      (current === "still_there" ? 1 : 0);
    const cleared =
      alert.cleared_count +
      (next === "cleared" ? 1 : 0) -
      (current === "cleared" ? 1 : 0);

    onChange?.({
      ...alert,
      my_confirmation: next,
      confirms_count: Math.max(0, confirms),
      cleared_count: Math.max(0, cleared),
    });

    setBusy(true);
    try {
      await confirmAlert(createClient(), alert.id, viewerId, next);
    } catch {
      onChange?.(alert);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike() {
    if (!viewerId) return onRequireAuth?.();

    const liked = alert.user_reaction === "heart";
    const next = liked ? null : "heart";
    const delta = liked ? -1 : alert.user_reaction ? 0 : 1;

    onChange?.({
      ...alert,
      user_reaction: next,
      reactions_count: Math.max(0, alert.reactions_count + delta),
    });

    try {
      await reactToAlert(createClient(), alert.id, viewerId, next);
    } catch {
      onChange?.(alert);
    }
  }

  async function toggleSave() {
    if (!viewerId) return onRequireAuth?.();
    const next = !alert.saved_by_me;
    onChange?.({ ...alert, saved_by_me: next });
    try {
      await setAlertSaved(createClient(), alert.id, viewerId, next);
    } catch {
      onChange?.(alert);
    }
  }

  function stop(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const still = alert.my_confirmation === "still_there";
  const clear = alert.my_confirmation === "cleared";
  const liked = alert.user_reaction === "heart";

  return (
    <Bar>
      <Confirm role="group" aria-label="Is it still there?">
        <Chip
          type="button"
          $tone="warning"
          $selected={still}
          aria-pressed={still}
          aria-label={`Still there, ${plural(alert.confirms_count, "person says", "people say")} so`}
          onClick={(e) => {
            stop(e);
            void vote("still_there");
          }}
        >
          <Warning size={16} weight={still ? "fill" : "regular"} aria-hidden />
          Still there
          {alert.confirms_count > 0 && <RollingNumber value={alert.confirms_count} />}
        </Chip>
        <Chip
          type="button"
          $tone="success"
          $selected={clear}
          aria-pressed={clear}
          aria-label={`Cleared, ${plural(alert.cleared_count, "person says", "people say")} so`}
          onClick={(e) => {
            stop(e);
            void vote("cleared");
          }}
        >
          <CheckCircle size={16} weight={clear ? "fill" : "regular"} aria-hidden />
          Cleared
          {alert.cleared_count > 0 && <RollingNumber value={alert.cleared_count} />}
        </Chip>
      </Confirm>

      <Engage>
        <IconAction
          type="button"
          $large
          $on={liked}
          $tone={nocturne.danger}
          $fill={theme.color.errorContainer}
          $ink={theme.color.onErrorContainer}
          aria-pressed={liked}
          aria-label={liked ? `Unlike, ${plural(alert.reactions_count, "like", "likes")}` : `Like, ${plural(alert.reactions_count, "like", "likes")}`}
          title={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            stop(e);
            void toggleLike();
          }}
        >
          <HeartSmall size={20} weight={liked ? "fill" : "regular"} aria-hidden />
          {alert.reactions_count > 0 && <RollingNumber value={alert.reactions_count} />}
        </IconAction>
        <IconAction
          type="button"
          $large
          $fill={theme.color.infoContainer}
          $ink={theme.color.onInfoContainer}
          aria-label={`Reply, ${plural(alert.comments_count, "reply", "replies")}`}
          title="Reply"
          onClick={(e) => {
            stop(e);
            if (onComment) onComment();
            else router.push(`/alerts/${alert.id}`);
          }}
        >
          <Message size={20} aria-hidden />
          {alert.comments_count > 0 && <RollingNumber value={alert.comments_count} />}
        </IconAction>
        <IconAction
          as={Link}
          $large
          $fill={theme.color.tertiaryContainer}
          $ink={theme.color.onTertiaryContainer}
          href={`/alerts/${alert.id}`}
          aria-label={`Views, ${plural(alert.views_count, "view", "views")}`}
          title={plural(alert.views_count, "view", "views")}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            if (!onComment || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            onComment();
          }}
        >
          <BarChart size={20} aria-hidden />
          <RollingNumber value={alert.views_count} />
        </IconAction>
        <IconAction
          type="button"
          $large
          $on={alert.saved_by_me}
          $tone={nocturne.accent}
          $fill={theme.color.secondaryContainer}
          $ink={theme.color.onSecondaryContainer}
          aria-pressed={alert.saved_by_me}
          aria-label={alert.saved_by_me ? "Remove from saved" : "Save alert"}
          title={alert.saved_by_me ? "Remove from saved" : "Save alert"}
          onClick={(e) => {
            stop(e);
            void toggleSave();
          }}
        >
          <BookmarkSmall size={20} weight={alert.saved_by_me ? "fill" : "regular"} aria-hidden />
        </IconAction>
        <IconAction
          as="a"
          $large
          $fill={theme.color.successContainer}
          $ink={theme.color.onSuccessContainer}
          href={whatsappHref(alert)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <ShareForward size={20} aria-hidden />
        </IconAction>
      </Engage>
    </Bar>
  );
}
