"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { ArrowLeft, Loader2, Lock, MapPin, Send } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { Avatar } from "@/components/profile/Avatar";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { TextArea } from "@/components/home/fields";
import { createClient } from "@/lib/supabase/client";
import { shortRelativeTime } from "@/lib/notifications/meta";
import { isDisplayableImage } from "@/lib/alerts/meta";
import { fetchAlertComments, fetchMyReactions } from "@/lib/alerts/api";
import { addCommentAction } from "@/lib/alerts/actions";
import type { Alert, AlertComment } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { CategoryBadge } from "./CategoryBadge";
import { AlertEngagement } from "./AlertEngagement";
import { CommentRow } from "./CommentRow";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 640px;
  margin: 0 auto;
  padding: 18px clamp(16px, 4vw, 28px) 72px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  padding: 8px 14px 8px 10px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSoft};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Card = styled.section`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
`;

const Hero = styled.img`
  display: block;
  width: 100%;
  max-height: 340px;
  object-fit: cover;
`;

const Inner = styled.div`
  padding: 18px;
  display: grid;
  gap: 14px;
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
  font-size: 1rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.text};
  overflow-wrap: anywhere;
`;

const Comments = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 18px 8px;
`;

const CommentsHead = styled.h2`
  margin: 0;
  padding: 16px 18px 0;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
`;

const Composer = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px 18px 18px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

const SignedOut = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
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
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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

  const author = alert.user?.full_name?.trim() || "Kipita user";

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
    <Page>
      <AppHeader
        name={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        userId={profile?.id}
        showProfileChip={!!profile}
      />
      <Wrap>
        <Back href="/alerts">
          <ArrowLeft size={17} strokeWidth={2.4} /> Road alerts
        </Back>

        <Card>
          {isDisplayableImage(alert.image_url) && (
            <Hero src={alert.image_url} alt="" />
          )}
          <Inner>
            <Who>
              <Avatar name={author} src={alert.user?.avatar_url} size={42} />
              <div className="who-copy">
                <div className="name">{author}</div>
                <div className="where">
                  <MapPin size={12} strokeWidth={2.6} /> {alert.location} ·{" "}
                  {shortRelativeTime(alert.created_at)}
                </div>
              </div>
              <CategoryBadge category={alert.category} />
            </Who>

            <Content>{alert.content}</Content>

            <AlertEngagement
              alert={alert}
              viewerId={viewerId}
              onRequireAuth={() =>
                router.push(`/auth/sign-in?next=/alerts/${alert.id}`)
              }
            />
          </Inner>
        </Card>

        <Card>
          <CommentsHead>
            {comments.length === 0
              ? "Comments"
              : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
          </CommentsHead>

          {comments.length === 0 ? (
            <Muted>Be the first to add what you know.</Muted>
          ) : (
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
          )}

          {profile ? (
            <Composer>
              {error && <Notice $variant="error">{error}</Notice>}
              <TextArea
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add what you're seeing…"
                style={{ minHeight: 84 }}
              />
              <ButtonEl
                type="button"
                $compact
                onClick={submit}
                disabled={!draft.trim() || pending}
                style={{ justifySelf: "end" }}
              >
                {pending ? (
                  <>
                    <Loader2 size={17} strokeWidth={2.4} /> Posting…
                  </>
                ) : (
                  <>
                    <Send size={17} strokeWidth={2.4} /> Comment
                  </>
                )}
              </ButtonEl>
            </Composer>
          ) : (
            <SignedOut>
              <Lock size={17} strokeWidth={2.4} />
              <span>
                <Link href={`/auth/sign-in?next=/alerts/${alert.id}`}>
                  Sign in
                </Link>{" "}
                to join the conversation.
              </span>
            </SignedOut>
          )}
        </Card>
      </Wrap>
    </Page>
  );
}
