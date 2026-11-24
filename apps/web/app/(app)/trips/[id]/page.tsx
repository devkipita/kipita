import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripDetail } from "@/components/trips/TripDetail";
import { getProfile } from "@/lib/auth/session";
import { routeBetween } from "@/lib/maps/routes.server";
import { placeKey, type TripRoute } from "@/lib/maps/types";
import { cancellationConfigFromSettings } from "@kipita/shared";
import { fetchPlatform } from "@/lib/platform.server";
import { createClient } from "@/lib/supabase/server";
import { fetchBookingDetail } from "@/lib/trips/server";
import { NO_JOURNEY, type JourneyState, type NoShowState } from "@/lib/trips/types";

export const metadata: Metadata = {
  title: "Trip",
  robots: { index: false, follow: false },
};

type Embedded = Record<string, unknown>[] | null | undefined;

function firstOf(value: unknown): Record<string, unknown> | null {
  return (value as Embedded)?.[0] ?? null;
}

async function loadJourney(
  bookingId: string,
  viewerId: string,
  row: Record<string, unknown>,
  contact: { data: unknown; error: unknown },
): Promise<JourneyState> {
  const payment = firstOf(row.payments);
  const problem = firstOf(row.booking_problems);
  const payout = firstOf(row.wallet_transactions);
  const paidOut = payout ? Number(payout.amount) : null;

  const code =
    row.passenger_id === viewerId && row.status === "confirmed" && !row.boarded_at
      ? await createClient()
          .then((supabase) => supabase.rpc("my_pickup_code", { p_booking_id: bookingId }))
          .then(({ data, error }) => (error || typeof data !== "string" ? null : data))
      : null;

  return {
    ...NO_JOURNEY,
    code,
    boardedAt: (row.boarded_at as string | null) ?? null,
    boardedMethod: (row.boarded_method as JourneyState["boardedMethod"]) ?? null,
    escrow: ((payment?.escrow_status as string | null) ?? null) ?? (paidOut != null ? "released" : null),
    payout: paidOut,
    releaseDueAt: (payment?.release_due_at as string | null) ?? null,
    contactOpen: contact.error ? row.status === "confirmed" || row.status === "in_progress" : contact.data === true,
    problem: problem
      ? {
          kind: problem.kind as string,
          status: problem.status as "open" | "resolved",
          outcome: (problem.outcome as "clear" | "refund" | null) ?? null,
        }
      : null,
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

  const [detail, walletBalance, platform, contact] = await Promise.all([
    fetchBookingDetail(id, profile.id),
    createClient()
      .then((supabase) => supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle())
      .then(({ data, error }) => (error ? null : Number(data?.balance ?? 0))),
    fetchPlatform(),
    createClient().then((supabase) => supabase.rpc("booking_contact_open", { p_booking_id: id })),
  ]);
  if (!detail) notFound();

  const { booking, row } = detail;
  const noShow: NoShowState = {
    tier: (row.cancel_tier as string | null) ?? null,
    markedAt: (row.no_show_marked_at as string | null) ?? null,
    disputedAt: (row.no_show_disputed_at as string | null) ?? null,
  };
  const cancelledBy = (row.cancelled_by as string | null) ?? null;
  const journey = await loadJourney(id, profile.id, row, contact);

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
