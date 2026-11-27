"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { KycStatus } from "@/lib/driver/kyc";
import styled from "styled-components";
import { DriverKycForm, readKycProgress } from "@/components/driver/DriverKycForm";
import { PhoneGate } from "@/components/driver/PhoneGate";
import { DriverInvite } from "@/components/driver/DriverInvite";
import { LocationAsk } from "@/components/driver/LocationAsk";
import { SupportDock } from "@/components/support/SupportDock";
import { SupportProvider } from "@/components/support/SupportProvider";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import type { Profile } from "@/lib/auth/types";
import type { SupportCase } from "@/lib/support/types";
import type { AppMode } from "@/lib/home/mode";
import { setModeAction } from "@/lib/home/mode-actions";
import { BOTTOM_BAR_SPACE, TOPBAR_H, TOPBAR_H_SM } from "@/lib/nav/rail";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { barNavFor, primaryNavFor } from "./nav-items";
import { useScrollChrome } from "./useScrollChrome";
import { ViewTransitionBridge } from "@/lib/ui/viewTransition";
import { AppTopBar } from "./AppTopBar";
import { AppBottomNav } from "./AppBottomNav";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { useNavCounts } from "./useNavCounts";
import { RailModeSwitch } from "./RailModeSwitch";
import { SkipToContent } from "./SkipToContent";

type ModeContext = {
  mode: AppMode;
  setMode: (next: AppMode) => void;
  driverReady: boolean;
  kycStatus: KycStatus;
  requireKyc: (after?: () => void) => void;
  requirePhone: (after?: () => void) => void;
};

const Ctx = createContext<ModeContext | null>(null);

export function useAppMode(): ModeContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAppMode must be used inside AppShell");
  return value;
}

/**
 * Like useAppMode, but returns null outside AppShell instead of throwing.
 * For chrome that is also rendered on the public (site) pages, such as
 * /help and /legal, which have no AppShell around them.
 */
export function useOptionalAppMode(): ModeContext | null {
  return useContext(Ctx);
}

export const Shell = styled.div`
  --rail-w: 0px;
  --aside-w: 0px;
  --topbar-h: ${TOPBAR_H}px;
  --bottom-bar-space: 0px;
  --page-pad: clamp(16px, 3vw, 32px);
  --sticky-top: var(--topbar-h);

  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100dvh;
  background: ${nocturne.bg};
  color: ${nocturne.cream};

  @media (max-width: 960px) {
    --topbar-h: ${TOPBAR_H_SM}px;
  }
  @media (max-width: 899px) {
    --bottom-bar-space: ${BOTTOM_BAR_SPACE}px;
    transition: --sticky-top ${dur.enter} ${ease.standard};

    &[data-chrome="hidden"] {
      --sticky-top: 0px;
      transition-timing-function: ${ease.exit};
    }
  }
`;

export const Main = styled.main`
  min-width: 0;
  flex: 1;
  padding-bottom: var(--bottom-bar-space);
  padding-right: var(--side-panel, 0px);
  overflow-x: clip;
  transition: padding-right ${dur.enter} ${ease.enter};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ContentWidth = styled.div<{ $max?: number }>`
  width: 100%;
  max-width: ${({ $max }) => $max ?? 1180}px;
  margin: 0 auto;
  padding-left: max(var(--page-pad), env(safe-area-inset-left));
  padding-right: max(var(--page-pad), env(safe-area-inset-right));
