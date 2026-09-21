import { cookies } from "next/headers";
import { MODE_COOKIE, parseMode, type AppMode } from "./mode";

/**
 * The caller's current mode, from the cookie.
 *
 * Next forbids setting a cookie during render, so a first-time visitor gets
 * `passenger` resolved here and the cookie only materialises when they first
 * use the toggle. That matches mobile's default and matches reality — a new
 * user has no `driver_profiles` row.
 */
export async function readMode(): Promise<AppMode> {
  const jar = await cookies();
  return parseMode(jar.get(MODE_COOKIE)?.value);
}
