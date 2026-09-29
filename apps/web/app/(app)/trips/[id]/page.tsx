import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { fetchBooking } from "@/lib/trips/server";

export const metadata: Metadata = {
  title: "Trip",
  robots: { index: false, follow: false },
};

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/auth/sign-in?next=/trips/${id}`);

  const booking = await fetchBooking(id);
  if (!booking) notFound();

  return <TripDetail booking={booking} viewerId={profile.id} />;
}
