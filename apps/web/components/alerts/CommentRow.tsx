"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import styled from "styled-components";
import { m } from "motion/react";
import { ArrowClockwise, Check, Copy, DotsThree, HeartSmall, ShareForward, TextSelect, Trash, X } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { IconAction } from "@/components/ui/Chip";
import { useConfirm } from "@/components/ui/ConfirmPop";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { SITE } from "@/lib/site";
import { RollingNumber } from "@/components/ui/Counter";
import { tween } from "@/lib/motion";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { isDisplayableImage } from "@/lib/alerts/meta";
import { setCommentLike } from "@/lib/alerts/api";
import { createClient } from "@/lib/supabase/client";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { AlertComment } from "@/lib/alerts/types";
import { VerifiedMark } from "./VerifiedMark";

const Row = styled(m.div)<{ $nested: boolean }>`
  display: grid;
  grid-template-columns: ${({ $nested }) => ($nested ? "24px" : "32px")} minmax(0, 1fr) 40px;
  align-items: start;
  gap: 12px;
`;

const Body = styled.div`
  min-width: 0;

  .who {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .name {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: ${nocturne.muted};
  }
  p {
    margin: 0;
    font-size: 15px;
    line-height: 22px;
    color: ${nocturne.cream};
    overflow-wrap: anywhere;
    white-space: pre-line;
    user-select: text;
    -webkit-user-select: text;
  }
  .failed {
    color: ${nocturne.danger};
    font-weight: 600;
  }
  .sending {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .meta button.icon {
    min-width: 32px;
    min-height: 32px;
    padding: 0;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    font-size: 13px;
    line-height: 20px;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
`;

const Photo = styled.div`
  position: relative;
  width: 160px;
  aspect-ratio: 3 / 4;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 8px;
  background: ${nocturne.surface2};

  img {
    object-fit: cover;
  }
`;

