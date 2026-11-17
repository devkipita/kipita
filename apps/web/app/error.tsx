"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "route" }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <StatusPage
      title="We couldn't load that."
      lead="This one is on us. Try again in a moment, or head back and pick up where you left off."
      art={<BreakArt />}
      onRetry={reset}
    />
  );
}
