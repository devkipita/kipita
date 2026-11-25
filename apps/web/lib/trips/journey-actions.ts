"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { etaBetween } from "@/lib/maps/routes.server";

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

export async function rateBookingAction(
  bookingId: string,
  score: number,
  comment?: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_booking", {
    p_booking_id: bookingId,
    p_score: score,
    p_comment: comment ?? null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "You already rated this trip."
          : error.code === "22023"
            ? error.message
            : "We couldn't save that rating. Try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true, value: undefined };
}

export async function payWithWalletAction(bookingId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_booking_with_wallet", { p_booking_id: bookingId });

  if (error) {
    return {
      ok: false,
      error: /insufficient/i.test(error.message)
        ? "Not enough in your wallet."
        : error.code === "22023"
          ? error.message
          : "Payment failed. Nothing was charged.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  revalidatePath("/wallet");
  return { ok: true, value: undefined };
}

export async function contactPhoneAction(bookingId: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booking_contact_phone", { p_booking_id: bookingId });
  if (error) {
    return {
      ok: false,
      error: error.code === "22023" ? error.message : "We couldn't get that number. Try again.",
    };
  }
  if (!data) return { ok: false, error: "No verified number yet." };
  return { ok: true, value: data as string };
}

export async function etaAction(lat: number, lng: number, destination: string): Promise<number | null> {
  const profile = await getProfile();
  if (!profile || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return etaBetween(`${lat.toFixed(2)},${lng.toFixed(2)}`, destination);
}

