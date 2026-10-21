import "server-only";
import { headers } from "next/headers";

const UNKNOWN = "unknown";

export function ipFromHeaders(source: Headers): string {
  const forwarded = source.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    source.get("x-real-ip")?.trim() ||
    source.get("cf-connecting-ip")?.trim() ||
    UNKNOWN
  );
}

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

export async function siteOrigin(): Promise<string> {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[security] NEXT_PUBLIC_SITE_URL is not set. Emailed auth links need a " +
        "trusted origin that does not come from the Host header.",
    );
  }

  const source = await headers();
  const host = source.get("host") ?? "localhost:3000";
  const proto = source.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
