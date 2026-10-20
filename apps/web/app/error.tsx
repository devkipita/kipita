"use client";

import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusPage
      title="We couldn't load that."
      lead="This one is on us. Try again in a moment, or head back and pick up where you left off."
      art={<BreakArt />}
      onRetry={reset}
    />
  );
}
