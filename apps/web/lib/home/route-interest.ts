import { createClient } from "@/lib/supabase/client";

export async function recordRouteInterest(
  from: string,
  to: string,
): Promise<void> {
  try {
    await createClient().rpc("record_route_interest", {
      p_from: from,
      p_to: to,
    });
  } catch {
    /* empty */
  }
}
