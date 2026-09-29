"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { ArrowLeft, CircleNotch as Loader2, Lock, MapPin, PaperPlaneTilt as Send } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { TextArea } from "@/components/home/fields";
import { createClient } from "@/lib/supabase/client";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { isDisplayableImage, wasEdited } from "@/lib/alerts/meta";
import {
  fetchAlertComments,
  fetchMyReactions,
  recordAlertView,
} from "@/lib/alerts/api";
import { addCommentAction } from "@/lib/alerts/actions";
import type { Alert, AlertComment } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { CategoryBadge } from "./CategoryBadge";
import { AlertActions } from "./AlertActions";
import { AlertEditor } from "./AlertEditor";
import { AlertOwnerMenu } from "./AlertOwnerMenu";
import { CommentRow } from "./CommentRow";

const Wrap = styled.div`
  padding-block: 18px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const TopBar = styled.div`
  position: sticky;
  top: var(--sticky-top, 0px);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  margin-bottom: 4px;
  background: ${({ theme }) => theme.color.bg}f2;
  backdrop-filter: saturate(1.2) blur(10px);

  h1 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .owner {
    margin-left: auto;
  }
`;

const Back = styled(Link)`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Focused = styled.article`
  display: grid;
  gap: 14px;
  padding-bottom: 14px;
`;

const Hero = styled.img`
  display: block;
  width: 100%;
  max-height: 340px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.sm};
`;

const Stats = styled.div`
  display: flex;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  font-size: 0.86rem;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  b {
    color: ${({ theme }) => theme.color.onSurface};
    font-weight: 700;
  }
`;

const ReplyBox = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

const ReplyMain = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;

  .row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }
