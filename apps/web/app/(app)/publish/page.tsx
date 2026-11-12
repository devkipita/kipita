import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchMyCars } from "@/lib/home/vehicle";
import { fetchPlatform } from "@/lib/platform.server";
import { PublishSurface } from "@/components/publish/PublishSurface";

export const metadata: Metadata = {
  title: "Publish a ride",
  description:
    "Offer your empty seats on Kipita. Set your route, your time and your fare, and get paid after the journey.",
  alternates: { canonical: "/publish" },
};

export default async function PublishPage() {
  const profile = await requireProfile("/publish");
  const supabase = await createClient();
  const [cars, platform] = await Promise.all([
    fetchMyCars(supabase, profile.id).catch(() => []),
    fetchPlatform(),
  ]);

  return (
    <PublishSurface
      publishBeforeApproval={platform.flags.publish_before_approval === true}
      driverName={profile.full_name ?? ""}
      savedCars={cars}
    />
  );
}
