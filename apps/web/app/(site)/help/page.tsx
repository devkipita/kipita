import type { Metadata } from "next";
import { HelpContent } from "@/components/help/HelpContent";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description: "Getting started, FAQs, and support for Kipita.",
};

export default function HelpPage() {
  return <HelpContent />;
}
