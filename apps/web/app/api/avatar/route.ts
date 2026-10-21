import { NextResponse } from "next/server";
import { ipFromHeaders } from "@/lib/security/request";
import { enforce, LIMITS } from "@/lib/security/rate-limit";

const ALLOWED_HOSTS = ["avatars.githubusercontent.com", "graph.facebook.com"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_HOPS = 3;
const TIMEOUT_MS = 5000;

function isAllowedAvatarHost(hostname: string) {
  return (
    hostname === "googleusercontent.com" ||
    hostname.endsWith(".googleusercontent.com") ||
    ALLOWED_HOSTS.includes(hostname)
  );
}

function isAllowedTarget(target: URL) {
  return target.protocol === "https:" && isAllowedAvatarHost(target.hostname);
}

async function fetchAvatar(start: URL, signal: AbortSignal) {
  let target = start;

  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    const upstream = await fetch(target, {
      headers: { Accept: "image/*" },
      redirect: "manual",
      signal,
    });

    if (upstream.status < 300 || upstream.status >= 400) return upstream;

    const location = upstream.headers.get("location");
    if (!location) return upstream;

    let hopTarget: URL;
    try {
      hopTarget = new URL(location, target);
    } catch {
      return null;
    }
    if (!isAllowedTarget(hopTarget)) return null;
    target = hopTarget;
  }

  return null;
}

export async function GET(request: Request) {
  const ip = ipFromHeaders(request.headers);
  if (!enforce(`avatar:${ip}`, LIMITS.proxyIp).ok) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "Missing src" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src" }, { status: 400 });
  }

  if (!isAllowedTarget(target)) {
    return NextResponse.json(
      { error: "Unsupported avatar host" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetchAvatar(target, controller.signal);

    if (!upstream || !upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Avatar unavailable" }, { status: 404 });
    }

    const contentType = upstream.headers.get("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const declared = Number(upstream.headers.get("Content-Length"));
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      return NextResponse.json({ error: "Avatar too large" }, { status: 413 });
    }

    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Avatar too large" }, { status: 413 });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Avatar unavailable" }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
