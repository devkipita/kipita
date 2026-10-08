"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled, { useTheme } from "styled-components";
import {
  BarChart,
  BookmarkSmall as Bookmark,
  CheckSmall as Check,
  ProhibitedSmall as CircleSlash,
  HeartSmall as Heart,
  Message as MessageCircle,
  ShareSmall as Share2,
} from "@/components/icons";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { createClient } from "@/lib/supabase/client";
import { confirmAlert, reactToAlert, setAlertSaved } from "@/lib/alerts/api";
import { formatCompactNumber } from "@/lib/alerts/meta";
import { SITE } from "@/lib/site";
import type { Alert, ConfirmKind } from "@/lib/alerts/types";

const Bar = styled.div<{ $onMedia: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;

  --ink: ${({ theme, $onMedia }) =>
    $onMedia ? "#ffffff" : theme.color.onSurfaceVariant};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;

  .group {
    display: flex;
    align-items: center;
    gap: 2px;
  }
`;

const Confirms = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
`;

/* Text actions: no outline at rest, a pill on hover, colour change when set. */
const Pill = styled.button<{ $active?: boolean; $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, $accent }) => ($active ? $accent : "var(--ink)")};
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  svg {
    flex: none;
  }
  &:hover,
  &:focus-visible {
    color: ${({ $accent }) => $accent};
    background: color-mix(in srgb, ${({ $accent }) => $accent} 14%, transparent);
  }
  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent};
    outline-offset: 1px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Action = styled.button<{ $active?: boolean; $accent?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  min-width: 40px;
  justify-content: center;
  padding: 0 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  font: inherit;
  font-size: 0.83rem;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, $accent }) =>
    $active && $accent ? $accent : "var(--ink)"};
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  svg {
    flex: none;
  }

  &:hover:not(:disabled),
  &:focus-visible {
    color: ${({ $accent }) => $accent ?? "var(--ink)"};
    background: ${({ $accent }) =>
      `color-mix(in srgb, ${$accent ?? "var(--ink)"} 16%, transparent)`};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Stat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 10px;
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--ink);

  svg {
    flex: none;
  }
`;

/**
 * A red heart for "like" is a cross-app convention, so it stays a fixed value
 * for the same reason ALERT_META's category hexes do. Everything else reads
 * from the theme's semantic roles.
 */
const LIKE = "#E0245E";

function whatsappHref(alert: Alert): string {
  const url = `${SITE.websiteUrl}/alerts/${alert.id}`;
  return `https://wa.me/?text=${encodeURIComponent(`${alert.location}: ${alert.content}\n${url}`)}`;
}

export function AlertActions({
  alert,
  viewerId,
  onMedia = false,
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

  // A like is the `heart` reaction row mobile already writes, so the two
  // clients stay in sync and `reactions_count` keeps its existing meaning.
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
    <Bar $onMedia={onMedia}>
      <Confirms>
        <Pill
          type="button"
          $active={still}
          $accent={onMedia ? "#ffffff" : theme.color.success}
          aria-pressed={still}
          aria-label={`Still here. ${alert.confirms_count} confirmed.`}
          onClick={(e) => {
            stop(e);
            void vote("still_there");
          }}
        >
          <Check size={18} />
          Still here
          {alert.confirms_count > 0 &&
            ` ${formatCompactNumber(alert.confirms_count)}`}
        </Pill>
        <Pill
          type="button"
          $active={clear}
          $accent={onMedia ? "#ffffff" : theme.color.info}
          aria-pressed={clear}
          aria-label={`Cleared. ${alert.cleared_count} reported clear.`}
          onClick={(e) => {
            stop(e);
            void vote("cleared");
          }}
        >
          <CircleSlash size={18} />
          Cleared
          {alert.cleared_count > 0 &&
            ` ${formatCompactNumber(alert.cleared_count)}`}
        </Pill>
      </Confirms>

      <Row>
        <div className="group">
          <Action
            type="button"
            $active={liked}
            $accent={LIKE}
            aria-pressed={liked}
            aria-label={`Like. ${alert.reactions_count} likes.`}
            onClick={(e) => {
              stop(e);
              void toggleLike();
            }}
          >
            <Heart size={20} weight={liked ? "fill" : "regular"} />
            {alert.reactions_count > 0 &&
              formatCompactNumber(alert.reactions_count)}
          </Action>
          <Action
            type="button"
            aria-label={`Reply. ${alert.comments_count} replies.`}
            onClick={(e) => {
              stop(e);
              if (onComment) onComment();
              else router.push(`/alerts/${alert.id}`);
            }}
          >
            <MessageCircle size={20} />
            {alert.comments_count > 0 &&
              formatCompactNumber(alert.comments_count)}
          </Action>
          <Stat
            title={`${alert.views_count} ${alert.views_count === 1 ? "view" : "views"}`}
          >
            <BarChart size={20} aria-hidden="true" />
            <VisuallyHidden>Views: </VisuallyHidden>
            {formatCompactNumber(alert.views_count)}
          </Stat>
        </div>
        <div className="group">
          <Action
            type="button"
            $active={alert.saved_by_me}
            $accent={theme.color.tertiary}
            aria-pressed={alert.saved_by_me}
            aria-label={alert.saved_by_me ? "Saved" : "Save this alert"}
            onClick={(e) => {
              stop(e);
              void toggleSave();
            }}
          >
            <Bookmark
              size={20}
              weight={alert.saved_by_me ? "fill" : "regular"}
            />
          </Action>
          <Action
            as="a"
            href={whatsappHref(alert)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on WhatsApp"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Share2 size={20} />
          </Action>
        </div>
      </Row>
    </Bar>
  );
}
