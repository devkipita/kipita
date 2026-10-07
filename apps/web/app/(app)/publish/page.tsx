import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { PublishWizard } from "@/components/publish/PublishWizard";

export const metadata: Metadata = {
  title: "Publish a ride",
  description:
    "Offer your empty seats on Kipita. Set your route, your time and your fare, and get paid after the journey.",
  alternates: { canonical: "/publish" },
};

export default async function PublishPage() {
  await requireProfile("/publish");
  return <PublishWizard />;
}
