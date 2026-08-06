import { createClient } from "@/lib/supabase/client";

/**
 * Add an email to the pre-launch waitlist. Idempotent: a repeat signup hits the
 * case-insensitive unique index (Postgres error 23505) and is treated as a
 * success, so the visitor always sees a friendly confirmation.
 */
export async function joinWaitlist(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: email.trim().toLowerCase(), source: "landing" });

  if (error && error.code !== "23505") throw error;
}
