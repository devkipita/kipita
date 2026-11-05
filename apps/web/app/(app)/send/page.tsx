import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KENYAN_TOWNS } from "@kipita/shared";
import { SendView } from "@/components/send/SendView";
import { fetchOpenCapacity } from "@/lib/send/server";
import { fetchPlatform } from "@/lib/platform.server";
import { flagOf } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Send something",
  description:
    "Move things with vehicles already going there. Kipita Send matches parcels and loads to empty return trips across Kenya.",
  alternates: { canonical: "/send" },
};

export default async function SendPage() {
  const platform = await fetchPlatform();
  if (!flagOf(platform, "send")) notFound();

  const capacity = await fetchOpenCapacity();
  const towns = KENYAN_TOWNS.slice(0, 40).map((t) => t.name);

  return <SendView capacity={capacity} towns={towns} />;
}
