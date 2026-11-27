"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "app" }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <StatusPage
      title="We couldn't load that."
      lead="Try again."
      art={<BreakArt />}
      onRetry={reset}
    />
  );
}
