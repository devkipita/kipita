const MESSAGES: Record<string, string> = {
  oauth_cancelled: "Google sign-in cancelled.",
  oauth_failed: "Google sign-in failed. Try again.",
  link_invalid: "That link isn't valid. Request a new one.",
  link_expired:
    "Link expired or used. Request a new one.",
  too_many_attempts: "Too many attempts. Try again later.",
  session_expired: "Session expired. Sign in again.",
};

export function authErrorMessage(code: string | null | undefined): string {
  if (!code) return "";
  return MESSAGES[code] ?? "";
}
