import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { AUTH_SECRET_KEY } from "./secret";

export type StepUpIntent = "recovery" | "signup";

const TTL_MS: Record<StepUpIntent, number> = {
  recovery: 15 * 60 * 1000,
  signup: 60 * 60 * 1000,
};

export function stepUpCookieName(intent: StepUpIntent): string {
  return `kipita_stepup_${intent}`;
}

function sign(intent: StepUpIntent, expiresAt: number, userId: string): string {
  return createHmac("sha256", AUTH_SECRET_KEY)
    .update(`${intent}.${expiresAt}.${userId}`)
    .digest("base64url");
}

function mintValue(intent: StepUpIntent, userId: string) {
  const expiresAt = Date.now() + TTL_MS[intent];
  return {
    value: `${expiresAt}.${userId}.${sign(intent, expiresAt, userId)}`,
    maxAge: Math.floor(TTL_MS[intent] / 1000),
  };
}

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

export function attachStepUpTicket(
  response: NextResponse,
  intent: StepUpIntent,
  userId: string,
): void {
  const { value, maxAge } = mintValue(intent, userId);
  response.cookies.set(stepUpCookieName(intent), value, {
    ...COOKIE_BASE,
    maxAge,
  });
}

export async function readStepUpTicket(
  intent: StepUpIntent,
): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(stepUpCookieName(intent))?.value;
  if (!raw) return null;

  const separator = raw.indexOf(".");
  const lastSeparator = raw.lastIndexOf(".");
  if (separator <= 0 || lastSeparator <= separator) return null;

  const expiresAt = Number(raw.slice(0, separator));
  const userId = raw.slice(separator + 1, lastSeparator);
  const signature = raw.slice(lastSeparator + 1);
  if (!Number.isFinite(expiresAt) || !userId || !signature) return null;
  if (Date.now() > expiresAt) return null;

  const expected = Buffer.from(sign(intent, expiresAt, userId));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  return userId;
}

export async function hasStepUpTicketFor(
  intent: StepUpIntent,
  userId: string,
): Promise<boolean> {
  const holder = await readStepUpTicket(intent);
  return holder !== null && holder === userId;
}

export async function clearStepUpTicket(intent: StepUpIntent): Promise<void> {
  const store = await cookies();
  store.set(stepUpCookieName(intent), "", { ...COOKIE_BASE, maxAge: 0 });
}
