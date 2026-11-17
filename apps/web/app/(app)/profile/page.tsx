import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toGarageCar, type DriverVehicle, type GarageCar } from "@/lib/home/vehicle";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

async function loadCars(userId: string): Promise<{ cars: GarageCar[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, make, model, color, plate_number, image_url")
    .eq("driver_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    Sentry.captureException(error, { tags: { surface: "profile-cars" } });
    return { cars: [], failed: true };
  }
  const cars = ((data ?? []) as DriverVehicle[])
    .map(toGarageCar)
    .filter((c): c is GarageCar => c !== null);
  return { cars, failed: false };
}

export default async function ProfilePage() {
  const profile = await requireProfile("/profile");
  const { cars, failed } = await loadCars(profile.id);
  return <ProfileView profile={profile} cars={cars} carsError={failed} />;
}
