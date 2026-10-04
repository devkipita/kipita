import { HelpContent } from "@/components/help/HelpContent";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata(
  "Help & FAQ",
  "Find answers about booking shared rides, M-Pesa payments, safety, and using Kipita across Kenya.",
  "/help",
);

export default function HelpPage() {
  return <HelpContent />;
}
