/**
 * Guards for URLs that came from user input or the database.
 *
 * React escapes text, but it does not vet the *value* of `src`/`href`. A stored
 * `javascript:` URL in an anchor is a live XSS vector, and `data:` URLs can
 * carry an SVG that executes script when navigated to. Everything
 * user-controlled goes through here before it reaches the DOM.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

/** An http(s) URL, or null. Relative paths are allowed (they can't switch protocol). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Relative or root-relative — same origin by construction.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** True when this URL is safe to hand to an <img src>. */
export function isSafeImageUrl(value: string | null | undefined): value is string {
  return safeHttpUrl(value) !== null;
}

/**
 * A `tel:` href built from a stored phone number. Strips everything that isn't
 * a dialable character so the value can never carry a second scheme.
 */
export function safeTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}
