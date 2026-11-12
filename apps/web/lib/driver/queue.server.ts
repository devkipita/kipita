import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * How many drivers are waiting on a human.
 *
 * Verification is reviewed by hand, so the admin home needs to say that someone
 * is in the queue — nothing else tells them to go and look. Best effort: a
 * failed count must never take the admin dashboard down with it.
 */
export async function countPendingDrivers(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("driver_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("approval_status", "pending");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
