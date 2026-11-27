import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";
import { cancellationConfigFromSettings, isApproxArrival } from "@kipita/shared";
import { fetchPlatform } from "@/lib/platform.server";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking } from "@/lib/trips/server";
import { NO_JOURNEY, type JourneyState, type NoShowState } from "@/lib/trips/types";

export const metadata: Metadata = {
  title: "Trip",
  robots: { index: false, follow: false },
};

async function loadJourney(bookingId: string, viewerId: string): Promise<JourneyState> {
  const supabase = await createClient();
  const [boarded, payment, problem, contact, payout] = await Promise.all([
    supabase
      .from("bookings")
      .select("boarded_at, boarded_method, passenger_id, status, arrived_at, arrived_by, arrived_lat, arrived_lng, arrived_position_at")
      .eq("id", bookingId)
      .maybeSingle(),
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
    supabase.rpc("booking_contact_open", { p_booking_id: bookingId }),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("booking_id", bookingId)
      .eq("type", "payout")
      .limit(1)
      .maybeSingle(),
  ]);
  const paidOut = payout.error || !payout.data ? null : Number(payout.data.amount);

  const row = boarded.error ? null : boarded.data;
  const isPassenger = row?.passenger_id === viewerId;
  const code =
    isPassenger && row?.status === "confirmed" && !row.boarded_at
      ? await supabase.rpc("my_pickup_code", { p_booking_id: bookingId }).then(({ data, error }) =>
          error || typeof data !== "string" ? null : data,
        )
      : null;

  const arrivedAt = (row?.arrived_at as string | null) ?? null;
  const arrivedLat = row?.arrived_lat as number | null | undefined;
  const arrivedLng = row?.arrived_lng as number | null | undefined;

  return {
    ...NO_JOURNEY,
    code,
    arrivedAt,
    arrivedBy: (row?.arrived_by as JourneyState["arrivedBy"]) ?? null,
    arrivedPlace:
      arrivedLat != null && arrivedLng != null
        ? {
            lat: arrivedLat,
            lng: arrivedLng,
            approximate: isApproxArrival(arrivedAt, (row?.arrived_position_at as string | null) ?? null),
          }
        : null,
    boardedAt: (row?.boarded_at as string | null) ?? null,
    boardedMethod: (row?.boarded_method as JourneyState["boardedMethod"]) ?? null,
    escrow: (payment.error ? null : ((payment.data?.escrow_status as string | null) ?? null)) ?? (paidOut != null ? "released" : null),
    payout: paidOut,
    releaseDueAt: payment.error ? null : ((payment.data?.release_due_at as string | null) ?? null),
    contactOpen: contact.error ? row?.status === "confirmed" || row?.status === "in_progress" : contact.data === true,
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const [{ id }, { chat }] = await Promise.all([params, searchParams]);
  const profile = await getProfile();
  if (!profile) redirect(`/auth/sign-in?next=/trips/${id}`);

  const [booking, walletBalance, platform, noShow, journey, cancelledBy] = await Promise.all([
    fetchBooking(id, profile.id),
    createClient()
      .then((supabase) => supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle())
      .then(({ data, error }) => (error ? null : Number(data?.balance ?? 0))),
    fetchPlatform(),
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
    createClient()
      .then((supabase) => supabase.from("bookings").select("cancelled_by").eq("id", id).maybeSingle())
      .then(({ data, error }) => (error ? null : ((data?.cancelled_by as string | null) ?? null))),
  ]);
  if (!booking) notFound();

  const trip = booking.trip;
  if (trip?.status === "in_progress" && trip.driver?.id === profile.id) {
    redirect(`/ride/${trip.id}${chat ? `?chat=${id}` : ""}`);
  }
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
      cancelledBy={cancelledBy}
      journey={journey}
      route={route}
    />
  );
}
