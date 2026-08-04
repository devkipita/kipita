import { supabase } from "@/lib/supabase";
import type { Booking, BookingStatus } from "@/types";
import { MOCK_BOOKINGS } from "@/lib/mock/data";

const CURRENT_STATES: BookingStatus[] = [
  "confirmed",
  "in_progress",
  "pending_payment",
];
const PREVIOUS_STATES: BookingStatus[] = ["completed", "cancelled"];

const BOOKING_SELECT = `
  *,
  trip:trips(*,
    driver:users!driver_id(id, full_name, avatar_url, is_verified, rating)
  ),
  passenger:users!passenger_id(id, full_name, avatar_url, is_verified, rating),
  driver:users!driver_id(id, full_name, avatar_url, is_verified, rating)
`;

export async function fetchCurrentBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
    .in("status", ["confirmed", "in_progress", "pending_payment"])
    .order("created_at", { ascending: false });
  // Fall back to seed data when the backend is empty/unavailable (mock mode),
  // mirroring fetchTrips so the trips list can always be previewed.
  if (error || !data || data.length === 0) {
    return MOCK_BOOKINGS.filter((b) => CURRENT_STATES.includes(b.status));
  }
  return data as Booking[];
}

export async function fetchPreviousBookings(
  userId: string,
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
    .in("status", ["completed", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data || data.length === 0) {
    return MOCK_BOOKINGS.filter((b) => PREVIOUS_STATES.includes(b.status));
  }
  return data as Booking[];
}

export async function fetchIncomingRequests(
  driverId: string,
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("driver_id", driverId)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) {
    return MOCK_BOOKINGS.filter((b) => b.status === "pending_payment");
  }
  return data as Booking[];
}

export async function acceptMatch(bookingId: string): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "pending_payment" })
    .eq("id", bookingId)
    .select(BOOKING_SELECT)
    .single();
  if (error) throw error;
  return data as Booking;
}

/**
 * Advance a booking through the trip lifecycle (confirmed → in_progress →
 * completed, or cancelled). Best-effort against the backend; the caller keeps a
 * local override so the UI updates even if the row isn't persisted (mock mode).
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<void> {
  // Temp/optimistic bookings never hit the table — skip the round-trip.
  if (bookingId.startsWith("temp-")) return;
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
}

export async function createBooking(booking: {
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  seats_booked: number;
  total_price: number;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({ ...booking, status: "pending_payment" })
    .select(BOOKING_SELECT)
    .single();
  if (error) throw error;
  return data as Booking;
}
