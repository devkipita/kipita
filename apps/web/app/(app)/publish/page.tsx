import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchMyVehicle } from "@/lib/home/vehicle";
import { PublishDeclaration } from "@/components/publish/PublishDeclaration";

export const metadata: Metadata = {
  title: "Publish a ride",
  description:
    "Offer your empty seats on Kipita. Set your route, your time and your fare, and get paid after the journey.",
  alternates: { canonical: "/publish" },
};

export default async function PublishPage() {
  const profile = await requireProfile("/publish");
  const supabase = await createClient();
  const vehicle = await fetchMyVehicle(supabase, profile.id).catch(() => null);

  const plate = vehicle?.plate_number?.trim() ?? "";
  const realPlate =
    plate.length >= 4 && !/^pending/i.test(plate) ? plate : null;

  return (
    <PublishDeclaration
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
