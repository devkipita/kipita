import {
  EMPTY_WALLET_SUMMARY,
  type WalletSummary,
  type WalletTransaction,
  type WalletWithdrawal,
} from "@kipita/shared";
import { createClient } from "@/lib/supabase/server";

const TXN_SELECT =
  "id, amount, type, reference, description, balance_after, booking_id, created_at";

const WITHDRAWAL_SELECT =
  "id, amount, phone, status, failure_reason, created_at, processed_at";

function toSummary(raw: unknown): WalletSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
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

export async function fetchWalletSummary(): Promise<WalletSummary> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("wallet_summary");
    if (error || !data) return EMPTY_WALLET_SUMMARY;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return EMPTY_WALLET_SUMMARY;
    return toSummary(row);
  } catch {
    return EMPTY_WALLET_SUMMARY;
  }
}

export async function fetchWalletTransactions(
  limit = 40,
): Promise<WalletTransaction[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(TXN_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        id: row.id as string,
        amount: Number(row.amount ?? 0),
        type: row.type as WalletTransaction["type"],
        reference: (row.reference as string | null) ?? null,
        description: (row.description as string | null) ?? null,
        balance_after:
          row.balance_after == null ? null : Number(row.balance_after),
        booking_id: (row.booking_id as string | null) ?? null,
        created_at: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchWithdrawals(
  limit = 10,
): Promise<WalletWithdrawal[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallet_withdrawals")
      .select(WITHDRAWAL_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        id: row.id as string,
        amount: Number(row.amount ?? 0),
        phone: (row.phone as string) ?? "",
        status: row.status as WalletWithdrawal["status"],
        failure_reason: (row.failure_reason as string | null) ?? null,
        created_at: row.created_at as string,
        processed_at: (row.processed_at as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}
