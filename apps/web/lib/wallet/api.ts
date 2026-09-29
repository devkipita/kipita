import type { WalletSummary } from "@kipita/shared";
import { createClient } from "@/lib/supabase/client";

export type TopupOutcome = "completed" | "failed" | "timeout";

export async function startTopup(params: {
  amount: number;
  phone: string;
}): Promise<{ topup_id: string; status?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("topup-wallet", {
    body: params,
  });
  if (error) throw new Error(await readFunctionError(error));
  return data as { topup_id: string; status?: string };
}

export async function pollTopupStatus(
  topupId: string,
  opts: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal } = {},
): Promise<TopupOutcome> {
  const supabase = createClient();
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return "timeout";
    try {
      const { data } = await supabase
        .from("wallet_topups")
        .select("status")
        .eq("id", topupId)
        .single();

      if (data?.status === "completed") return "completed";
      if (data?.status === "failed") return "failed";
    } catch {
      /* empty */
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return "timeout";
}

export async function requestWithdrawal(params: {
  amount: number;
  phone: string;
}): Promise<{ withdrawal_id: string; status: string; message?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("withdraw-wallet", {
    body: params,
  });
  if (error) throw new Error(await readFunctionError(error));
  return data as { withdrawal_id: string; status: string; message?: string };
}

export async function refreshSummary(): Promise<WalletSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("wallet_summary");
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    balance: Number(row.balance ?? 0),
    currency: (row.currency as string) ?? "KES",
    in_escrow: Number(row.in_escrow ?? 0),
    pending_earnings: Number(row.pending_earnings ?? 0),
    lifetime_earnings: Number(row.lifetime_earnings ?? 0),
    lifetime_topups: Number(row.lifetime_topups ?? 0),
    pending_withdrawals: Number(row.pending_withdrawals ?? 0),
  };
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* empty */
    }
  }
  const message = (error as { message?: string }).message;
  return message || "Something went wrong. Please try again.";
}