`;

const CHROMELESS_ROUTES = ["/profile/edit"];

export function AppShell({
  profile,
  mode: initialMode,
  driverHasApplied,
  kycStatus: initialKycStatus = "not_submitted",
  supportCases = [],
  children,
}: {
  profile: Profile | null;
  mode: AppMode;
  driverHasApplied: boolean;
  kycStatus?: KycStatus;
  supportCases?: SupportCase[];
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [mode, setModeState] = useState<AppMode>(initialMode);
  const [driverReady, setDriverReady] = useState(driverHasApplied);
  const [kycStatus, setKycStatus] = useState<KycStatus>(initialKycStatus);
  const [seenKycStatus, setSeenKycStatus] = useState<KycStatus>(initialKycStatus);
  if (seenKycStatus !== initialKycStatus) {
    setSeenKycStatus(initialKycStatus);
    setKycStatus(initialKycStatus);
    setDriverReady(initialKycStatus !== "not_submitted");
  }
  const [kycOpen, setKycOpen] = useState(false);
  // Driver verification needs a verified phone number. The database enforces it;
  // this asks for the number first so the form is never filled in for nothing.
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);
  const [phoneVerifiedHere, setPhoneVerifiedHere] = useState(false);
  const phoneVerified = Boolean(profile?.phone_verified) || phoneVerifiedHere;
  // Set when only the number is wanted (an approved driver publishing), not the verification form after it.
  const [phoneOnly, setPhoneOnly] = useState(false);
  const afterPhone = useRef<(() => void) | null>(null);
  const openKyc = useCallback(() => {
    if (phoneVerified) setKycOpen(true);
    else {
      setPhoneOnly(false);
      setPhoneGateOpen(true);
    }
  }, [phoneVerified]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const afterKyc = useRef<(() => void) | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  useScrollChrome(shellRef);
  const profileId = profile?.id ?? null;
  const canApply = kycStatus === "not_submitted" || kycStatus === "rejected";

  useEffect(() => {
    if (!profileId) return;
    const url = new URL(window.location.href);
    const invited = url.searchParams.get("driver") === "invite";
    if (invited) {
      url.searchParams.delete("driver");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (!canApply) return;
    if (readKycProgress(profileId)?.open) openKyc();
    else if (invited) setInviteOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const requireKyc = useCallback(
    (after?: () => void) => {
      afterKyc.current = typeof after === "function" ? after : null;
      openKyc();
    },
    [openKyc],
  );

  const requirePhone = useCallback(
    (after?: () => void) => {
      if (phoneVerified) {
        after?.();
        return;
      }
      afterPhone.current = typeof after === "function" ? after : null;
      setPhoneOnly(true);
      setPhoneGateOpen(true);
    },
    [phoneVerified],
  );

  const items = useMemo(
    () => primaryNavFor(mode, Boolean(profile)),
    [mode, profile],
  );

  const barItems = useMemo(
    () => barNavFor(mode, Boolean(profile)),
    [mode, profile],
  );

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    startTransition(() => {
      void setModeAction(next).then((result) => {
        if (!result.ok) setModeState((prev) => (prev === next ? initialMode : prev));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = useMemo<ModeContext>(
    () => ({ mode, setMode, driverReady, kycStatus, requireKyc, requirePhone }),
    [mode, setMode, driverReady, kycStatus, requireKyc, requirePhone],
  );

  const counts = useNavCounts(profile?.id ?? null, mode);

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(pathname)}`;

  const chromeless = CHROMELESS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const modeSwitch = profile ? (
    <RailModeSwitch
      mode={mode}
      collapsed={false}
      driverReady={driverReady}
      onModeChange={setMode}
      onKycRequired={openKyc}
    />
  ) : null;

  return (
    <Ctx.Provider value={ctx}>
      <SupportProvider initial={supportCases}>
      <Shell ref={shellRef}>
        <ViewTransitionBridge />
        <SkipToContent />

        {!chromeless && (
          <AppTopBar
            items={barItems}
            profile={profile}
            signInHref={signInHref}
            counts={counts}
          />
        )}
        <Main id="main" tabIndex={-1}>
          {children}
        </Main>
        <AppBottomNav counts={counts} mode={profile ? mode : undefined} />

        <VisuallyHidden role="status" aria-live="polite">
          {pathname}
        </VisuallyHidden>
      </Shell>

      {profile && <SupportDock />}
      </SupportProvider>

      {profile && <NotificationToast />}

      <DriverInvite
        open={inviteOpen}
        onLater={closeInvite}
        onYes={() => {
          setInviteOpen(false);
          openKyc();
        }}
      />

      <PhoneGate
        open={phoneGateOpen}
        initialPhone={profile?.phone ?? null}
        onClose={() => {
          afterKyc.current = null;
          afterPhone.current = null;
          setPhoneOnly(false);
          setPhoneGateOpen(false);
        }}
        onVerified={() => {
          setPhoneVerifiedHere(true);
          setPhoneGateOpen(false);
          if (phoneOnly) {
            const after = afterPhone.current;
            afterPhone.current = null;
            setPhoneOnly(false);
            router.refresh();
            after?.();
            return;
          }
          setKycOpen(true);
          router.refresh();
        }}
      />

      <LocationAsk
        enabled={Boolean(profile) && driverReady && kycStatus !== "rejected"}
        blocked={kycOpen || phoneGateOpen || inviteOpen}
      />

      <DriverKycForm
        open={kycOpen}
        userId={profile?.id ?? null}
        rejected={kycStatus === "rejected"}
        onClose={() => {
          afterKyc.current = null;
          setKycOpen(false);
        }}
        onSubmitted={async () => {
          const after = afterKyc.current;
          afterKyc.current = null;
          setDriverReady(true);
          setKycStatus("pending");
          after?.();
          const result = await setModeAction("driver");
          if (result.ok) setModeState("driver");
          router.refresh();
        }}
      />
    </Ctx.Provider>
  );
}

