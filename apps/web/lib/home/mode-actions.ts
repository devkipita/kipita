"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { MODE_COOKIE, MODE_MAX_AGE, type AppMode } from "./mode";

export type ModeResult =
  | { ok: true; mode: AppMode }
  | { ok: false; reason: "auth" | "kyc_required" };

/**
 * Switch the caller's mode, mirroring `apps/mobile/src/hooks/useRoleSwitch.ts`:
 * leaving driver mode is always free, entering it requires a `driver_profiles`
 * row. The check runs here rather than in the client because the cookie is a
 * preference, not a credential.
 */
export async function setModeAction(next: AppMode): Promise<ModeResult> {
  const mode: AppMode = next === "driver" ? "driver" : "passenger";

  if (mode === "driver") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: me } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!me) return { ok: false, reason: "auth" };

    const kyc = await fetchDriverKyc(supabase, me.id);
    if (!kyc.hasApplied) return { ok: false, reason: "kyc_required" };
  }

  const jar = await cookies();
  jar.set(MODE_COOKIE, mode, {
    path: "/",
    maxAge: MODE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  // The server render is uncached, but Next's client Router Cache holds the
  // RSC payload for ~30s — without this, navigating away and back shows the
  // old mode.
  revalidatePath("/home");
  return { ok: true, mode };
}
