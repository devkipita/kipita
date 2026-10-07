import type { ReactNode } from "react";
import { AppShell } from "@/components/nav/AppShell";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { readMode } from "@/lib/home/mode.server";
import { claimReferralFromCookie } from "@/lib/referrals/server";
import { fetchOpenSupportCases } from "@/lib/support/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profile, mode] = await Promise.all([getProfile(), readMode()]);

  let driverHasApplied = false;
  if (profile) {
    const supabase = await createClient();
    const kyc = await fetchDriverKyc(supabase, profile.id).catch(() => null);
    driverHasApplied = kyc?.hasApplied ?? false;
  }

  if (profile) await claimReferralFromCookie();

  const supportCases = profile ? await fetchOpenSupportCases() : [];

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
