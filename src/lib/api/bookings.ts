import { supabase } from "@/lib/supabase";
import type { Booking } from "@/types";

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
  if (error) throw error;
  return (data ?? []) as Booking[];
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
  if (error) throw error;
  return (data ?? []) as Booking[];
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
  if (error) throw error;
  return (data ?? []) as Booking[];
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
