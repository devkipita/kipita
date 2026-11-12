import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchMyVehicle } from "@/lib/home/vehicle";
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
  const [vehicle, platform] = await Promise.all([
    fetchMyVehicle(supabase, profile.id).catch(() => null),
    fetchPlatform(),
  ]);

  const plate = vehicle?.plate_number?.trim() ?? "";
  const realPlate =
    plate.length >= 4 && !/^pending/i.test(plate) ? plate : null;

  return (
    <PublishSurface
      publishBeforeApproval={platform.flags.publish_before_approval === true}
      driverName={profile.full_name ?? ""}
      savedCar={
        realPlate
          ? {
              make: vehicle?.make ?? "",
              model: vehicle?.model ?? "",
              plate: realPlate,
              color: /^unspecified$/i.test(vehicle?.color?.trim() ?? "")
                ? ""
                : (vehicle?.color?.trim() ?? ""),
            }
          : null
      }
    />
  );
}
