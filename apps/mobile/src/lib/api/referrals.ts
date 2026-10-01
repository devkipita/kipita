import { supabase } from '@/lib/supabase';
import {
  EMPTY_REFERRAL_SUMMARY,
  type ReferralEntry,
  type ReferralSummary,
} from '@kipita/shared';

export async function fetchReferralSummary(): Promise<ReferralSummary> {
  const { data, error } = await supabase.rpc('referral_summary');
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | undefined;
  if (!row) return EMPTY_REFERRAL_SUMMARY;

  const joined = Number(row.joined ?? 0);
  return {
    code: (row.code as string) ?? '',
    joined,
    pending: Number(row.pending ?? 0),
    earned: Number(row.earned ?? 0),
    tier: joined >= 10 ? 'gold' : joined >= 3 ? 'silver' : 'bronze',
  };
}

export async function fetchReferrals(limit = 30): Promise<ReferralEntry[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select(
      'id, status, referrer_reward, created_at, rewarded_at, referee:users!referee_id ( full_name )',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const referee = Array.isArray(row.referee) ? row.referee[0] : row.referee;
    const person = (referee ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (person.full_name as string) || 'New rider',
      status: row.status as ReferralEntry['status'],
      reward: Number(row.referrer_reward ?? 0),
      created_at: row.created_at as string,
      rewarded_at: (row.rewarded_at as string | null) ?? null,
    };
  });
}

export async function claimReferral(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_referral', {
    p_code: code.trim().toUpperCase(),
  } as never);
  if (error) throw error;
  return Boolean(data);
}
