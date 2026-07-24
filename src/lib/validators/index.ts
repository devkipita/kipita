import { z } from 'zod';

/** Kenyan phone: +254... or 07... or 01... */
const kenyanPhoneRegex = /^(\+254|0)(7|1)\d{8}$/;

export const phoneSchema = z.string().regex(kenyanPhoneRegex, 'Enter a valid Kenyan phone number');

export const emailSchema = z.string().email('Enter a valid email');

export const otpSchema = z.string().length(6, 'Enter 6-digit code');

export const passwordSchema = z.string().min(8, 'At least 8 characters');

export const routeSearchSchema = z.object({
  from: z.string().min(2, 'Select departure'),
  to: z.string().min(2, 'Select destination'),
  date: z.string().nullable(),
  departure_time: z.string().nullable(),
  preferences: z.object({
    luggage: z.boolean(),
    pets: z.boolean(),
    silent_ride: z.boolean(),
    music: z.boolean(),
  }),
});

export const alertPostSchema = z.object({
  location: z.string().min(2, 'Enter location'),
  category: z.enum(['traffic', 'accident', 'road_closure', 'weather', 'police', 'general']),
  content: z.string().min(3, 'Describe what\'s happening').max(280),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Enter your name'),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
});

export const tripPostSchema = z.object({
  from_location: z.string().min(2),
  to_location: z.string().min(2),
  departure_date: z.string(),
  departure_time: z.string(),
  seats_total: z.number().min(1).max(8),
  price_per_seat: z.number().min(1),
  preferences: z.object({
    luggage: z.boolean(),
    pets: z.boolean(),
    silent_ride: z.boolean(),
    music: z.boolean(),
  }),
});
