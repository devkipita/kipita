const MESSAGES: Record<string, string> = {
  oauth_cancelled: "Google sign-in was cancelled. Try again when you're ready.",
  oauth_failed: "Google couldn't complete the sign-in. Try again.",
  link_invalid: "That link isn't valid. Request a new one.",
  link_expired:
    "That link has expired or was already used. Request a new one below.",
  too_many_attempts: "Too many attempts. Wait a few minutes and try again.",
  session_expired: "Your session expired. Sign in again.",
};

export function authErrorMessage(code: string | null | undefined): string {
  if (!code) return "";
  return MESSAGES[code] ?? "";
}
