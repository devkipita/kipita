import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralView } from "@/components/referrals/ReferralView";
import { getProfile } from "@/lib/auth/session";
import { fetchReferrals, fetchReferralSummary } from "@/lib/referrals/server";

export const metadata: Metadata = {
  title: "Invite friends",
  robots: { index: false, follow: false },
};

export default async function ReferralsPage() {
  const [profile, summary, entries] = await Promise.all([
    getProfile(),
    fetchReferralSummary(),
    fetchReferrals(),
  ]);
  if (!profile) redirect("/auth/sign-in?next=/referrals");

  return <ReferralView summary={summary} entries={entries} />;
}
