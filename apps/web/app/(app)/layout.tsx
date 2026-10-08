import type { ReactNode } from "react";
import { after } from "next/server";
import { AppShell } from "@/components/nav/AppShell";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { readMode } from "@/lib/home/mode.server";
import { claimReferralFromCookie } from "@/lib/referrals/server";
import { fetchOpenSupportCases } from "@/lib/support/server";

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
    <AppShell
      profile={profile}
      mode={mode}
      driverHasApplied={driverHasApplied}
      supportCases={supportCases}
    >
      {children}
    </AppShell>
  );
}
