import { createClient } from "@/lib/supabase/client";

export type PaymentMethod = "mpesa" | "card";

export type InitiateResult = {
  payment_id: string;
  provider_reference?: string | null;
  status?: string;
};

export type PaymentErrorKind =
  | "offline"
  | "signed_out"
  | "not_found"
  | "not_awaiting"
  | "hold_expired"
  | "declined";

const PAYMENT_ERROR_COPY: Record<PaymentErrorKind, string> = {
  offline: "We couldn't reach M-Pesa. Check your connection and try again.",
  signed_out: "You've been signed out. Sign in again to pay.",
  not_found: "We couldn't find this booking.",
  not_awaiting: "This booking isn't waiting for payment any more. Check your trip.",
  hold_expired: "Your seat hold ran out before payment. Request the seat again.",
  declined: "M-Pesa didn't accept the request. Check the number and try again.",
};

export class PaymentError extends Error {
  readonly kind: PaymentErrorKind;

  constructor(kind: PaymentErrorKind) {
    super(PAYMENT_ERROR_COPY[kind]);
    this.name = "PaymentError";
    this.kind = kind;
  }
}

async function toPaymentError(error: unknown): Promise<PaymentError> {
  const name = (error as { name?: string } | null)?.name;
  const context = (error as { context?: unknown } | null)?.context;
  if (name !== "FunctionsHttpError" || !(context instanceof Response)) {
    return new PaymentError("offline");
  }

  let serverMessage = "";
  try {
    const body = (await context.clone().json()) as { error?: unknown };
    serverMessage = typeof body.error === "string" ? body.error : "";
  } catch {
    serverMessage = "";
  }

  if (context.status === 401) return new PaymentError("signed_out");
  if (context.status === 404) return new PaymentError("not_found");
  if (context.status === 409) {
    return new PaymentError(/expired/i.test(serverMessage) ? "hold_expired" : "not_awaiting");
  }
  return new PaymentError("declined");
}

export async function initiatePayment(params: {
  booking_id: string;
  method: PaymentMethod;
  phone?: string;
}): Promise<InitiateResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("initiate-payment", {
    body: params,
  });
  if (error) throw await toPaymentError(error);
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

export async function pollPaymentStatus(
  paymentId: string,
  opts: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal } = {},
): Promise<PollOutcome> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return "timeout";
    const status = await checkPaymentStatus(paymentId).catch(() => null);
    if (status === "completed") return "completed";
    if (status === "failed") return "failed";
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return "timeout";
}
