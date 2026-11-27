import type { Metadata } from "next";
import { StatusPage } from "@/components/ui/StatusPage";
import { DeadEndArt } from "@/components/ui/StatusArt";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="That road doesn't go anywhere."
      lead="This page doesn't exist."
      art={<DeadEndArt />}
    />
  );
}
