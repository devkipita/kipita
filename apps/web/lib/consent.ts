export const CONSENT_COOKIE = "kipita-consent";
export const CONSENT_VERSION = "1";

export type Consent = "all" | "essential";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];
  if (!raw) return null;
  const [version, choice] = decodeURIComponent(raw).split(":");
  if (version !== CONSENT_VERSION) return null;
  return choice === "all" || choice === "essential" ? choice : null;
}

export function writeConsent(choice: Consent): void {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(`${CONSENT_VERSION}:${choice}`)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("kipita:consent", { detail: choice }));
}
