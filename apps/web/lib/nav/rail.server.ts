import { cookies } from "next/headers";
import { RAIL_COOKIE, parseRail } from "./rail";

export async function readRailCollapsed(): Promise<boolean> {
  const jar = await cookies();
  return parseRail(jar.get(RAIL_COOKIE)?.value);
}
