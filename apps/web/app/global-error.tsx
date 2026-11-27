"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { landingFonts } from "@/components/landing/fonts";
import { StyledRegistry } from "@/components/providers/StyledRegistry";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "global" }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <html lang="en" className={landingFonts}>
      <body>
        <StyledRegistry>
          <ThemeProvider>
            <StatusPage
              title="Kipita hit a problem."
              lead="Something went wrong. Try again."
              art={<BreakArt />}
              onRetry={reset}
            />
          </ThemeProvider>
        </StyledRegistry>
      </body>
    </html>
  );
}
