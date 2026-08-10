import { createClient } from "@/lib/supabase/client";

/**
 * FAQ data layer (browser client). Reads are open to everyone via RLS;
 * create/update/delete are admin-only and enforced by RLS on the `faqs` table
 * (see migration 017). Used by the /help page (published only) and the admin
 * FAQ manager (all rows).
 */

export type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};

export type FaqInput = {
  question: string;
  answer: string;
  sort_order?: number;
  is_published?: boolean;
};

const COLUMNS = "id, question, answer, sort_order, is_published";

/** Published FAQs in display order — what the /help page shows. */
export async function fetchPublishedFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Faq[];
}

/** Every FAQ (incl. drafts) — admin manager view. */
export async function fetchAllFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Faq[];
}

export async function createFaq(input: FaqInput): Promise<Faq> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .insert({
      question: input.question,
      answer: input.answer,
      sort_order: input.sort_order ?? 0,
      is_published: input.is_published ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Faq;
}

export async function updateFaq(
  id: string,
  patch: Partial<FaqInput>,
): Promise<Faq> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Faq;
}

export async function deleteFaq(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
}
