import { createClient } from "@/lib/supabase/client";
import type { ToneName } from "@/lib/theme";

/**
 * Promotions data layer (browser client), mirroring `lib/faqs.ts`. Reads of
 * live offers are open via RLS; create/update/delete are admin-only and
 * enforced on the table itself (migration 018).
 *
 * Display-only — nothing here grants or redeems value. See the note at the top
 * of migration 018.
 */

export type PromotionKind = "discount" | "gift_card";
export type PromotionValueType = "percent" | "amount";

export type Promotion = {
  id: string;
  title: string;
  blurb: string;
  kind: PromotionKind;
  value_type: PromotionValueType;
  value_amount: number;
  code: string | null;
  tone: ToneName;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
};

export type PromotionInput = {
  title: string;
  blurb: string;
  kind?: PromotionKind;
  value_type?: PromotionValueType;
  value_amount: number;
  code?: string | null;
  tone?: ToneName;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  sort_order?: number;
};

export const PROMOTION_COLUMNS =
  "id, title, blurb, kind, value_type, value_amount, code, tone, is_active, starts_at, ends_at, sort_order";

/** Live offers in display order — what the home band shows. */
export async function fetchLivePromotions(): Promise<Promotion[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // The RLS policy already restricts this to live rows; filtering here as well
  // keeps the partial index hot and makes the intent legible.
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_COLUMNS)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Promotion[];
}

/** Every offer, including drafts, scheduled and expired — admin manager. */
export async function fetchAllPromotions(): Promise<Promotion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      title: input.title,
      blurb: input.blurb,
      kind: input.kind ?? "discount",
      value_type: input.value_type ?? "percent",
      value_amount: input.value_amount,
      code: input.code || null,
      tone: input.tone ?? "green",
      is_active: input.is_active ?? true,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      sort_order: input.sort_order ?? 0,
    })
    .select(PROMOTION_COLUMNS)
    .single();
  if (error) throw error;
  return data as Promotion;
}

export async function updatePromotion(
  id: string,
  patch: Partial<PromotionInput>,
): Promise<Promotion> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promotions")
    .update(patch)
    .eq("id", id)
    .select(PROMOTION_COLUMNS)
    .single();
  if (error) throw error;
  return data as Promotion;
}

export async function deletePromotion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

/* ── Pure helpers ── */

export type PromotionStatus = "live" | "draft" | "scheduled" | "expired";

export function promotionStatus(p: Promotion, now = new Date()): PromotionStatus {
  if (!p.is_active) return "draft";
  if (p.starts_at && new Date(p.starts_at) > now) return "scheduled";
  if (p.ends_at && new Date(p.ends_at) <= now) return "expired";
  return "live";
}

export function isLive(p: Promotion, now = new Date()): boolean {
  return promotionStatus(p, now) === "live";
}

/** "20% off" or "KES 500". */
export function formatPromotionValue(p: Promotion): string {
  if (p.value_type === "percent") return `${Math.round(p.value_amount)}% off`;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(p.value_amount);
}
