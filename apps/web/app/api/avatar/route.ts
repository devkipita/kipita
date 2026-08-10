import { NextResponse } from "next/server";

const ALLOWED_HOSTS = ["avatars.githubusercontent.com", "graph.facebook.com"];

function isAllowedAvatarHost(hostname: string) {
  return (
    hostname === "googleusercontent.com" ||
    hostname.endsWith(".googleusercontent.com") ||
    ALLOWED_HOSTS.includes(hostname)
  );
}

export async function GET(request: Request) {
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

  if (
    !/^https?:$/.test(target.protocol) ||
    !isAllowedAvatarHost(target.hostname)
  ) {
    return NextResponse.json(
      { error: "Unsupported avatar host" },
      { status: 400 },
    );
  }

  const upstream = await fetch(target, {
    headers: {
      Accept: "image/*",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Avatar unavailable" }, { status: 404 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
