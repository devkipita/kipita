/**
 * The ride a notification points at — either a driver's posted trip
 * (`ride_match`) or a passenger's open request (`request_match`).
 *
 * Shapes and display helpers only, so the detail view (a client component) can
 * import them. The query lives in `ride-detail.server.ts`.
 */

export type RidePreferences = {
  luggage?: boolean;
  pets?: boolean;
  silent_ride?: boolean;
  music?: boolean;
  no_smoking?: boolean;
};

/**
 * A person's trust line: "4.8 · 31 trips", or "New" before they have either.
 *
 * Shared by the ride card and the detail page so the same driver never reads
 * two different ways — and so a brand-new driver never renders "0 · 0 trips",
 * which looks like a bad score rather than an absent one.
 */
export function ratingLabel(
  rating: number | null | undefined,
  trips: number | null | undefined,
): string {
  const score = rating && rating > 0 ? rating.toFixed(1) : "New";
  return trips && trips > 0 ? `${score} · ${trips} trips` : score;
}

export type RidePerson = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  rating: number | null;
  total_trips: number | null;
  phone: string | null;
};

export type RideVehicle = {
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plate_number: string | null;
};

export type TripDetail = {
  kind: "trip";
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string | null;
  departure_time: string | null;
  seats_total: number;
  seats_available: number;
  price_per_seat: number;
  preferences: RidePreferences;
  status: string;
  description: string | null;
  pickup_point: string | null;
  dropoff_point: string | null;
  driver: RidePerson | null;
  vehicle: RideVehicle | null;
};

export type RequestDetail = {
  kind: "request";
  id: string;
  from_location: string;
  to_location: string;
  preferred_date: string | null;
  preferred_time: string | null;
  seats_needed: number;
  preferences: RidePreferences;
  status: string;
  passenger: RidePerson | null;
};

export type RideDetail = TripDetail | RequestDetail;

/** "Today" / "Tomorrow" / "Sat 4 Oct" from an ISO date. */
export function formatRideDate(date: string | null): string | null {
  if (!date) return null;

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const today = new Date();
  if (date === iso(today)) return "Today";

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === iso(tomorrow)) return "Tomorrow";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "6:00 AM" from a Postgres `time` ("06:00:00"). */
export function formatRideTime(time: string | null): string | null {
  if (!time) return null;
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number(rawHour);
  if (Number.isNaN(hour)) return null;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${(rawMinute ?? "00").padStart(2, "0")} ${period}`;
}
