/** The profile shape the web app reads from the `users` table. */
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface Profile {
  id: string;
  auth_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  rating: number;
  total_trips: number;
  created_at: string;
}

export const PROFILE_COLUMNS =
  "id, auth_id, full_name, email, phone, avatar_url, date_of_birth, gender, city, country, is_verified, email_verified, phone_verified, rating, total_trips, created_at";
