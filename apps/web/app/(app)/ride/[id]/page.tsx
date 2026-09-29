import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { fetchRideDetail } from "@/lib/ride-detail.server";
import { RideDetailView } from "@/components/rides/RideDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
};

export const metadata: Metadata = {
  title: "Ride",
  // Ride rows churn constantly and often name real people — keep them out of
  // search results even though the tables themselves are world-readable.
  robots: { index: false, follow: false },
};

export default async function RidePage({ params, searchParams }: PageProps) {
  const [{ id }, { kind }] = await Promise.all([params, searchParams]);

  const [ride, profile] = await Promise.all([
    fetchRideDetail(id, kind === "request" ? "request" : "trip"),
    getProfile(),
  ]);

  if (!ride) notFound();
  return <RideDetailView ride={ride} profile={profile} />;
}
