"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { loadPriceQuote } from "./quote.server";
import type { PriceQuote } from "./types";

const inputSchema = z.object({
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
  vehicleClass: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .max(40)
    .optional(),
  // Seats offered and people riding along: they keep the car type big enough for everyone.
  seats: z.number().int().min(1).max(8).optional(),
  others: z.number().int().min(0).max(7).optional(),
});

/** The recommended price range for a trip, for the Price step of Publish a ride. */
export async function getPriceQuoteAction(input: {
  from: string;
  to: string;
  vehicleClass?: string;
  seats?: number;
  others?: number;
}): Promise<PriceQuote> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { available: false, reason: "no_route" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false, reason: "error" };

  const gate = rateLimit(
    `price-quote:${user.id}`,
    LIMITS.priceQuote.limit,
    LIMITS.priceQuote.windowMs,
  );
  if (!gate.ok) return { available: false, reason: "error" };

  const { seats, others, ...route } = parsed.data;
  return loadPriceQuote(supabase, { ...route, seats, othersAboard: others });
}
