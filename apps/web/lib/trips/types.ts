export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export const CURRENT_STATES: BookingStatus[] = [
  "pending_payment",
  "confirmed",
  "in_progress",
];

export const PREVIOUS_STATES: BookingStatus[] = ["completed", "cancelled"];

export interface TripPerson {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  rating: number | null;
  total_trips: number | null;
}

export interface TripLeg {
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string | null;
  departure_time: string | null;
  price_per_seat: number;
  status: string;
  driver: TripPerson | null;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  seats_booked: number;
  total_price: number;
  status: BookingStatus;
  booking_reference: string | null;
  created_at: string;
  trip: TripLeg | null;
  passenger: TripPerson | null;
  driver: TripPerson | null;
  /** Resolved server-side from the destination town. */
  photo_url?: string | null;
}

/**
 * `phone` is deliberately absent. Migration 004 revoked it, and an ungranted
 * column makes Postgres deny the whole table rather than the one field — the
 * bug that emptied the home page.
 */
const PERSON = "id, full_name, avatar_url, is_verified, rating, total_trips";

export const BOOKING_SELECT = `
  id, trip_id, passenger_id, driver_id, seats_booked, total_price, status,
  booking_reference, created_at,
  trip:trips!trip_id (
    id, from_location, to_location, departure_date, departure_time,
    price_per_seat, status,
    driver:users!driver_id ( ${PERSON} )
  ),
  passenger:users!passenger_id ( ${PERSON} ),
  driver:users!driver_id ( ${PERSON} )
`;
