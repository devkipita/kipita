"use client";

import { useState } from "react";
import styled from "styled-components";
import { Heart } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { formatCompactNumber, isDisplayableImage } from "@/lib/alerts/meta";
import { setCommentLike } from "@/lib/alerts/api";
import { createClient } from "@/lib/supabase/client";
import type { AlertComment } from "@/lib/alerts/types";

const Row = styled.li`
  display: flex;
  gap: 12px;
  padding: 14px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;

  .head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .name {
    font-size: 0.88rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  .when {
    font-size: 0.74rem;
    color: ${({ theme }) => theme.color.muted};
  }
  p {
    margin: 4px 0 0;
    font-size: 0.91rem;
    line-height: 1.55;
    color: ${({ theme }) => theme.color.textSoft};
    overflow-wrap: anywhere;
  }
  img {
    display: block;
    margin-top: 10px;
    max-width: 100%;
    max-height: 260px;
    border-radius: ${({ theme }) => theme.radius.sm};
    object-fit: cover;
  }
`;

const Like = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 2px;
  padding: 4px 8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme, $on }) => ($on ? "#E0245E" : theme.color.muted)};
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: #e0245e;
  }
`;

export function CommentRow({
  comment,
  viewerId,
  onRequireAuth,
}: {
  comment: AlertComment;
  viewerId: string | null;
  onRequireAuth?: () => void;
}) {
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [count, setCount] = useState(comment.likes_count);

  // `liked_by_me` is false in the server render and corrected after mount, so
  // the local state has to follow the prop when it changes. See the same note
  // in AlertEngagement.
  const [synced, setSynced] = useState({
    liked: comment.liked_by_me,
    count: comment.likes_count,
  });
  if (comment.liked_by_me !== synced.liked || comment.likes_count !== synced.count) {
    setSynced({ liked: comment.liked_by_me, count: comment.likes_count });
    setLiked(comment.liked_by_me);
    setCount(comment.likes_count);
  }

  const author = comment.user?.full_name?.trim() || "Kipita user";

  async function toggle() {
    if (!viewerId) {
      onRequireAuth?.();
      return;
    }

    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      await setCommentLike(createClient(), comment.id, viewerId, next);
    } catch {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  }

  return (
    <Row>
      <Avatar name={author} src={comment.user?.avatar_url} size={34} />
      <Body>
        <div className="head">
          <span className="name">{author}</span>
          <span className="when">{shortRelativeTime(comment.created_at)}</span>
        </div>
        <p>{comment.content}</p>
        {isDisplayableImage(comment.image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.image_url} alt="" />
        )}
      </Body>
      <Like
        type="button"
        $on={liked}
        onClick={() => void toggle()}
        aria-pressed={liked}
        aria-label={liked ? "Unlike comment" : "Like comment"}
      >
        <Heart size={14} strokeWidth={2.4} fill={liked ? "currentColor" : "none"} />
        {count > 0 && formatCompactNumber(count)}
      </Like>
    </Row>
  );
}
