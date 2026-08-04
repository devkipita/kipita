/** Domain types shared between Kipita's mobile app and web/admin. */

export type PaymentMethod =
  | "mpesa"
  | "card"
  | "visa"
  | "mastercard"
  | "apple_pay"
  | "google_pay"
  | "cash";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export type EscrowStatus =
  | "none"
  | "held"
  | "refund_pending"
  | "released"
  | "refunded";

export type RefundStatus = "pending" | "approved" | "rejected";

export type RefundDecision = "approve" | "reject";

export interface UserRef {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TripRef {
  from_location: string;
  to_location: string;
}

export interface BookingRef {
  id: string;
  booking_reference?: string | null;
  trip?: TripRef | null;
}

/** A refund request row joined for the admin review screen. */
export interface PendingRefund {
  id: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  created_at: string;
  passenger?: UserRef | null;
  driver?: Pick<UserRef, "id" | "full_name"> | null;
  booking?: BookingRef | null;
}
