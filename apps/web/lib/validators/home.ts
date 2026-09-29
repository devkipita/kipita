import { z } from "zod";

/**
 * Validation for everything posted from the home page. Mirrors the rules mobile
 * enforces in the UI (`PostSheet.tsx`, `DriverKycSheet.tsx`) and the CHECK
 * constraints in migration 001, so a bad value is caught before Postgres has to
 * produce an error nobody can read.
 */

const location = z
  .string()
  .trim()
  .min(2, "Enter at least two characters")
  .max(120, "That place name is too long");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

const clockTime = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Pick a valid time");

export const preferencesSchema = z.object({
  luggage: z.boolean().default(false),
  pets: z.boolean().default(false),
  silent_ride: z.boolean().default(false),
  music: z.boolean().default(false),
});

// 1-8 matches `CHECK (seats_total >= 1 AND seats_total <= 8)` in migration 001.
const seats = z.number().int().min(1, "At least one seat").max(8, "At most eight seats");

export const postTripSchema = z.object({
  from_location: location,
  to_location: location,
  departure_date: isoDate,
  departure_time: clockTime,
  seats_total: seats,
  price_per_seat: z
    .number()
    .positive("Set a fare above zero")
    .max(100000, "That fare looks too high"),
  preferences: preferencesSchema,
});

export const postRequestSchema = z.object({
  from_location: location,
  to_location: location,
  preferred_date: isoDate.nullable(),
  preferred_time: clockTime.nullable(),
  seats_needed: seats,
  preferences: preferencesSchema,
});

export const alertSchema = z.object({
  category: z.enum([
    "traffic",
    "accident",
    "road_closure",
    "weather",
    "police",
    "general",
  ]),
  location: z.string().trim().min(2, "Where is this?").max(120, "Too long"),
  content: z
    .string()
    .trim()
    .min(3, "Say what's happening")
    .max(1000, "Keep it under 1000 characters"),
  image_url: z.string().url().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

export const commentSchema = z.object({
  alert_id: z.string().uuid(),
  content: z.string().trim().min(1, "Write a comment").max(1000, "Too long"),
});

// `license_number` is NOT NULL in migration 001 — the form must collect it.
export const driverKycSchema = z.object({
  national_id: z
    .string()
    .trim()
    .min(4, "Enter your national ID number")
    .max(40, "That doesn't look right"),
  license_number: z
    .string()
    .trim()
    .min(4, "Enter your licence number")
    .max(40, "That doesn't look right"),
  license_expiry: isoDate.nullable().optional(),
});

export type PostTripInput = z.infer<typeof postTripSchema>;
export type PostRequestInput = z.infer<typeof postRequestSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type DriverKycInput = z.infer<typeof driverKycSchema>;
