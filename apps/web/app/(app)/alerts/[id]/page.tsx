import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertsScreen } from "@/components/alerts/AlertsScreen";
import { fetchAlertServer } from "@/lib/alerts/server";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const alert = await fetchAlertServer(id);
  if (!alert) return { title: "Road alert" };
  const place = alert.location.split(",")[0]?.trim() || alert.location;
  return {
    title: `${place}: road alert`,
    description: alert.content.slice(0, 160),
    alternates: { canonical: `/alerts/${alert.id}` },
  };
}

export default async function AlertPage({ params }: PageProps) {
  const { id } = await params;
  const alert = await fetchAlertServer(id);
  if (!alert) notFound();
  return <AlertsScreen openId={alert.id} />;
}
