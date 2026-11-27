import type { ReactNode } from "react";
import type { Viewport } from "next";
import { nocturneDark, nocturneLight } from "@/lib/nocturne";
import { after } from "next/server";
import { AppShell } from "@/components/nav/AppShell";
import { MotionProvider } from "@/components/anim/MotionProvider";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { readMode } from "@/lib/home/mode.server";
import { claimReferralFromCookie } from "@/lib/referrals/server";
import { fetchOpenSupportCases } from "@/lib/support/server";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: nocturneLight["--n-green-deep"] },
    { media: "(prefers-color-scheme: dark)", color: nocturneDark["--n-green-deep"] },
  ],
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profile, mode] = await Promise.all([getProfile(), readMode()]);

  if (profile) after(claimReferralFromCookie);

  const [kyc, supportCases] = profile
    ? await Promise.all([
        createClient()
          .then((supabase) => fetchDriverKyc(supabase, profile.id))
          .catch(() => null),
        fetchOpenSupportCases(),
      ])
    : [null, []];

  const driverHasApplied = kyc?.hasApplied ?? false;

  return (
    <MotionProvider>
      <AppShell
        profile={profile}
        mode={mode}
        driverHasApplied={driverHasApplied}
        kycStatus={kyc?.status ?? "not_submitted"}
        supportCases={supportCases}
      >
        {children}
      </AppShell>
    </MotionProvider>
  );
}