const ReplyLink = styled.button`
  position: relative;
  min-height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: ${nocturne.muted};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: color ${dur.state} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -12px -8px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.cream};
    }
  }
  &:active {
    color: ${nocturne.cream};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Like = styled.button<{ $on: boolean }>`
  display: grid;
  justify-items: center;
  gap: 0;
  min-width: 40px;
  min-height: 44px;
  padding: 4px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  --icon-knockout: ${nocturne.surface};
  color: ${({ $on }) => ($on ? nocturne.danger : nocturne.muted)};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${({ $on }) => ($on ? nocturne.danger : nocturne.cream)};
    }
  }
  &:active {
    transform: scale(0.94);
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

const MenuItem = styled(PopoverItem)`
  &[data-tone="danger"] {
    color: ${nocturne.danger};
  }
`;

function ReplyMenu({
  comment,
  author,
  textRef,
  onDelete,
}: {
  comment: AlertComment;
  author: string;
  textRef: React.RefObject<HTMLParagraphElement | null>;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"copied" | "linked" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ask, confirmNode } = useConfirm();
  const link = `${SITE.websiteUrl}/alerts/${comment.alert_id}#reply-${comment.id}`;

  function flash(kind: "copied" | "linked") {
    setDone(kind);
    window.setTimeout(() => setDone(null), 1600);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(comment.content);
      flash("copied");
    } catch {
      setOpen(false);
    }
  }

  function select() {
    setOpen(false);
    const el = textRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  async function share() {
    const text = comment.content ? `${author}: ${comment.content}` : `Photo from ${author}`;
    if (navigator.share) {
      setOpen(false);
      try {
        await navigator.share({ text, url: link });
      } catch {
        return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      flash("linked");
    } catch {
      setOpen(false);
    }
  }

  async function remove() {
    setOpen(false);
    const ok = await ask(triggerRef.current, {
      title: "Delete this reply?",
      yes: "Delete reply",
      no: "Keep reply",
      danger: true,
    });
    if (ok) onDelete?.();
  }

  return (
    <>
      <IconAction
        ref={triggerRef}
        className="icon"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More for reply from ${author}`}
        title="More"
        onClick={() => setOpen((v) => !v)}
      >
        <DotsThree size={20} aria-hidden />
      </IconAction>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} label="Reply options" align="start">
        {comment.content && (
          <MenuItem type="button" role="menuitem" onClick={() => void copy()}>
            {done === "copied" ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />}
            {done === "copied" ? "Copied" : "Copy text"}
          </MenuItem>
        )}
        {comment.content && (
          <MenuItem type="button" role="menuitem" onClick={select}>
            <TextSelect size={20} aria-hidden />
            Select text
          </MenuItem>
        )}
        <MenuItem type="button" role="menuitem" onClick={() => void share()}>
          {done === "linked" ? <Check size={20} aria-hidden /> : <ShareForward size={20} aria-hidden />}
          {done === "linked" ? "Link copied" : "Share reply"}
        </MenuItem>
        {onDelete && (
          <MenuItem type="button" role="menuitem" data-tone="danger" onClick={() => void remove()}>
            <Trash size={20} aria-hidden />
            Delete reply
          </MenuItem>
        )}
      </Popover>
      {confirmNode}
    </>
  );
}

function optimisable(url: string) {
  return /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url);
}

export function CommentRow({
  comment,
  viewerId,
  nested = false,
  onRequireAuth,
  onReply,
  onDelete,
  outgoing,
}: {
  comment: AlertComment;
  viewerId: string | null;
  nested?: boolean;
  onRequireAuth?: () => void;
  onReply?: (comment: AlertComment) => void;
  onDelete?: (comment: AlertComment) => void;
  outgoing?: {
    state: "sending" | "failed";
    error?: string;
    preview: string | null;
    onRetry: () => void;
    onDiscard: () => void;
  };
}) {
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [count, setCount] = useState(comment.likes_count);

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
  const textRef = useRef<HTMLParagraphElement>(null);

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
    <Row
      id={outgoing ? undefined : `reply-${comment.id}`}
      $nested={nested}
      initial={outgoing ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0, transition: tween.enter }}
    >
      <Avatar name={author} src={comment.user?.avatar_url} size={nested ? 24 : 32} />
      <Body>
        <span className="who">
          <span className="name">{author}</span>
          <VerifiedMark verified={comment.user?.is_verified} />
        </span>
        {comment.content && <p ref={textRef}>{comment.content}</p>}
        {outgoing?.preview && (
          <Photo>
            <Image src={outgoing.preview} alt="Your photo" fill sizes="160px" unoptimized />
          </Photo>
        )}
        {isDisplayableImage(comment.image_url) && (
          <Photo>
            <Image
              src={comment.image_url}
              alt={`Photo from ${author}`}
              fill
              sizes="160px"
              unoptimized={!optimisable(comment.image_url)}
            />
          </Photo>
        )}
        <div className="meta">
          {outgoing?.state === "sending" && (
            <span className="sending" role="status">
              <ButtonOrb job="committing" on="surface" /> Sending
            </span>
          )}
          {outgoing?.state === "failed" && (
            <>
              <span className="failed" role="alert" title={outgoing.error}>
                Not sent
              </span>
              <IconAction
                className="icon"
                type="button"
                onClick={outgoing.onRetry}
                aria-label="Retry sending reply"
                title="Retry"
              >
                <ArrowClockwise size={16} aria-hidden />
              </IconAction>
              <IconAction
                className="icon"
                type="button"
                onClick={outgoing.onDiscard}
                aria-label="Discard reply"
                title="Discard"
              >
                <X size={16} aria-hidden />
              </IconAction>
            </>
          )}
          {!outgoing && (
            <time dateTime={comment.created_at}>{shortRelativeTime(comment.created_at)}</time>
          )}
          {onReply && (
            <ReplyLink type="button" onClick={() => onReply(comment)} aria-label={`Reply to ${author}`}>
              Reply
            </ReplyLink>
          )}
          {!outgoing && (
            <ReplyMenu
              comment={comment}
              author={author}
              textRef={textRef}
              onDelete={onDelete ? () => onDelete(comment) : undefined}
            />
          )}
        </div>
      </Body>
      {outgoing ? (
        <span aria-hidden />
      ) : (
      <Like
        type="button"
        $on={liked}
        onClick={() => void toggle()}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} reply from ${author}, ${count} ${count === 1 ? "like" : "likes"}`}
        title={liked ? "Unlike" : "Like"}
      >
        <HeartSmall size={20} weight={liked ? "fill" : "regular"} aria-hidden />
        {count > 0 && <RollingNumber value={count} />}
      </Like>
      )}
    </Row>
  );
}
