import { supabase } from '@/lib/supabase';
import {
  EMPTY_WALLET_SUMMARY,
  type WalletSummary,
  type WalletTransaction,
  type WalletWithdrawal,
} from '@kipita/shared';

const TXN_SELECT =
  'id, amount, type, reference, description, balance_after, booking_id, created_at';

const WITHDRAWAL_SELECT =
  'id, amount, phone, status, failure_reason, created_at, processed_at';

function toSummary(raw: Record<string, unknown>): WalletSummary {
  return {
    balance: Number(raw.balance ?? 0),
    currency: (raw.currency as string) ?? 'KES',
    in_escrow: Number(raw.in_escrow ?? 0),
    pending_earnings: Number(raw.pending_earnings ?? 0),
    lifetime_earnings: Number(raw.lifetime_earnings ?? 0),
    lifetime_topups: Number(raw.lifetime_topups ?? 0),
    pending_withdrawals: Number(raw.pending_withdrawals ?? 0),
  };
}

export async function fetchWalletSummary(): Promise<WalletSummary> {
  const { data, error } = await supabase.rpc('wallet_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_WALLET_SUMMARY;
  return toSummary(row as Record<string, unknown>);
}

export async function fetchWalletTransactions(
  limit = 40,
): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select(TXN_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      id: row.id as string,
      amount: Number(row.amount ?? 0),
      type: row.type as WalletTransaction['type'],
      reference: (row.reference as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      balance_after: row.balance_after == null ? null : Number(row.balance_after),
      booking_id: (row.booking_id as string | null) ?? null,
      created_at: row.created_at as string,
    };
  });
}

export async function fetchWithdrawals(limit = 10): Promise<WalletWithdrawal[]> {
  const { data, error } = await supabase
    .from('wallet_withdrawals')
    .select(WITHDRAWAL_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      id: row.id as string,
      amount: Number(row.amount ?? 0),
      phone: (row.phone as string) ?? '',
      status: row.status as WalletWithdrawal['status'],
      failure_reason: (row.failure_reason as string | null) ?? null,
      created_at: row.created_at as string,
      processed_at: (row.processed_at as string | null) ?? null,
    };
  });
}

export async function startTopup(params: {
  amount: number;
  phone: string;
}): Promise<{ topup_id: string; status?: string }> {
  const { data, error } = await supabase.functions.invoke('topup-wallet', {
    body: params,
  });
  if (error) throw new Error(await readFunctionError(error));
  return data as { topup_id: string; status?: string };
}

export type TopupOutcome = 'completed' | 'failed' | 'timeout';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pollTopupStatus(
  topupId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<TopupOutcome> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const { data } = await supabase
        .from('wallet_topups')
        .select('status')
        .eq('id', topupId)
        .single();

      const status = (data as { status?: string } | null)?.status;
      if (status === 'completed') return 'completed';
      if (status === 'failed') return 'failed';
    } catch {
      /* empty */
    }
    await sleep(intervalMs);
  }
  return 'timeout';
}

export async function requestWithdrawal(params: {
  amount: number;
  phone: string;
}): Promise<{ withdrawal_id: string; status: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke('withdraw-wallet', {
    body: params,
  });
  if (error) throw new Error(await readFunctionError(error));
  return data as { withdrawal_id: string; status: string; message?: string };
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* empty */
    }
  }
  const message = (error as { message?: string }).message;
  return message || 'Something went wrong. Please try again.';
}
