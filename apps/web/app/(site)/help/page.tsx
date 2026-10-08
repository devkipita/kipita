import { HelpContent } from "@/components/help/HelpContent";
import { createPageMetadata } from "@/lib/seo";
import { fetchPublishedFaqsServer } from "@/lib/faqs.server";

export const metadata = createPageMetadata(
  "Help & FAQ",
  "Find answers about booking shared rides, M-Pesa payments, safety, and using Kipita across Kenya.",
  "/help",
);

export default async function HelpPage() {
  const rows = await fetchPublishedFaqsServer();
  return (
    <HelpContent
      initialFaqs={rows.map((r) => ({ question: r.question, answer: r.answer }))}
    />
  );
}
