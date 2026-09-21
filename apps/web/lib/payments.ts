import { createClient } from "@/lib/supabase/client";

/**
 * M-Pesa payment for a web booking.
 *
 * Mirrors `apps/mobile/src/lib/api/payments.ts` so both clients drive the same
 * backend: `initiate-payment` fires a Daraja STK push, Safaricom calls our
 * `mpesa-callback` once the passenger enters their PIN, and that flips the
 * `payments` row to `completed` (funds held in escrow) or `failed`. The client's
 * only job is to start it and watch the row.
 *
 * The fee split lives in `@kipita/shared` and is enforced server-side by
 * `release-escrow`; anything computed here is preview only.
 */

export type PaymentMethod = "mpesa" | "card";

export type InitiateResult = {
  payment_id: string;
  provider_reference?: string | null;
  status?: string;
};

export async function initiatePayment(params: {
  booking_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<InitiateResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("initiate-payment", {
    body: params,
  });
  if (error) throw error;
  return data as InitiateResult;
}

export async function checkPaymentStatus(paymentId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("status")
    .eq("id", paymentId)
    .single();
  if (error) throw error;
  return (data?.status as string) ?? "pending";
}

export type PollOutcome = "completed" | "failed" | "timeout";

/**
 * Watch the payment row until Safaricom's callback resolves it.
 *
 * A timeout is not a failure: the STK push may still be sitting on the
 * passenger's phone, and the callback can land after we stop looking. The
 * caller says so rather than claiming the payment failed.
 */
export async function pollPaymentStatus(
  paymentId: string,
  opts: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal } = {},
): Promise<PollOutcome> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return "timeout";
    try {
      const status = await checkPaymentStatus(paymentId);
      if (status === "completed") return "completed";
      if (status === "failed") return "failed";
    } catch {
      // Transient — keep watching until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return "timeout";
}

/** 9 national digits, with or without the +254 / 0 prefix. */
export function isValidKenyanPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits.length === 12;
  if (digits.startsWith("0")) return digits.length === 10;
  return digits.length === 9;
}

/** Normalise to the 2547XXXXXXXX form Daraja expects. */
export function toDarajaPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("254")) digits = `254${digits}`;
  return digits;
}
