"use server";

import { cookies } from "next/headers";
import { RAIL_COOKIE, RAIL_MAX_AGE } from "./rail";

export async function setRailCollapsedAction(collapsed: boolean): Promise<void> {
  const jar = await cookies();
  jar.set(RAIL_COOKIE, collapsed ? "collapsed" : "expanded", {
    path: "/",
    maxAge: RAIL_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
