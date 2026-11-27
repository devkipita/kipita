import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { release: process.env.NEXT_PUBLIC_RELEASE ?? "0.0.0", build: process.env.NEXT_PUBLIC_BUILD ?? "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
