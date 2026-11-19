import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const profile = await requireProfile("/notifications");
  return <NotificationsView profile={profile} />;
}
