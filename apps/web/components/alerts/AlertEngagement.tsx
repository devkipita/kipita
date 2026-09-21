"use client";

import { useState } from "react";
import styled from "styled-components";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCompactNumber, REACTION_META } from "@/lib/alerts/meta";
import { reactToAlert } from "@/lib/alerts/api";
import { REACTION_KEYS, type Alert, type ReactionKey } from "@/lib/alerts/types";

const Bar = styled.div<{ $onMedia: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  --ink: ${({ theme, $onMedia }) => ($onMedia ? "#ffffff" : theme.color.muted)};
  --chip: ${({ theme, $onMedia }) =>
    $onMedia ? "rgba(0,0,0,0.38)" : theme.color.surface2};
`;

const Action = styled.button<{ $active?: boolean; $accent?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border: none;
  border-radius: 999px;
  background: var(--chip);
  color: ${({ $active, $accent }) => ($active && $accent ? $accent : "var(--ink)")};
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ $accent }) => $accent ?? "var(--ink)"};
  }
  svg {
    flex: none;
  }
`;

const Picker = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

/**
 * Reactions and the comment count.
 *
 * `compact` is the feed row — the picker collapses to whichever reaction the
 * viewer chose (or a thumbs-up prompt). The full four-way picker appears on the
 * detail page.
 *
 * The optimistic count arithmetic mirrors mobile exactly, and it has to: the
 * `trg_alert_reactions` counter trigger fires on INSERT and DELETE only, so
 * swapping one reaction for another is an UPDATE and must not move the total.
 */
export function AlertEngagement({
  alert,
  viewerId,
  compact = false,
  onMedia = false,
  onComment,
  onRequireAuth,
}: {
  alert: Alert;
  viewerId: string | null;
  compact?: boolean;
  onMedia?: boolean;
  onComment?: () => void;
  onRequireAuth?: () => void;
}) {
  const [reaction, setReaction] = useState<string | null>(alert.user_reaction);
  const [count, setCount] = useState(alert.reactions_count);

  // The server render can't know the viewer's own reaction, so the feed
  // re-fetches it after mount. Without this, `useState`'s initial value would
  // win forever and a hydrated reaction would never appear. Adjusting during
  // render (rather than in an effect) avoids a flash of the stale value.
  const [synced, setSynced] = useState({
    reaction: alert.user_reaction,
    count: alert.reactions_count,
  });
  if (
    alert.user_reaction !== synced.reaction ||
    alert.reactions_count !== synced.count
  ) {
    setSynced({ reaction: alert.user_reaction, count: alert.reactions_count });
    setReaction(alert.user_reaction);
    setCount(alert.reactions_count);
  }

  async function apply(next: ReactionKey) {
    if (!viewerId) {
      onRequireAuth?.();
      return;
    }

    const isSame = reaction === next;
    const value = isSame ? null : next;
    // -1 clearing, 0 swapping one emoji for another, +1 first reaction.
    const delta = isSame ? -1 : reaction ? 0 : 1;

    const previous = { reaction, count };
    setReaction(value);
    setCount((c) => Math.max(0, c + delta));

    try {
      await reactToAlert(createClient(), alert.id, viewerId, value);
    } catch {
      setReaction(previous.reaction);
      setCount(previous.count);
    }
  }

  const shown: ReactionKey[] = compact
    ? [(reaction as ReactionKey) ?? "thumbs_up"]
    : [...REACTION_KEYS];

  return (
    <Bar $onMedia={onMedia}>
      <Picker>
        {shown.map((key) => {
          const meta = REACTION_META[key] ?? REACTION_META.thumbs_up;
          const Icon = meta.icon;
          const active = reaction === key;
          return (
            <Action
              key={key}
              type="button"
              $active={active}
              $accent={meta.color}
              aria-pressed={active}
              aria-label={meta.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void apply(key);
              }}
            >
              <Icon
                size={15}
                strokeWidth={2.4}
                fill={active ? "currentColor" : "none"}
              />
              {compact && formatCompactNumber(count)}
            </Action>
          );
        })}
      </Picker>

      {!compact && (
        <Action as="span" style={{ cursor: "default" }}>
          {formatCompactNumber(count)} {count === 1 ? "reaction" : "reactions"}
        </Action>
      )}

      <Action
        type="button"
        aria-label="Comments"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onComment?.();
        }}
      >
        <MessageCircle size={15} strokeWidth={2.4} />
        {formatCompactNumber(alert.comments_count)}
      </Action>
    </Bar>
  );
}
