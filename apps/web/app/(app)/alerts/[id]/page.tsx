import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import {
  fetchAlertCommentsServer,
  fetchAlertServer,
} from "@/lib/alerts/server";
import { AlertThread } from "@/components/alerts/AlertThread";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Road alert",
  robots: { index: false, follow: false },
};

export default async function AlertPage({ params }: PageProps) {
  const { id } = await params;

  const [alert, comments, profile] = await Promise.all([
    fetchAlertServer(id),
    fetchAlertCommentsServer(id),
    getProfile(),
  ]);

  if (!alert) notFound();

  return (
    <AlertThread alert={alert} initialComments={comments} profile={profile} />
  );
}
