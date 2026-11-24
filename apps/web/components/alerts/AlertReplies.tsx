"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { CaretDown, ImageSquare, Lock, PaperPlaneTilt as Send, Smiley, X } from "@/components/icons";
import { AnonAvatar } from "./AnonAvatar";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { IconAction } from "@/components/ui/Chip";
import { Popover } from "@/components/ui/Popover";
import { Shimmer } from "@/components/ui/Shimmer";
import { RollingNumber } from "@/components/ui/Counter";
import { ChatHelloArt } from "@/components/trips/CancelArt";
import { createClient } from "@/lib/supabase/client";
import { commentThreadsReady, fetchAlertComments } from "@/lib/alerts/api";
import { addCommentAction, deleteCommentAction } from "@/lib/alerts/actions";
import { REPLY_EMOJI } from "@/lib/alerts/emoji";
import { removeAlertImage, uploadAlertImage } from "@/lib/alerts/upload";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { AlertComment } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { CommentRow } from "./CommentRow";

const MAX_REPLY = 1000;

const Fill = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const Scroll = styled.div`
  display: grid;
  align-content: start;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
`;

const Dock = styled.div`
  padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

const ReplyingTo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 40px;
  font-size: 13px;
  line-height: 20px;
  color: ${nocturne.muted};

  b {
    font-weight: 700;
    color: ${nocturne.cream};
  }
  button {
    min-width: 32px;
    min-height: 32px;
    padding: 0;
  }
`;

const Thread = styled.li`
  display: grid;
  gap: 16px;
`;

const Children = styled.div`
  display: grid;
  gap: 16px;
  padding-left: 44px;
`;

