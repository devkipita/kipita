import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Security headers, built per-request so the CSP can carry a fresh nonce.
 *
 * The CSP is the real XSS control here. React escapes interpolated text, so the
 * app has no injection point today — but a CSP is what stops the *next* one
 * from being exploitable, and it costs nothing at runtime.
 *
 * Deliberately no `'strict-dynamic'`: it makes browsers ignore the `'self'`
 * host-source, so every script would need the nonce threaded through — and
 * reading the nonce in the root layout via `headers()` would force *every* page
 * to render dynamically, costing us static generation on /help and /legal/*.
 * `'self'` plus a nonce still blocks all injected inline script and all
 * third-party script hosts, which is the threat we care about. Next reads the
 * nonce out of the CSP request header and stamps its own inline bootstrap with
 * it automatically.
 *
 * `style-src` keeps `'unsafe-inline'`: styled-components flushes its SSR styles
 * as inline <style> tags, and inline *style* is not a script-execution vector.
 * Tightening that would mean nonce-ing the styled-components sheet, which buys
 * very little.
 */
export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const supabase = SUPABASE_URL;
  // Supabase Realtime rides a websocket on the same host.
  const supabaseSocket = supabase.replace(/^https:/, "wss:");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      // Next's dev overlay and Fast Refresh evaluate generated code.
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      supabase,
      "https://*.supabase.co",
      // Avatars from social sign-in are proxied through /api/avatar, but a
      // managed avatar URL is rendered directly.
      "https://lh3.googleusercontent.com",
      "https://avatars.githubusercontent.com",
      "https://graph.facebook.com",
    ],
    "connect-src": [
      "'self'",
      supabase,
      supabaseSocket,
      "https://*.supabase.co",
      "wss://*.supabase.co",
      // Landing-page IP geolocation for the "from" field.
      "https://ipapi.co",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Only force HTTPS upgrades in production — dev runs on plain http.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** Headers that don't vary per request. */
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // frame-ancestors above covers modern browsers; this covers the rest.
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};
