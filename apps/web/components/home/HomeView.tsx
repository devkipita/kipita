"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AppHeader } from "@/components/app/AppHeader";
import { AlertComposer } from "@/components/alerts/AlertComposer";
import { DriverKycForm } from "@/components/driver/DriverKycForm";
import type { Alert } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import type { AppMode } from "@/lib/home/mode";
import { setModeAction } from "@/lib/home/mode-actions";
import type { HomeItem } from "@/lib/home/search";
import { AlertsPanel } from "./AlertsPanel";
import { ModeToggle } from "./ModeToggle";
import { PostDrawer, type PostDraft } from "./PostDrawer";
import { RideCarousel } from "./RideCarousel";
import { RouteSearchForm, type SearchForm } from "./RouteSearchForm";
import { useHomeSearch } from "./useHomeSearch";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 720px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 28px) 48px;
  display: flex;
  flex-direction: column;
  gap: 26px;
`;

const Greeting = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;

  h1 {
    flex: 1;
    min-width: 200px;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: ${({ theme }) => theme.color.text};
  }
`;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

/**
 * The signed-in home page — the web port of mobile's home tab.
 *
 * Four bands, top to bottom: route planner, available rides (or passenger
 * requests when driving), offers, road alerts. The mode toggle sits above them
 * because unlike mobile — where it lives on the profile screen — web has room
 * for it where it matters.
 *
 * `offersSlot` arrives as a prop rather than an import because it is a server
 * component and this is a client one.
 */
export function HomeView({
  profile,
  mode: initialMode,
  driverHasApplied,
  initialItems,
  initialAlerts,
  offersSlot,
}: {
  profile: Profile;
  mode: AppMode;
  driverHasApplied: boolean;
  initialItems: HomeItem[];
  initialAlerts: Alert[];
  offersSlot: ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [hasApplied, setHasApplied] = useState(driverHasApplied);
  const [kycOpen, setKycOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null);

  const search = useHomeSearch(mode, initialItems);
  const { items, phase, lastForm, searchRequested, run, clearSearchRequest } =
    search;

  // Switching mode changes which table we're looking at, so re-run the search.
  useEffect(() => {
    if (mode === initialMode) return;
    void run(lastForm);
    // `lastForm` is intentionally not a dependency: we want the route the user
    // last searched, not a re-run every time it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const openPost = useCallback(
    (form: SearchForm | null) => {
      const from = form?.from ?? lastForm?.from ?? "";
      const to = form?.to ?? lastForm?.to ?? "";
      if (from.trim().length < 2 || to.trim().length < 2) return;

      setPostDraft({
        role: mode,
        from,
        to,
        date: form?.date ?? lastForm?.date ?? null,
        departure_time: form?.departure_time ?? lastForm?.departure_time ?? null,
        preferences: form?.preferences ?? lastForm?.preferences ?? {},
      });
    },
    [mode, lastForm],
  );

  // Post-on-empty, mirroring mobile. The `searchRequested` guard is what keeps
  // a server-rendered empty list from popping a drawer on page load.
  useEffect(() => {
    if (!searchRequested || phase !== "ready") return;
    clearSearchRequest();
    if (items.length === 0) openPost(null);
  }, [searchRequested, phase, items.length, clearSearchRequest, openPost]);

  return (
    <Page>
      <AppHeader
        name={profile.full_name}
        avatarUrl={profile.avatar_url}
        userId={profile.id}
      />
      <Wrap>
        <Greeting>
          <h1>Hi {firstName(profile.full_name)}, where to?</h1>
          <ModeToggle
            mode={mode}
            driverReady={hasApplied}
            onModeChange={setMode}
            onKycRequired={() => setKycOpen(true)}
          />
        </Greeting>

        <RouteSearchForm
          mode={mode}
          busy={phase === "searching"}
          initial={lastForm ?? undefined}
          onSearch={(form) => void run(form, { deliberate: true })}
        />

        <RideCarousel
          mode={mode}
          phase={phase}
          items={items}
          onPost={() => openPost(null)}
          onRetry={() => void run(lastForm)}
        />

        {offersSlot}

        <AlertsPanel
          alerts={initialAlerts}
          viewerId={profile.id}
          onPost={() => setAlertOpen(true)}
        />
      </Wrap>

      <PostDrawer
        open={!!postDraft}
        draft={postDraft}
        onClose={() => setPostDraft(null)}
        onPosted={() => {
          setPostDraft(null);
          void run(lastForm);
        }}
      />

      <DriverKycForm
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        onSubmitted={async () => {
          setKycOpen(false);
          setHasApplied(true);
          // Only flip the cookie once the driver_profiles row genuinely exists.
          const result = await setModeAction("driver");
          if (result.ok) setMode("driver");
        }}
      />

      <AlertComposer
        open={alertOpen}
        viewerId={profile.id}
        onClose={() => setAlertOpen(false)}
        onPosted={() => {
          setAlertOpen(false);
          router.refresh();
        }}
      />
    </Page>
  );
}
