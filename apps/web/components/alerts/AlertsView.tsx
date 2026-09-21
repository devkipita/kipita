"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Megaphone, Plus, RotateCw } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { ButtonEl } from "@/components/ui/primitives";
import { Chip, ChipRow } from "@/components/home/fields";
import { createClient } from "@/lib/supabase/client";
import { fetchAlerts } from "@/lib/alerts/api";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import type { Alert, AlertCategory } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { AlertCard } from "./AlertCard";
import { AlertComposer } from "./AlertComposer";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 640px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 28px) 72px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const Filters = styled.div`
  margin-bottom: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Center = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 56px 20px;
  color: ${({ theme }) => theme.color.muted};

  svg.big {
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    font-size: 1.05rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

/**
 * The road-alerts feed.
 *
 * Signed-out visitors can read it — `announcements` is world-readable — and are
 * only sent to sign-in when they try to react, comment or post.
 *
 * There is no realtime here: `announcements` is not in the `supabase_realtime`
 * publication (only messages, notifications, bookings, trips and
 * wallet_transactions are), so the feed refreshes on demand instead.
 */
export function AlertsView({
  initialAlerts,
  profile,
}: {
  initialAlerts: Alert[];
  profile: Profile | null;
}) {
  const router = useRouter();
  const viewerId = profile?.id ?? null;

  const [alerts, setAlerts] = useState(initialAlerts);
  const [category, setCategory] = useState<AlertCategory | null>(null);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const [composing, setComposing] = useState(false);

  const load = useCallback(
    async (next: AlertCategory | null) => {
      setStatus("loading");
      try {
        setAlerts(
          await fetchAlerts(createClient(), { category: next, viewerId }),
        );
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [viewerId],
  );

  // The server render can't know the viewer's own reactions, so hydrate once.
  useEffect(() => {
    if (!viewerId) return;
    void load(null);
  }, [viewerId, load]);

  function choose(next: AlertCategory | null) {
    setCategory(next);
    void load(next);
  }

  const requireAuth = () => router.push("/auth/sign-in?next=/alerts");

  return (
    <Page>
      <AppHeader
        name={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        userId={profile?.id}
        showProfileChip={!!profile}
      />
      <Wrap>
        <Head>
          <h1>Road alerts</h1>
          <ButtonEl
            type="button"
            $compact
            onClick={() => (profile ? setComposing(true) : requireAuth())}
          >
            <Plus size={17} strokeWidth={2.6} /> Post
          </ButtonEl>
        </Head>

        <Filters>
          <ChipRow style={{ flexWrap: "nowrap" }}>
            <Chip type="button" $active={category === null} onClick={() => choose(null)}>
              All
            </Chip>
            {ALERT_CATEGORIES.map((key) => {
              const meta = ALERT_META[key];
              const Icon = meta.icon;
              return (
                <Chip
                  key={key}
                  type="button"
                  $active={category === key}
                  onClick={() => choose(key)}
                >
                  <Icon size={14} strokeWidth={2.5} />
                  {meta.label}
                </Chip>
              );
            })}
          </ChipRow>
        </Filters>

        {status === "error" ? (
          <Center>
            <b>We couldn&apos;t load the feed</b>
            <p>Check your connection and try again.</p>
            <ButtonEl type="button" $compact $variant="ghost" onClick={() => void load(category)}>
              <RotateCw size={16} strokeWidth={2.4} /> Retry
            </ButtonEl>
          </Center>
        ) : alerts.length === 0 && status === "ready" ? (
          <Center>
            <Megaphone className="big" size={30} strokeWidth={2} />
            <b>No alerts yet</b>
            <p>
              Nothing reported on the roads right now. Post the first one if you
              see something.
            </p>
          </Center>
        ) : (
          <List style={{ opacity: status === "loading" ? 0.6 : 1 }}>
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                viewerId={viewerId}
                onRequireAuth={requireAuth}
              />
            ))}
          </List>
        )}
      </Wrap>

      {profile && (
        <AlertComposer
          open={composing}
          viewerId={profile.id}
          onClose={() => setComposing(false)}
          onPosted={() => {
            setComposing(false);
            void load(category);
          }}
        />
      )}
    </Page>
  );
}
