"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { DriverKycForm } from "@/components/driver/DriverKycForm";
import { SupportDock } from "@/components/support/SupportDock";
import { SupportProvider } from "@/components/support/SupportProvider";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import type { Profile } from "@/lib/auth/types";
import type { SupportCase } from "@/lib/support/types";
import type { AppMode } from "@/lib/home/mode";
import { setModeAction } from "@/lib/home/mode-actions";
import { setRailCollapsedAction } from "@/lib/nav/rail-actions";
import {
  ASIDE_W,
  BOTTOM_BAR_SPACE,
  RAIL_COMPACT_MAX,
  RAIL_W_COLLAPSED,
  RAIL_W_EXPANDED,
  TOPBAR_H,
} from "@/lib/nav/rail";
import { primaryNavFor } from "./nav-items";
import { AppTopBar } from "./AppTopBar";
import { BottomTabBar } from "./BottomTabBar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { NavRail } from "./NavRail";
import { RailModeSwitch } from "./RailModeSwitch";
import { SkipToContent } from "./SkipToContent";

type ModeContext = {
  mode: AppMode;
  setMode: (next: AppMode) => void;
  driverReady: boolean;
  requireKyc: () => void;
};

const Ctx = createContext<ModeContext | null>(null);

export function useAppMode(): ModeContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAppMode must be used inside AppShell");
  return value;
}

const Shell = styled.div<{ $rail: number; $aside: number }>`
  --rail-w: ${({ $rail }) => $rail}px;
  --aside-w: ${({ $aside }) => $aside}px;
  --topbar-h: 0px;
  --bottom-bar-space: 0px;
  --page-pad: clamp(16px, 3vw, 32px);
  --sticky-top: 0px;

  display: grid;
  grid-template-columns: var(--rail-w) minmax(0, 1fr) var(--aside-w);
  min-height: 100dvh;
  background: ${({ theme }) => theme.color.bg};

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    --rail-w: ${RAIL_W_COLLAPSED}px;
  }

  @media (max-width: ${RAIL_COMPACT_MAX - 1}px) {
    --aside-w: 0px;
  }

  @media (max-width: 899px) {
    --rail-w: 0px;
    --topbar-h: ${TOPBAR_H}px;
    --bottom-bar-space: ${BOTTOM_BAR_SPACE}px;
    --sticky-top: 0px;
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  min-width: 0;
  flex: 1;
  padding-bottom: var(--bottom-bar-space);
  /* Lets a full-bleed band run past this column without adding a horizontal
     scrollbar. Clip rather than hidden: hidden would make this a scroll
     container and break the sticky rail beside it. */
  overflow-x: clip;
`;

export const ContentWidth = styled.div<{ $max?: number }>`
  width: 100%;
  max-width: ${({ $max }) => $max ?? 1180}px;
  margin: 0 auto;
  padding-inline: var(--page-pad);
`;

const Aside = styled.aside`
  position: sticky;
  top: 0;
  align-self: start;
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 16px;
  border-left: 1px solid ${({ theme }) => theme.color.line};

  @media (max-width: ${RAIL_COMPACT_MAX - 1}px) {
    display: none;
  }
`;

export function AppShell({
  profile,
  mode: initialMode,
  driverHasApplied,
  railCollapsed: initialCollapsed,
  supportCases = [],
  aside,
  children,
}: {
  profile: Profile | null;
  mode: AppMode;
  driverHasApplied: boolean;
  railCollapsed: boolean;
  supportCases?: SupportCase[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const [mode, setModeState] = useState<AppMode>(initialMode);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [driverReady, setDriverReady] = useState(driverHasApplied);
  const [kycOpen, setKycOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const items = useMemo(
    () => primaryNavFor(mode, Boolean(profile)),
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

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      startTransition(() => {
        void setRailCollapsedAction(next);
      });
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "[") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const ctx = useMemo<ModeContext>(
    () => ({ mode, setMode, driverReady, requireKyc: () => setKycOpen(true) }),
    [mode, setMode, driverReady],
  );

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(pathname)}`;
  const railWidth = collapsed ? RAIL_W_COLLAPSED : RAIL_W_EXPANDED;
  const homeHref = profile ? "/home" : "/";

  const modeSwitch = profile ? (
    <RailModeSwitch
      mode={mode}
      collapsed={collapsed}
      driverReady={driverReady}
      onModeChange={setMode}
      onKycRequired={() => setKycOpen(true)}
    />
  ) : null;

  return (
    <Ctx.Provider value={ctx}>
      <SupportProvider initial={supportCases}>
      <Shell $rail={railWidth} $aside={aside ? ASIDE_W : 0}>
        <SkipToContent />

        <NavRail
          items={items}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          profile={profile}
          signInHref={signInHref}
          modeSlot={modeSwitch}
        />

        <MobileNavDrawer open={menuOpen} onClose={closeMenu}>
          <NavRail
            variant="drawer"
            items={items}
            collapsed={false}
            onToggleCollapsed={toggleCollapsed}
            profile={profile}
            signInHref={signInHref}
            modeSlot={modeSwitch}
            onNavigate={closeMenu}
          />
        </MobileNavDrawer>

        <Column>
          <AppTopBar onOpenMenu={() => setMenuOpen(true)} homeHref={homeHref} />
          <Main id="main" tabIndex={-1}>
            {children}
          </Main>
          {profile && <BottomTabBar items={items} />}
        </Column>

        {aside ? <Aside aria-label="More">{aside}</Aside> : <div />}

        <VisuallyHidden role="status" aria-live="polite">
          {pathname}
        </VisuallyHidden>
      </Shell>

      {profile && <SupportDock />}
      </SupportProvider>

      <DriverKycForm
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        onSubmitted={async () => {
          setKycOpen(false);
          setDriverReady(true);
          const result = await setModeAction("driver");
          if (result.ok) setModeState("driver");
        }}
      />
    </Ctx.Provider>
  );
}
