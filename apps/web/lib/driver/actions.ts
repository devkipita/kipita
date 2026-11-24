"use server";

import { revalidatePath } from "next/cache";
import { resolveAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { driverKycSchema, type DriverKycInput } from "@/lib/validators/home";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

export type KycResult = { ok: true } | { ok: false; error: string };

export async function submitDriverKycAction(
  input: DriverKycInput,
): Promise<KycResult> {
  const parsed = driverKycSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const { user, id } = await resolveAppUser(supabase);
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const me = id ? { id } : null;
  if (!me) {
    return {
      ok: false,
      error: "Your profile isn't ready yet. Sign out and back in, then try again.",
    };
  }

  const gate = rateLimit(
    `kyc:${me.id}`,
    LIMITS.submitKyc.limit,
    LIMITS.submitKyc.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const d = parsed.data;
  const { error } = await supabase.rpc("submit_driver_kyc", {
    p_document_type: d.document_type,
    p_document_number: d.document_number,
    p_document_photo: d.document_photo,
    p_selfie_photo: d.selfie_photo,
    p_vehicle_photo: d.vehicle_photo,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "22023"
          ? error.message
          : "We couldn't save that. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
