import type { Metadata } from "next";
import { KipitaLanding } from "@/components/landing/KipitaLanding";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <KipitaLanding />;
}
