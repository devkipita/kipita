"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { AppTopBar } from "./AppTopBar";
import { AppBottomNav } from "./AppBottomNav";
import { Main, Shell } from "./AppShell";
import { SkipToContent } from "./SkipToContent";
import { barNavFor } from "./nav-items";
import { useViewerProfile } from "./useViewerProfile";

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { profile, pending } = useViewerProfile();
  const barItems = useMemo(
    () => barNavFor("passenger", Boolean(profile)),
    [profile],
  );

  return (
    <Shell>
      <SkipToContent />
      <AppTopBar
        items={barItems}
        profile={profile}
        pending={pending}
        signInHref={`/auth/sign-in?next=${encodeURIComponent(pathname)}`}
      />
      <Main id="main" tabIndex={-1}>
        {children}
      </Main>
      <AppBottomNav />
    </Shell>
  );
}
