export type ReferralStatus = "pending" | "rewarded" | "void";

export type ReferralTierName = "bronze" | "silver" | "gold";

export interface ReferralTier {
  name: ReferralTierName;
  label: string;
  /** Rewarded referrals needed to reach this tier. */
  at: number;
  /** What the referrer earns per conversion while on this tier. */
  reward: number;
}

export const REFEREE_REWARD = 100;

export const REFERRAL_TIERS: ReferralTier[] = [
  { name: "bronze", label: "Bronze", at: 0, reward: 200 },
  { name: "silver", label: "Silver", at: 3, reward: 250 },
  { name: "gold", label: "Gold", at: 10, reward: 300 },
];

export interface ReferralSummary {
  code: string;
  joined: number;
  pending: number;
  earned: number;
  tier: ReferralTierName;
}

export interface ReferralEntry {
  id: string;
  name: string;
  status: ReferralStatus;
  reward: number;
  created_at: string;
  rewarded_at: string | null;
}

export const EMPTY_REFERRAL_SUMMARY: ReferralSummary = {
  code: "",
  joined: 0,
  pending: 0,
  earned: 0,
  tier: "bronze",
};

export function tierFor(joined: number): ReferralTier {
  let current = REFERRAL_TIERS[0];
  for (const tier of REFERRAL_TIERS) {
    if (joined >= tier.at) current = tier;
  }
  return current;
}

export function nextTier(joined: number): ReferralTier | null {
  return REFERRAL_TIERS.find((tier) => joined < tier.at) ?? null;
}

/** How far through the current tier the user is, 0..1. */
export function tierProgress(joined: number): number {
  const next = nextTier(joined);
  if (!next) return 1;
  const current = tierFor(joined);
  const span = next.at - current.at;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (joined - current.at) / span));
}

export function toGo(joined: number): number {
  const next = nextTier(joined);
  return next ? Math.max(0, next.at - joined) : 0;
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

export function shareMessage(code: string, link: string): string {
  return `Use my code ${code} on Kipita and we both get credit after your first ride. ${link}`;
}

export function isValidReferralCode(value: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(value.trim().toUpperCase());
}
