/** Core domain types for Kipita — driver-created Trip model */

// ── User Mode ──
export type AppMode = "passenger" | "driver";

// ── Auth ──
export type AuthProvider = "phone" | "email" | "google";

// ── Enums ──
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";
export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";
export type VehicleType =
  | "sedan"
  | "suv"
  | "van"
  | "minibus"
  | "pickup"
  | "motorbike";
export type WalletTxnType =
  | "credit"
  | "debit"
  | "refund"
  | "payout"
  | "topup"
  | "fee";
export type DiscountType = "percentage" | "fixed";
export type MediaType =
  | "avatar"
  | "license"
  | "national_id"
  | "selfie"
  | "vehicle"
  | "insurance"
  | "other";

export interface User {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  preferred_language?: string;
  country?: string;
  city?: string | null;
  is_verified: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  status?: UserStatus;
  profile_prompt_dismissed_at?: string | null;
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PassengerProfile {
  id: string;
  user_id: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  default_pickup_notes: string | null;
  preferred_payment_method: PaymentMethod | null;
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  license_verified: boolean;
  license_expiry?: string | null;
  national_id?: string | null;
  profile_photo?: string | null;
  license_photo?: string | null;
  selfie_photo?: string | null;
  background_check_status?: KycStatus;
  approval_status?: KycStatus;
  is_active: boolean;
  is_online?: boolean;
  accepting_trips?: boolean;
  current_latitude?: number | null;
  current_longitude?: number | null;
  last_seen?: string | null;
  rating?: number;
  completed_trips?: number;
  cancelled_trips?: number;
  earnings?: number;
  created_at: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  vehicle_type?: VehicleType;
  seat_capacity?: number;
  seats_available: number;
  image_url: string | null;
  photo?: string | null;
  insurance_number?: string | null;
  insurance_expiry?: string | null;
  inspection_expiry?: string | null;
  registration_number?: string | null;
  active?: boolean;
  created_at: string;
  updated_at?: string;
}

// ── Cities ──
export interface City {
  id: string;
  name: string;
  county: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  created_at: string;
}

// ── Trips & Requests ──
export type TripStatus =
  | "posted"
  | "active"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RequestStatus =
  | "pending"
  | "matched"
  | "confirmed"
  | "cancelled"
  | "expired";
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface RidePreferences {
  luggage: boolean;
  pets: boolean;
  silent_ride: boolean;
  music: boolean;
}

/** A trip published by a driver. */
export interface Trip {
  id: string;
  driver_id: string;
  vehicle_id?: string | null;
  from_location: string;
  to_location: string;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  origin_city_id?: string | null;
  destination_city_id?: string | null;
  departure_date: string;
  departure_time: string;
  estimated_arrival?: string | null;
  seats_total: number;
  seats_available: number;
  price_per_seat: number;
  preferences: RidePreferences;
  description?: string | null;
  pickup_point?: string | null;
  dropoff_point?: string | null;
  allows_pets?: boolean;
  allows_smoking?: boolean;
  allows_luggage?: boolean;
  status: TripStatus;
  created_at: string;
  updated_at: string;
  // Joined
  driver?: User;
  vehicle?: Vehicle;
  origin_city?: City;
  destination_city?: City;
  stops?: TripStop[];
}

export interface TripStop {
  id: string;
  trip_id: string;
  stop_order: number;
  city_id: string | null;
  label: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  created_at: string;
  // Joined
  city?: City;
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  from_location: string;
  to_location: string;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  seats_needed: number;
  preferences: RidePreferences;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Joined
  passenger?: User;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  request_id?: string | null;
  seats_booked: number;
  total_price: number;
  status: BookingStatus;
  payment_status?: PaymentStatus | null;
  payment_id: string | null;
  booking_reference?: string;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  trip?: Trip;
  passenger?: User;
  driver?: User;
}

// ── Payment ──
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

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  payer_id?: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider_reference: string | null;
  transaction_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Wallet ──
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: WalletTxnType;
  reference: string | null;
  description: string | null;
  created_at: string;
}

// ── Promo Codes ──
export interface PromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

// ── Media ──
export interface Media {
  id: string;
  user_id: string;
  url: string;
  type: MediaType;
  mime_type: string | null;
  size: number | null;
  created_at: string;
}

// ── Saved Places & Emergency Contacts ──
export interface SavedPlace {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_home: boolean;
  is_work: boolean;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  created_at: string;
}

// ── Messages ──
export type MessageAttachmentType = "image" | "gif" | "audio";

export interface MessageAttachmentMeta {
  width?: number;
  height?: number;
  /** Voice-note length in milliseconds. */
  durationMs?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  attachment_type?: MessageAttachmentType | null;
  attachment_url?: string | null;
  attachment_meta?: MessageAttachmentMeta | null;
}

export interface Conversation {
  id: string;
  trip_id: string | null;
  request_id: string | null;
  participant_ids: string[];
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  // Joined
  participants?: User[];
  unread_count?: number;
}

// ── Alerts ──
export type AlertCategory =
  | "traffic"
  | "accident"
  | "road_closure"
  | "weather"
  | "police"
  | "general";

export interface Alert {
  id: string;
  user_id: string;
  location: string;
  category: AlertCategory;
  content: string;
  image_url: string | null;
  reactions_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
  user_reaction?: string | null;
}

export interface AlertComment {
  id: string;
  alert_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

// ── Notifications ──
export type NotificationType =
  | "ride_match"
  | "request_match"
  | "payment_success"
  | "payment_failed"
  | "trip_started"
  | "trip_completed"
  | "new_message"
  | "new_alert"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  read: boolean;
  created_at: string;
}

// ── Rating / Review ──
export interface Rating {
  id: string;
  booking_id: string;
  from_user_id: string;
  to_user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

// ── Location ──
export interface KenyanTown {
  name: string;
  county: string;
  lat: number;
  lng: number;
}

// ── Form Types ──
export interface RouteSearchForm {
  from: string;
  to: string;
  date: string | null;
  departure_time: string | null;
  preferences: RidePreferences;
}

// ── Sheet Types ──
export type SheetType =
  | "auth"
  | "ride_details"
  | "request_details"
  | "alert_details"
  | "person"
  | "payment"
  | "chat"
  | "trip_details"
  | "alert_post"
  | "profile_completion"
  | "report"
  | null;

export interface SheetPayload {
  auth: { returnAction?: () => void };
  ride_details: { trip: Trip };
  request_details: { request: RideRequest };
  alert_details: { alert: Alert };
  person: { user: User };
  payment: { booking: Booking };
  chat:
    | { conversationId: string }
    | { tripId?: string; requestId?: string; participantId: string };
  trip_details: { booking: Booking };
  alert_post: undefined;
  profile_completion: undefined;
  report: {
    type: "lost_item" | "safety" | "user";
    reportedUser?: User | null;
    booking?: Booking | null;
  };
}
