import "server-only";
import { createClient } from "@/lib/supabase/server";

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
