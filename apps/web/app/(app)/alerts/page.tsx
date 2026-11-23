import type { Metadata } from "next";
import { AlertsScreen } from "@/components/alerts/AlertsScreen";

export const metadata: Metadata = {
  title: "Road alerts",
  description:
    "Live road conditions across Kenya, traffic, accidents, closures, police checks and weather, reported by drivers on the route.",
  alternates: { canonical: "/alerts" },
};

export default function AlertsPage() {
  return <AlertsScreen />;
}
