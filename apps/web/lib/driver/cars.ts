"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PLATE_ERROR, isPlate } from "@/lib/home/plate";
import type { GarageCar } from "@/lib/home/vehicle";

export type CarInput = { make: string; model: string; plate: string; color: string };

export type CarResult = { ok: true; car: GarageCar } | { ok: false; error: string };

async function currentUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("id").eq("auth_id", user.id).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function saveCarAction(input: CarInput): Promise<CarResult> {
  const titled = (s: string) => s.trim().replace(/\s+/g, " ").replace(/(^|\s)(\p{Ll})/gu, (_, sp, ch) => sp + ch.toUpperCase());
  const make = titled(input.make).slice(0, 40);
  const model = titled(input.model).slice(0, 40);
  const plate = input.plate.trim().toUpperCase();
  const color = input.color.trim().slice(0, 30);

  if (!make || !model) return { ok: false, error: "Add the make and model." };
  if (!isPlate(plate)) return { ok: false, error: PLATE_ERROR };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { ok: false, error: "Your session expired. Sign in again." };

  const { data: mine } = await supabase
    .from("vehicles")
    .select("id")
    .eq("driver_id", userId)
    .eq("plate_number", plate)
    .maybeSingle();

  const fields = { make, model, plate_number: plate, color: color || "Unspecified" };

  const { data, error } = mine
    ? await supabase.from("vehicles").update(fields).eq("id", mine.id).select("id").maybeSingle()
    : await supabase
        .from("vehicles")
        .insert({ ...fields, driver_id: userId, year: new Date().getFullYear() })
        .select("id")
        .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "That plate is already registered to another account."
          : "We couldn't save that car. Please try again.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/publish");
  return { ok: true, car: { id: data.id as string, make, model, plate, color } };
}

export async function deleteCarAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("vehicles").delete().eq("id", id).eq("driver_id", userId);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "This car is on one of your rides, so it has to stay."
          : "We couldn't remove that car. Please try again.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/publish");
  return { ok: true };
}
