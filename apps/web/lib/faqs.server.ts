import "server-only";
import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import { isFaqTopic } from "./faq-topics";
import type { Faq } from "./faqs";

const COLUMNS = "id, question, answer, sort_order, is_published, topic";

export const fetchPublishedFaqsServer = unstable_cache(
  async function fetchPublishedFaqsServer(): Promise<Faq[]> {
    try {
      const { data, error } = await supabasePublic
        .from("faqs")
        .select(COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return (data ?? []).map((row) => ({
        ...(row as Omit<Faq, "topic">),
        topic: isFaqTopic(row.topic) ? row.topic : "general",
      }));
    } catch {
      return [];
    }
  },
  ["published-faqs"],
  { revalidate: 3600, tags: ["faqs"] },
);
