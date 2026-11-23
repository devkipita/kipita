"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProblemKind } from "./problems";

/**
 * Boarding, pickup codes and "report a problem" (migration 070). Every rule lives in the database; these
 * actions only translate its error codes into sentences a driver or passenger can act on.
 */

export type BoardingRow = {
  bookingId: string;
  passengerId: string | null;
  passengerName: string;
  avatarUrl: string | null;
  seats: number;
  pickup: string | null;
  state: "waiting" | "boarded" | "no_show";
  method: "code" | "manual" | "legacy" | null;
  codeLocked: boolean;
  earning: number;
  /** ISO time from which a waiting passenger can be reported as a no-show. */
  noShowFrom: string | null;
};

type Fail = { ok: false; error: string };

const SESSION = "Your session expired. Sign in again.";

const BOARD_ERRORS: Record<string, string> = {
  "28000": SESSION,
  "42501": "Only the driver can do that.",
  P0002: "Booking not found.",
};

/** The database words most of these itself ("This ride has already started"), so its text is used. */
function dbMessage(code: string | undefined, text: string | undefined, table: Record<string, string>, fallback: string) {
  if (code === "22023" || code === "KP004" || code === "KP005" || code === "KP006") return text || fallback;
  return table[code ?? ""] ?? fallback;
}

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getBoardingStatusAction(
  tripId: string,
): Promise<{ ok: true; rows: BoardingRow[] } | Fail> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const { data, error } = await supabase.rpc("trip_boarding_status", { p_trip_id: tripId });
  if (error) {
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "Couldn't load passengers.") };
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const ids = [...new Set(raw.map((r) => r.passenger_id as string | null).filter((id): id is string => !!id))];
  const avatars = new Map<string, string | null>();
  if (ids.length) {
    const { data: people } = await supabase.from("users").select("id, avatar_url").in("id", ids);
    for (const p of people ?? []) avatars.set(p.id as string, (p.avatar_url as string | null) ?? null);
  }

  const rows = raw.map(
    (r): BoardingRow => ({
      bookingId: r.booking_id as string,
      passengerId: (r.passenger_id as string | null) ?? null,
      passengerName: (r.passenger_name as string) || "Passenger",
      avatarUrl: avatars.get(r.passenger_id as string) ?? null,
      seats: Number(r.seats_booked ?? 1),
      pickup: (r.pickup_location as string | null) ?? null,
      state: r.state as BoardingRow["state"],
      method: (r.boarded_method as BoardingRow["method"]) ?? null,
      codeLocked: Boolean(r.code_locked),
      earning: Number(r.driver_earning ?? 0),
      noShowFrom: (r.no_show_from as string | null) ?? null,
    }),
  );
  return { ok: true, rows };
}

export type BoardByCodeResult = { ok: true } | { ok: false; error: string; wrongCode?: boolean };

export async function boardWithCodeAction(bookingId: string, tripId: string, code: string): Promise<BoardByCodeResult> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const clean = code.replace(/\D/g, "");
  if (clean.length !== 4) return { ok: false, error: "Enter the 4-digit code." };

  const { data, error } = await supabase.rpc("mark_boarded", { p_booking_id: bookingId, p_code: clean });
  if (error) {
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "Try again.") };
  }

  // A wrong code is not an error from the database. The count of tries left is deliberately not shown: the
  // by-hand route simply appears once the list reports the code as locked.
  const result = (data ?? {}) as { ok?: boolean };
  if (result.ok === false) return { ok: false, wrongCode: true, error: "Wrong code." };

  revalidatePath(`/ride/${tripId}`);
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true };
}

export async function boardByHandAction(
  bookingId: string,
  tripId: string,
  note: string,
): Promise<{ ok: true } | Fail> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const reason = note.trim();
  if (reason.length < 3) return { ok: false, error: "Give a reason." };

  const { error } = await supabase.rpc("mark_boarded_manually", { p_booking_id: bookingId, p_note: reason });
  if (error) {
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "Try again.") };
  }

  revalidatePath(`/ride/${tripId}`);
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true };
}

const REPORT_ERRORS: Record<string, string> = {
  "28000": SESSION,
  "42501": "That isn't your booking.",
  P0002: "Booking not found.",
  KP006: "The time to report has passed. Contact support.",
};

export async function reportProblemAction(
  bookingId: string,
  kind: ProblemKind,
  note: string,
): Promise<{ ok: true } | Fail> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const text = note.trim();
  if (text.length < 5) return { ok: false, error: "Say what happened." };

  const { error } = await supabase.rpc("report_problem", { p_booking_id: bookingId, p_kind: kind, p_note: text });
  if (error) {
    // KP006 has fixed wording above; the other custom codes use the database's own sentence.
    if (error.code === "KP006") return { ok: false, error: REPORT_ERRORS.KP006 };
    return { ok: false, error: dbMessage(error.code, error.message, REPORT_ERRORS, "Try again.") };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  revalidatePath("/admin/problems");
  return { ok: true };
}
