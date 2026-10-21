import "server-only";
import { createHash } from "node:crypto";

const FALLBACK = "kipita-dev-only-insecure-secret";

function resolve(): string {
  const configured =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (configured && configured.length >= 32) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[security] AUTH_SECRET is missing or shorter than 32 characters. " +
        "Set it in the deployment environment: it signs the step-up tickets " +
        "that gate password changes.",
    );
  }

  return FALLBACK;
}

export const AUTH_SECRET_KEY = createHash("sha256")
  .update(resolve())
  .digest();
