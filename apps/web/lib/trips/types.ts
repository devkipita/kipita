export type BookingStatus =
  | "requested"
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export const CURRENT_STATES: BookingStatus[] = [
  "requested",
  "pending_payment",
  "confirmed",
  "in_progress",
];

export const PREVIOUS_STATES: BookingStatus[] = [
  "completed",
  "cancelled",
  "rejected",
];

export interface PublishedTrip {
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string | null;
  departure_time: string | null;
  price_per_seat: number;
  seats_available: number;
  seats_total: number;
  status: string;
  seats_taken: number;
  pending_requests: number;
  awaiting_payment: number;
  paid_seats: number;
  vehicle?: TripCar | null;
  riders?: SeatRider[];
}

export interface SeatRider {
  booking_id: string;
  name: string;
  avatar_url: string | null;
  seats: number;
  state: "paid" | "booked" | "requested";
  created_at: string;
}

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
  vehicle?: TripCar | null;
  from_lat?: number | null;
  from_lng?: number | null;
  to_lat?: number | null;
  to_lng?: number | null;
}

export interface TripCar {
  make: string | null;
  model: string | null;
  color: string | null;
  plate_number: string | null;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  seats_booked: number;
  total_price: number;
  service_fee: number | null;
  status: BookingStatus;
  accepted_at: string | null;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_amount: number | null;
  refund_to: "wallet" | "mpesa" | null;
  my_rating?: number | null;
  booking_reference: string | null;
  created_at: string;
  expires_at: string | null;
  cancel_reason: string | null;
  trip: TripLeg | null;
  passenger: TripPerson | null;
  driver: TripPerson | null;
  photo_url?: string | null;
}

const PERSON = "id, full_name, avatar_url, is_verified, rating, total_trips";

export const BOOKING_SELECT = `
  id, trip_id, passenger_id, driver_id, seats_booked, total_price, service_fee, status,
  booking_reference, created_at, expires_at, cancel_reason,
  accepted_at, paid_at, started_at, completed_at, cancelled_at, refunded_amount, refund_to,
  trip:trips!trip_id (
    id, from_location, to_location, departure_date, departure_time,
    price_per_seat, status, from_lat, from_lng, to_lat, to_lng,
    vehicle:vehicles!vehicle_id ( make, model, color, plate_number )
  ),
  passenger:users!passenger_id ( ${PERSON} ),
  driver:users!driver_id ( ${PERSON} )
`;

export type NoShowState = {
  tier: string | null;
  markedAt: string | null;
  disputedAt: string | null;
};

export type JourneyState = {
  code: string | null;
  boardedAt: string | null;
  boardedMethod: "code" | "manual" | "legacy" | null;
  escrow: string | null;
  releaseDueAt: string | null;
  payout: number | null;
  problem: { kind: string; status: "open" | "resolved"; outcome: "clear" | "refund" | null } | null;
  contactOpen: boolean;
};

export const NO_JOURNEY: JourneyState = {
  code: null,
  boardedAt: null,
  boardedMethod: null,
  escrow: null,
  releaseDueAt: null,
  payout: null,
  problem: null,
  contactOpen: false,
};
