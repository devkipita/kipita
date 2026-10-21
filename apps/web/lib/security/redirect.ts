const DEFAULT_NEXT = "/home";

function hasControlChars(value: string): boolean {
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function safeNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_NEXT,
): string {
  if (typeof value !== "string") return fallback;

  const raw = value.trim();
  if (!raw) return fallback;
  if (raw.length > 512) return fallback;
  if (hasControlChars(raw)) return fallback;

  const normalised = raw.replace(/\\/g, "/");
  if (!normalised.startsWith("/")) return fallback;
  if (normalised.startsWith("//")) return fallback;
  if (/^\/[^/]*:/.test(normalised)) return fallback;

  try {
    const parsed = new URL(normalised, "https://kipita.invalid");
    if (parsed.origin !== "https://kipita.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function isSameOrigin(
  candidate: string | null | undefined,
  origin: string,
): boolean {
  if (!candidate) return false;
  try {
    return new URL(candidate).origin === origin;
  } catch {
    return false;
  }
}
