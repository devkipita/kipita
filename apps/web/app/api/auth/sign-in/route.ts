import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ipFromHeaders } from "@/lib/security/request";
import { enforce, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { safeNextPath } from "@/lib/security/redirect";
import { signInEmailSchema } from "@/lib/validators/auth";

const GENERIC = "That email and password don't match an account.";

function reject(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return reject("Bad request.", 400);
  try {
    if (new URL(origin).host !== host) return reject("Bad request.", 403);
  } catch {
    return reject("Bad request.", 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reject("Bad request.", 400);
  }

  const body = payload as { email?: unknown; password?: unknown; next?: unknown };
  const parsed = signInEmailSchema.safeParse({
    email: body.email,
    password: body.password,
  });
  if (!parsed.success) {
    return reject(parsed.error.issues[0]?.message ?? GENERIC, 400);
  }

  const ip = ipFromHeaders(request.headers);
  const identity = parsed.data.email.trim().toLowerCase();

  const byIp = enforce(`signin:ip:${ip}`, LIMITS.signInIp);
  if (!byIp.ok) return reject(retryMessage(byIp.retryAfterMs), 429);
  const byIdentity = enforce(`signin:id:${identity}`, LIMITS.signInIdentity);
  if (!byIdentity.ok) return reject(retryMessage(byIdentity.retryAfterMs), 429);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) return reject(GENERIC, 401);

  return NextResponse.json({
    ok: true,
    next: safeNextPath(typeof body.next === "string" ? body.next : undefined),
  });
}