`;

const RepliesHead = styled.h2`
  margin: 16px 0 0;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;

  .who-copy {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 0.93rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  .where {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 1px;
    font-size: 0.79rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Content = styled.p`
  margin: 0;
  font-size: 1.24rem;
  line-height: 1.5;
  letter-spacing: -0.01em;
  max-width: 60ch;
  color: ${({ theme }) => theme.color.onSurface};
  overflow-wrap: anywhere;
`;

const Comments = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 18px 8px;
`;

const SignedOut = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.muted};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  a {
    color: ${({ theme }) => theme.color.primary};
    font-weight: 700;
  }
`;

const Muted = styled.p`
  margin: 0;
  padding: 18px;
  text-align: center;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.muted};
`;

/**
 * One alert with its full discussion.
 *
 * The alert and comments are server-rendered; the caller's own reaction and
 * comment-likes are the only things hydrated on mount, because those are the
 * two bits of state SSR deliberately leaves blank.
 */
export function AlertThread({
  alert: initialAlert,
  initialComments,
  profile,
}: {
  alert: Alert;
  initialComments: AlertComment[];
  profile: Profile | null;
}) {
  const router = useRouter();
  const viewerId = profile?.id ?? null;

  const [alert, setAlert] = useState(initialAlert);
  const [comments, setComments] = useState(initialComments);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Personal flags only — the content itself already came from the server.
  useEffect(() => {
    if (!viewerId) return;
    let alive = true;

    void (async () => {
      try {
        const supabase = createClient();
        const [mine, hydrated] = await Promise.all([
          fetchMyReactions(supabase, [initialAlert.id], viewerId),
          fetchAlertComments(supabase, initialAlert.id, viewerId),
        ]);
        if (!alive) return;
        setAlert((a) => ({ ...a, user_reaction: mine.get(a.id) ?? null }));
        setComments(hydrated);
      } catch {
        // Keep the server-rendered view; only the heart states are missing.
      }
    })();

    return () => {
      alive = false;
    };
  }, [initialAlert.id, viewerId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const total = await recordAlertView(createClient(), initialAlert.id);
      if (alive && total != null) {
        setAlert((a) => ({ ...a, views_count: total }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialAlert.id]);

  const author = alert.user?.full_name?.trim() || "Kipita user";
  const mine = viewerId != null && alert.user_id === viewerId;

  function submit() {
    const content = draft.trim();
    if (!content || pending) return;
    setError("");

    startTransition(async () => {
      const result = await addCommentAction(alert.id, content);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
      try {
        setComments(
          await fetchAlertComments(createClient(), alert.id, viewerId),
        );
        setAlert((a) => ({ ...a, comments_count: a.comments_count + 1 }));
      } catch {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Wrap>
        <TopBar>
          <Back href="/alerts" aria-label="Back to road alerts">
            <ArrowLeft size={18} />
          </Back>
          <h1>Alert</h1>
          {mine && (
            <div className="owner">
              <AlertOwnerMenu
                alertId={alert.id}
                createdAt={alert.created_at}
                onEdit={() => setEditing(true)}
                onDeleted={() => router.push("/alerts")}
                onError={setError}
              />
            </div>
          )}
        </TopBar>

        <Focused>
          <Who>
            <Avatar name={author} src={alert.user?.avatar_url} size={44} />
            <div className="who-copy">
              <div className="name">{author}</div>
              <div className="where">
                <MapPin size={12} /> {alert.location} ·{" "}
                {shortRelativeTime(alert.created_at)}
                {wasEdited(alert) && " · Edited"}
              </div>
            </div>
            <CategoryBadge category={alert.category} />
          </Who>

          {editing ? (
            <AlertEditor
              alert={alert}
              onCancel={() => setEditing(false)}
              onSaved={(next) => {
                setAlert(next);
                setEditing(false);
              }}
            />
          ) : (
            <Content>{alert.content}</Content>
          )}

          {isDisplayableImage(alert.image_url) && (
            <Hero src={alert.image_url} alt="" />
          )}

          <Stats>
            <span>
              <b>{alert.confirms_count}</b> still here
            </span>
            <span>
              <b>{alert.cleared_count}</b> cleared
            </span>
            <span>
              <b>{comments.length}</b>{" "}
              {comments.length === 1 ? "reply" : "replies"}
            </span>
          </Stats>

          <AlertActions
            alert={alert}
            viewerId={viewerId}
            onChange={(next) => setAlert((a) => ({ ...a, ...next }))}
            onComment={() => composerRef.current?.focus()}
            onRequireAuth={() =>
              router.push(`/auth/sign-in?next=/alerts/${alert.id}`)
            }
          />
        </Focused>

        {profile ? (
          <ReplyBox>
            <Avatar name={profile.full_name} src={profile.avatar_url} size={38} />
            <ReplyMain>
              {error && <Notice $variant="error">{error}</Notice>}
              <TextArea
                ref={composerRef}
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add what you're seeing…"
                style={{ minHeight: 44, border: "none", padding: "8px 0" }}
              />
              <div className="row">
                <ButtonEl
                  type="button"
                  $compact
                  onClick={submit}
                  disabled={!draft.trim() || pending}
                >
                  {pending ? (
                    <>
                      <Loader2 size={16} /> Posting…
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Reply
                    </>
                  )}
                </ButtonEl>
              </div>
            </ReplyMain>
          </ReplyBox>
        ) : (
          <SignedOut>
            <Lock size={17} />
            <span>
              <Link href={`/auth/sign-in?next=/alerts/${alert.id}`}>
                Sign in
              </Link>{" "}
              to join the conversation.
            </span>
          </SignedOut>
        )}

        {comments.length > 0 ? (
          <>
            <RepliesHead>
              {comments.length} {comments.length === 1 ? "reply" : "replies"}
            </RepliesHead>
            <Comments>
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  viewerId={viewerId}
                  onRequireAuth={() =>
                    router.push(`/auth/sign-in?next=/alerts/${alert.id}`)
                  }
                />
              ))}
            </Comments>
          </>
        ) : (
          <Muted>No replies yet. Add what you know.</Muted>
        )}
      </Wrap>
    </>
  );
}
