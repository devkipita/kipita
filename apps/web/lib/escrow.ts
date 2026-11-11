import { createClient } from "@/lib/supabase/client";

export type EscrowRelease = {
  released: boolean;
  already?: boolean;
  driver_earning?: number;
  platform_fee?: number;
  reason?: string;
};

export async function releaseEscrow(
  bookingId: string,
): Promise<EscrowRelease | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("release-escrow", {
      body: { booking_id: bookingId },
    });
    if (error) return null;
    return data as EscrowRelease;
  } catch {
    return null;
  }
}

export async function releaseEscrowForAll(
  bookingIds: string[],
): Promise<number> {
  const results = await Promise.all(bookingIds.map(releaseEscrow));
  return results.filter((result) => result?.released).length;
}
