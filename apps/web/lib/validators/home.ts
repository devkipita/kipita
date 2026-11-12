import { z } from "zod";
import { PLATE_ERROR, formatPlate, isPlate } from "@/lib/home/plate";

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
  no_smoking: z.boolean().default(false),
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
  discount_percent: z
    .number()
    .int()
    .min(5, "The smallest discount is 5%")
    .max(60, "The largest discount is 60%")
    .nullable()
    .optional(),
  preferences: preferencesSchema,
  vehicle_make: z.string().trim().max(40).optional(),
  vehicle_model: z.string().trim().max(40).optional(),
  vehicle_color: z.string().trim().max(30).optional(),
  // How a passenger actually finds the car at the pickup point, so it has to
  // be a real plate rather than any string a client happens to send.
  vehicle_plate: z
    .string()
    .trim()
    .transform(formatPlate)
    .refine(isPlate, PLATE_ERROR)
    .optional(),
  vehicle_photo_url: z.string().url().max(500).optional(),
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

export const KYC_DOCUMENTS = {
  national_id: {
    label: "National ID",
    number: "ID number",
    placeholder: "e.g. 12345678",
    pattern: /^\d{7,9}$/,
    inputMode: "numeric",
    frame: "Front of your ID, all corners visible",
    error: "Enter the 7 to 9 digits on your ID.",
  },
  driving_licence: {
    label: "Driving licence",
    number: "Licence number",
    placeholder: "e.g. DL0123456",
    pattern: /^[A-Z]{1,3}\d{5,9}$/,
    inputMode: "text",
    frame: "Licence number clearly readable",
    error: "Enter it as printed, like DL0123456.",
  },
  passport: {
    label: "Passport",
    number: "Passport number",
    placeholder: "e.g. AK0123456",
    pattern: /^[A-Z]{1,2}\d{6,8}$/,
    inputMode: "text",
    frame: "Photo page, all text readable",
    error: "Enter it as printed, like AK0123456.",
  },
} as const;

export type KycDocumentType = keyof typeof KYC_DOCUMENTS;

export const driverKycSchema = z
  .object({
    document_type: z.enum(["national_id", "driving_licence", "passport"], {
      message: "Choose a document to continue.",
    }),
    document_number: z.string().trim().toUpperCase(),
    document_photo: z.string().min(3, "Add a photo of your document."),
    selfie_photo: z.string().min(3, "Add a profile photo."),
    vehicle_photo: z.string().min(3, "Add a photo of your car."),
  })
  .superRefine((value, ctx) => {
    const doc = KYC_DOCUMENTS[value.document_type];
    if (!doc.pattern.test(value.document_number)) {
      ctx.addIssue({ code: "custom", path: ["document_number"], message: doc.error });
    }
  });

export type PostTripInput = z.infer<typeof postTripSchema>;
export type PostRequestInput = z.infer<typeof postRequestSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
export type DriverKycInput = z.infer<typeof driverKycSchema>;
