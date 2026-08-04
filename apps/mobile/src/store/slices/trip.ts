import { create } from "zustand";
import type { Booking, BookingStatus } from "@/types";

/**
 * Drives the live-trip experience (ordering → on-trip → ending).
 *
 * Holds the booking object for the /trip/[id] route and a client-side status
 * override so lifecycle transitions (Start / End / Cancel) reflect instantly
 * and survive across the trips list + trip screen, even when the mock backend
 * doesn't persist the write.
 */
interface TripState {
  bookings: Record<string, Booking>;
  statusOverride: Record<string, BookingStatus>;
  setBooking: (booking: Booking) => void;
  setStatus: (bookingId: string, status: BookingStatus) => void;
  /** Resolve the effective status: local override wins over the booking's own. */
  getStatus: (booking: Booking) => BookingStatus;
}

export const useTripStore = create<TripState>((set, get) => ({
  bookings: {},
  statusOverride: {},
  setBooking: (booking) =>
    set((s) => ({ bookings: { ...s.bookings, [booking.id]: booking } })),
  setStatus: (bookingId, status) =>
    set((s) => ({
      statusOverride: { ...s.statusOverride, [bookingId]: status },
    })),
  getStatus: (booking) => get().statusOverride[booking.id] ?? booking.status,
}));
