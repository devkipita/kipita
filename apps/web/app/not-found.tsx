import type { Metadata } from "next";
import { StatusPage } from "@/components/ui/StatusPage";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="That road doesn't go anywhere."
      lead="The page you were looking for has moved or never existed. Let's get you back to the rides."
    />
  );
}
