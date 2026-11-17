"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "admin" }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <StatusPage
      title="This admin page failed to load."
      lead="Try again. If it keeps failing, check Sentry for the error."
      art={<BreakArt />}
      onRetry={reset}
    />
  );
}
