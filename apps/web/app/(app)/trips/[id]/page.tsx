import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";
import { cancellationConfigFromSettings } from "@kipita/shared";
import { fetchPlatform } from "@/lib/platform.server";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking } from "@/lib/trips/server";
import { NO_JOURNEY, type JourneyState, type NoShowState } from "@/lib/trips/types";

export const metadata: Metadata = {
  title: "Trip",
  robots: { index: false, follow: false },
};

/**
 * Pickup code, boarding and problem report (migration 068). Every query is allowed to fail: on a database
 * that has not run 068 the columns, tables and function do not exist, and the booking must still load.
 */
async function loadJourney(bookingId: string, viewerId: string): Promise<JourneyState> {
  const supabase = await createClient();
  const [boarded, payment, problem] = await Promise.all([
    supabase.from("bookings").select("boarded_at, boarded_method, passenger_id, status").eq("id", bookingId).maybeSingle(),
    // Payments are readable by their owner only, so this is the passenger's view; for a driver it is empty.
    supabase
      .from("payments")
      .select("escrow_status, release_due_at")
      .eq("booking_id", bookingId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("booking_problems")
      .select("kind, status, outcome")
      .eq("booking_id", bookingId)
      .eq("source", "passenger")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const row = boarded.error ? null : boarded.data;
  const isPassenger = row?.passenger_id === viewerId;
  const code =
    isPassenger && row?.status === "confirmed" && !row.boarded_at
      ? await supabase.rpc("my_pickup_code", { p_booking_id: bookingId }).then(({ data, error }) =>
          error || typeof data !== "string" ? null : data,
        )
      : null;

  return {
    ...NO_JOURNEY,
    code,
    boardedAt: (row?.boarded_at as string | null) ?? null,
    boardedMethod: (row?.boarded_method as JourneyState["boardedMethod"]) ?? null,
    escrow: payment.error ? null : ((payment.data?.escrow_status as string | null) ?? null),
    releaseDueAt: payment.error ? null : ((payment.data?.release_due_at as string | null) ?? null),
    problem:
      problem.error || !problem.data
        ? null
        : {
            kind: problem.data.kind as string,
            status: problem.data.status as "open" | "resolved",
            outcome: (problem.data.outcome as "clear" | "refund" | null) ?? null,
          },
  };
}

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/auth/sign-in?next=/trips/${id}`);

  const [booking, walletBalance, platform, noShow, journey] = await Promise.all([
    fetchBooking(id, profile.id),
    createClient()
      .then((supabase) => supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle())
      .then(({ data, error }) => (error ? null : Number(data?.balance ?? 0))),
    fetchPlatform(),
    // Columns from migration 063. If it has not run, the query errors and this is null.
    createClient()
      .then((supabase) =>
        supabase
          .from("bookings")
          .select("cancel_tier, no_show_marked_at, no_show_disputed_at")
          .eq("id", id)
          .maybeSingle(),
      )
      .then(({ data, error }): NoShowState | null =>
        error || !data
          ? null
          : {
              tier: (data.cancel_tier as string | null) ?? null,
              markedAt: (data.no_show_marked_at as string | null) ?? null,
              disputedAt: (data.no_show_disputed_at as string | null) ?? null,
            },
      ),
    loadJourney(id, profile.id),
  ]);
  if (!booking) notFound();

  const trip = booking.trip;
  const showMap = trip && !["completed", "cancelled", "rejected"].includes(booking.status);
  const destination = trip ? placeKey(trip.to_location, trip.to_lat, trip.to_lng) : "";
  const route: Promise<TripRoute | null> = showMap
    ? routeBetween(placeKey(trip.from_location, trip.from_lat, trip.from_lng), destination).then((r) =>
        r?.polyline ? { polyline: r.polyline, seconds: r.seconds, destination } : null,
      )
    : Promise.resolve(null);

  return (
    <TripDetail
      booking={booking}
      viewerId={profile.id}
      viewerPhone={profile.phone}
      walletBalance={walletBalance}
      cancelConfig={cancellationConfigFromSettings(platform.settings)}
      noShow={noShow}
      journey={journey}
      releaseHours={platform.settings.release_window_hours ?? 6}
      route={route}
    />
  );
}
