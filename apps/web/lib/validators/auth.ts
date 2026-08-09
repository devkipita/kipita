import { z } from "zod";
import { isValidKeLocal } from "@/lib/auth/phone";

/**
 * Auth + profile validation. Mirrors the mobile app's rules so both clients
 * agree on what a valid identity looks like. Messages are user-facing.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .email("That doesn't look like a valid email");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Tell us your name")
  .max(60, "That name is a little long");

/** 9 national digits — the +254 prefix is added by the UI. */
export const keLocalPhoneSchema = z
  .string()
  .refine(isValidKeLocal, "Enter a valid Kenyan number");

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

/** Strong-ish password: length + a mix, kept friendly for real users. */
export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

export const signInEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signUpEmailSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
});

export const profileSchema = z.object({
  full_name: nameSchema,
  city: z.string().trim().max(60).optional().or(z.literal("")),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 16 && age <= 120;
    }, "You must be at least 16"),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional()
    .or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Score a password 0–4 for the strength meter (independent of hard rules). */
export function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
