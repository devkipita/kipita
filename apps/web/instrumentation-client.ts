import * as Sentry from "@sentry/nextjs";
import { readConsent } from "@/lib/consent";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "production",
  sendDefaultPii: false,
  tracesSampleRate: readConsent() === "all" ? 0.1 : 0,
  integrations: [Sentry.browserTracingIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
