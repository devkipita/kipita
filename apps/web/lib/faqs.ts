import { createClient } from "@/lib/supabase/client";
import { isFaqTopic, type FaqTopic } from "@/lib/faq-topics";

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
  topic: FaqTopic;
};

export type FaqInput = {
  question: string;
  answer: string;
  sort_order?: number;
  is_published?: boolean;
  topic?: FaqTopic;
};

const COLUMNS = "id, question, answer, sort_order, is_published, topic";

/** A row from the faqs table. An unknown topic reads as general rather than breaking the page. */
function toFaq(row: Record<string, unknown>): Faq {
  return { ...(row as Omit<Faq, "topic">), topic: isFaqTopic(row.topic) ? row.topic : "general" };
}

/** Published FAQs in display order — what the /help page shows. */
export async function fetchPublishedFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toFaq);
}

/** Every FAQ (incl. drafts) — admin manager view. */
export async function fetchAllFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toFaq);
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
      topic: input.topic ?? "general",
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toFaq(data);
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
  return toFaq(data);
}

export async function deleteFaq(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
}
