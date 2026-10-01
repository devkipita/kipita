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
  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in?next=/referrals");

  const [summary, entries] = await Promise.all([
    fetchReferralSummary(),
    fetchReferrals(),
  ]);

  return <ReferralView summary={summary} entries={entries} />;
}