const MoreReplies = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
  min-height: 32px;
  margin-left: 44px;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${nocturne.muted};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color ${dur.state} ${ease.standard},
    background-color ${dur.state} ${ease.standard};

  &::before {
    content: "";
    width: 24px;
    height: 1px;
    background: currentColor;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${nocturne.cream};
    }
  }
  &:active {
    background: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  .caret {
    transition: transform ${dur.state} ${ease.standard};
  }
  &[aria-expanded="true"] .caret {
    transform: rotate(180deg);
  }
`;

const Composer = styled.div<{ $bare: boolean }>`
  display: grid;
  gap: 8px;
  padding: ${({ $bare }) => ($bare ? "0" : "16px")};
  border: ${({ $bare }) => ($bare ? "0" : `1px solid ${nocturne.line}`)};
  border-radius: 16px;
  background: ${({ $bare }) => ($bare ? "transparent" : nocturne.surface)};

  .note {
    margin-left: 40px;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;

  > :first-child {
    margin-bottom: 8px;
  }
`;

const Field = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0;
  min-width: 0;
  min-height: 44px;
  padding: 2px 2px 2px 16px;
  border: 1px solid transparent;
  border-radius: 24px;
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  &:focus-within {
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
  textarea {
    flex: 1;
    min-width: 0;
    max-height: 120px;
    padding: 8px 0;
    border: 0;
    background: transparent;
    resize: none;
    color: ${nocturne.cream};
    caret-color: ${nocturne.accent};
    font: inherit;
    font-size: 16px;
    line-height: 24px;
  }
  textarea::placeholder {
    color: ${nocturne.muted2};
  }
  textarea:focus-visible {
    outline: none;
  }
  .left {
    align-self: center;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted2};
  }
`;

const SendButton = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${nocturne.greenDeep};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${nocturne.surface3};
    color: ${nocturne.muted2};
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Attached = styled.div`
  position: relative;
  width: 96px;
  height: 96px;
  margin-left: 40px;
  overflow: hidden;
  border-radius: 12px;
  background: ${nocturne.surface3};

  img {
    object-fit: cover;
  }
  .remove {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
  }
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 44px);
  gap: 4px;
  padding: 8px;

  @media (max-width: 859px) {
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    padding: 0;
  }
`;

const EmojiKey = styled.button`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
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

const SignedOut = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: ${nocturne.surface2};
  font-size: 15px;
  color: ${nocturne.muted};

  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const SignIn = styled(Link)`
  border-radius: 4px;
  font-weight: 700;
  color: ${nocturne.accent};
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: color ${dur.state} ${ease.standard};

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

const RepliesHead = styled.h3`
  margin: 8px 0 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${nocturne.cream};
`;

const Comments = styled.ul`
  display: grid;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const NoReplies = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 24px 16px 32px;
  text-align: center;

  svg {
    width: min(200px, 60%);
    height: auto;
    margin-bottom: 8px;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  span {
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 40px;
  gap: 12px;

  .lines {
    display: grid;
    gap: 8px;
  }
`;

const Failed = styled.div`
  display: grid;
  justify-items: start;
  gap: 12px;
`;

type Status = "ready" | "loading" | "error";

type Outgoing = {
  tempId: string;
  content: string;
  file: File | null;
  preview: string | null;
  parentId: string | null;
  createdAt: string;
  state: "sending" | "failed";
  error?: string;
};

export function AlertReplies({
  alertId,
  profile,
  initialComments,
  composerRef,
  onReplied,
  onRemoved,
  layout = "page",
  header,
}: {
  alertId: string;
  profile: Profile | null;
  initialComments?: AlertComment[];
  composerRef?: RefObject<HTMLTextAreaElement | null>;
  onReplied?: () => void;
  onRemoved?: (count: number) => void;
  layout?: "page" | "panel";
  header?: ReactNode;
}) {
  const router = useRouter();
  const viewerId = profile?.id ?? null;
  const [comments, setComments] = useState<AlertComment[]>(initialComments ?? []);
  const [status, setStatus] = useState<Status>(initialComments ? "ready" : "loading");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const ownFieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = composerRef ?? ownFieldRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLButtonElement>(null);
  const signIn = `/auth/sign-in?next=/alerts/${alertId}`;
  const remaining = MAX_REPLY - draft.length;

  const load = useCallback(async () => {
    try {
      setComments(await fetchAlertComments(createClient(), alertId, viewerId));
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "loading" ? "error" : s));
    }
  }, [alertId, viewerId]);

  useEffect(() => {
    if (initialComments && !viewerId) return;
    void load();
  }, [initialComments, viewerId, load]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft, fieldRef]);

  const previewRef = useRef<string | null>(null);
  const outboxRef = useRef<Outgoing[]>([]);

  useEffect(() => {
    previewRef.current = previewUrl;
    outboxRef.current = outbox;
  });

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      for (const o of outboxRef.current) if (o.preview) URL.revokeObjectURL(o.preview);
    },
    [],
  );

  function pickFile(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function insertEmoji(char: string) {
    const el = fieldRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = (draft.slice(0, start) + char + draft.slice(end)).slice(0, MAX_REPLY);
    setDraft(next);
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(start + char.length, start + char.length);
    });
  }

  const canSend = draft.trim().length > 0 || Boolean(file);

  function markFailed(tempId: string, message: string) {
    setOutbox((prev) =>
      prev.map((o) => (o.tempId === tempId ? { ...o, state: "failed", error: message } : o)),
    );
  }

  async function deliver(item: Outgoing) {
    if (!profile) return;
    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    if (item.file) {
      const upload = await uploadAlertImage(createClient(), item.file, profile.id);
      if (!upload.ok) {
        markFailed(item.tempId, upload.error);
        return;
      }
      imageUrl = upload.url;
      imagePath = upload.path;
    }

    const result = await addCommentAction(alertId, item.content, imageUrl, item.parentId);
    if (!result.ok) {
      if (imagePath) await removeAlertImage(createClient(), imagePath);
      markFailed(item.tempId, result.error);
      return;
    }

    onReplied?.();
    try {
      setComments(await fetchAlertComments(createClient(), alertId, viewerId));
    } catch {
      router.refresh();
    }
    setOutbox((prev) => prev.filter((o) => o.tempId !== item.tempId));
    if (item.preview) URL.revokeObjectURL(item.preview);
  }

  function submit() {
    if (!profile || !canSend) return;
    const item: Outgoing = {
      tempId: `local-${crypto.randomUUID()}`,
      content: draft.trim(),
      file,
      preview: previewUrl,
      parentId: replyTo?.id ?? null,
      createdAt: new Date().toISOString(),
      state: "sending",
    };
    setOutbox((prev) => [...prev, item]);
    setDraft("");
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyTo(null);
    setError("");
    if (item.parentId) {
      const parentId = item.parentId;
      setExpanded((prev) => new Set(prev).add(parentId));
    }
    void deliver(item);
  }

  function retry(tempId: string) {
    const item = outbox.find((o) => o.tempId === tempId);
    if (!item) return;
    const again: Outgoing = { ...item, state: "sending", error: undefined };
    setOutbox((prev) => prev.map((o) => (o.tempId === tempId ? again : o)));
    void deliver(again);
  }

  function discard(tempId: string) {
    const item = outbox.find((o) => o.tempId === tempId);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setOutbox((prev) => prev.filter((o) => o.tempId !== tempId));
  }

  async function removeReply(target: AlertComment) {
    const before = comments;
    const gone = new Set([target.id, ...comments.filter((c) => c.parent_id === target.id).map((c) => c.id)]);
    setComments((prev) => prev.filter((c) => !gone.has(c.id)));
    onRemoved?.(gone.size);
    setError("");
    const result = await deleteCommentAction(target.id);
    if (!result.ok) {
      setComments(before);
      onRemoved?.(-gone.size);
      setError(result.error);
    }
  }

  function asComment(o: Outgoing): AlertComment {
    return {
      id: o.tempId,
      alert_id: alertId,
      user_id: profile?.id ?? "",
      parent_id: o.parentId,
      content: o.content,
      image_url: null,
      likes_count: 0,
      created_at: o.createdAt,
      user: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            trusted_reporter: false,
          }
        : null,
      liked_by_me: false,
    };
  }

  function outgoingFor(o: Outgoing) {
    return {
      state: o.state,
      error: o.error,
      preview: o.preview,
      onRetry: () => retry(o.tempId),
      onDiscard: () => discard(o.tempId),
    };
  }
  const bare = layout === "panel";

  function startReply(comment: AlertComment) {
    if (!profile) {
      router.push(signIn);
      return;
    }
    const name = comment.user?.full_name?.trim().split(" ")[0] || "them";
    setReplyTo({ id: comment.parent_id ?? comment.id, name });
    requestAnimationFrame(() => fieldRef.current?.focus({ preventScroll: true }));
  }

  const threaded = commentThreadsReady();
  const outgoingById = new Map(outbox.map((o) => [o.tempId, o]));
  const all = [...comments, ...outbox.map(asComment)];
  const roots = all.filter((c) => !c.parent_id);
  const childrenOf = new Map<string, AlertComment[]>();
  for (const c of all) {
    if (!c.parent_id) continue;
    const list = childrenOf.get(c.parent_id) ?? [];
    list.push(c);
    childrenOf.set(c.parent_id, list);
  }

  const composer = profile ? (
    <Composer $bare={bare}>
      {replyTo && (
        <ReplyingTo>
          Replying to <b>{replyTo.name}</b>
          <IconAction type="button" aria-label="Stop replying" title="Stop replying" onClick={() => setReplyTo(null)}>
            <X size={16} aria-hidden />
          </IconAction>
        </ReplyingTo>
      )}
      {error && (
        <div className="note">
          <Notice $variant="error">{error}</Notice>
        </div>
      )}
      {previewUrl && (
        <Attached>
          <Image src={previewUrl} alt="Photo to send" fill unoptimized sizes="96px" />
          <IconAction
            className="remove"
            type="button"
            onClick={() => pickFile(null)}
            aria-label="Remove photo"
            title="Remove photo"
          >
            <X size={16} weight="bold" aria-hidden />
          </IconAction>
        </Attached>
      )}
      <Row>
        <AnonAvatar id={profile.id} size={32} />
        <Field>
          <textarea
            ref={fieldRef}
            rows={1}
            value={draft}
            maxLength={MAX_REPLY}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={replyTo ? `Reply to ${replyTo.name}` : "Add a reply"}
            aria-label="Your reply"
            data-autofocus
          />
          {remaining <= 100 && <span className="left">{remaining}</span>}
          <IconAction
            ref={emojiRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={emojiOpen}
            aria-label="Add emoji"
            title="Add emoji"
            onClick={() => setEmojiOpen((v) => !v)}
          >
            <Smiley size={20} aria-hidden />
          </IconAction>
          <IconAction
            type="button"
            $on={Boolean(file)}
            $tone={nocturne.accent}
            aria-label={file ? "Change photo" : "Add a photo"}
            title={file ? "Change photo" : "Add a photo"}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageSquare size={20} weight={file ? "fill" : "regular"} aria-hidden />
          </IconAction>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <SendButton
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send reply"
          title="Send reply"
        >
          <Send size={20} weight="fill" aria-hidden />
        </SendButton>
      </Row>
      <Popover
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        anchorRef={emojiRef}
        label="Add emoji"
        align="end"
        role="dialog"
      >
        <EmojiGrid>
          {REPLY_EMOJI.map((e) => (
            <EmojiKey
              key={e.label}
              type="button"
              aria-label={e.label}
              title={e.label}
              onClick={() => insertEmoji(e.char)}
            >
              {e.char}
            </EmojiKey>
          ))}
        </EmojiGrid>
      </Popover>
    </Composer>
  ) : (
    <SignedOut>
      <Lock size={20} aria-hidden />
      <span>
        <SignIn href={signIn}>Sign in to reply</SignIn> and add what you can see.
      </span>
    </SignedOut>
  );

  let list: ReactNode;
  if (status === "loading") {
    list = (
      <Comments aria-busy="true" aria-label="Loading replies">
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i}>
            <Shimmer $w="32px" $h="32px" $r="999px" />
            <div className="lines">
              <Shimmer $w="40%" $h="12px" />
              <Shimmer $w="88%" $h="14px" />
              <Shimmer $w="24%" $h="12px" />
            </div>
            <Shimmer $w="20px" $h="20px" $r="6px" />
          </SkeletonRow>
        ))}
      </Comments>
    );
  } else if (status === "error") {
    list = (
      <Failed role="alert">
        <Notice $variant="error">Replies didn&rsquo;t load. Check your connection.</Notice>
        <ButtonEl
          type="button"
          $compact
          $variant="light"
          onClick={() => {
            setStatus("loading");
            void load();
          }}
        >
          Reload replies
        </ButtonEl>
      </Failed>
    );
  } else if (all.length > 0) {
    list = (
      <>
        {layout === "page" && (
          <RepliesHead>
            <RollingNumber value={comments.length} /> {comments.length === 1 ? "reply" : "replies"}
          </RepliesHead>
        )}
        <Comments>
          {roots.map((comment) => {
            const kids = childrenOf.get(comment.id) ?? [];
            const open = expanded.has(comment.id);
            const mine = outgoingById.get(comment.id);
            return (
              <Thread key={comment.id}>
                <CommentRow
                  comment={comment}
                  viewerId={viewerId}
                  replyCount={kids.length}
                  onRequireAuth={() => router.push(signIn)}
                  onReply={threaded && !mine ? startReply : undefined}
                  onDelete={!mine && viewerId === comment.user_id ? (c) => void removeReply(c) : undefined}
                  outgoing={mine ? outgoingFor(mine) : undefined}
                />
                {open && kids.length > 0 && (
                  <Children>
                    {kids.map((kid) => {
                      const sent = outgoingById.get(kid.id);
                      return (
                        <CommentRow
                          key={kid.id}
                          comment={kid}
                          viewerId={viewerId}
                          nested
                          onRequireAuth={() => router.push(signIn)}
                          onReply={sent ? undefined : startReply}
                          onDelete={!sent && viewerId === kid.user_id ? (c) => void removeReply(c) : undefined}
                          outgoing={sent ? outgoingFor(sent) : undefined}
                        />
                      );
                    })}
                  </Children>
                )}
                {kids.length > 0 && (
                  <MoreReplies
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(comment.id)) next.delete(comment.id);
                        else next.add(comment.id);
                        return next;
                      })
                    }
                  >
                    {open ? (
                      "Hide replies"
                    ) : (
                      <>
                        View <RollingNumber value={kids.length} /> {kids.length === 1 ? "reply" : "replies"}
                      </>
                    )}
                    <CaretDown size={16} className="caret" aria-hidden />
                  </MoreReplies>
                )}
              </Thread>
            );
          })}
        </Comments>
      </>
    );
  } else {
    list = (
      <NoReplies>
        <ChatHelloArt />
        <b>No replies yet</b>
        <span>Tell other drivers if it is still there.</span>
      </NoReplies>
    );
  }

  if (layout === "panel") {
    return (
      <Fill>
        <Scroll>
          {header}
          {list}
        </Scroll>
        <Dock>{composer}</Dock>
      </Fill>
    );
  }

  return (
    <>
      {header}
      {composer}
      {list}
    </>
  );
}
