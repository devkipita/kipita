import { createClient } from "@/lib/supabase/client";

export async function recordRouteInterest(
  from: string,
  to: string,
): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    // The RPC is scoped to auth.uid(); anonymous browsing should not call it.
    if (!session) return;
    await supabase.rpc("record_route_interest", { p_from: from, p_to: to });
  } catch {
    /* empty */
  }
}
