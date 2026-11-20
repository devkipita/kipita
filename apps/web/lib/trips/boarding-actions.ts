"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Boarding, pickup codes and "report a problem" (migration 068). Every rule lives in the database; these
 * actions only translate its error codes into sentences a driver or passenger can act on.
 */

export type BoardingRow = {
  bookingId: string;
  passengerName: string;
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
  "42501": "Only the driver of this ride can do that.",
  P0002: "That booking no longer exists.",
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
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "We couldn't load the passenger list.") };
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map(
    (r): BoardingRow => ({
      bookingId: r.booking_id as string,
      passengerName: (r.passenger_name as string) || "Passenger",
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

export type BoardByCodeResult =
  | { ok: true }
  | { ok: false; error: string; wrongCode?: boolean; triesLeft?: number };

export async function boardWithCodeAction(bookingId: string, tripId: string, code: string): Promise<BoardByCodeResult> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const clean = code.replace(/\D/g, "");
  if (clean.length !== 4) return { ok: false, error: "The pickup code is 4 digits." };

  const { data, error } = await supabase.rpc("mark_boarded", { p_booking_id: bookingId, p_code: clean });
  if (error) {
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "We couldn't check that code. Please try again.") };
  }

  const result = (data ?? {}) as { ok?: boolean; reason?: string; tries_left?: number };
  if (result.ok === false) {
    const left = Number(result.tries_left ?? 0);
    return {
      ok: false,
      wrongCode: true,
      triesLeft: left,
      error:
        left > 0
          ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "Too many wrong codes. Ask the passenger to read the code from their booking, or mark them on board by hand.",
    };
  }

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
  if (reason.length < 3) return { ok: false, error: "Say why you are marking this passenger by hand." };

  const { error } = await supabase.rpc("mark_boarded_manually", { p_booking_id: bookingId, p_note: reason });
  if (error) {
    return { ok: false, error: dbMessage(error.code, error.message, BOARD_ERRORS, "We couldn't mark that passenger. Please try again.") };
  }

  revalidatePath(`/ride/${tripId}`);
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true };
}

// ── Passenger side ──────────────────────────────────────────────────────────────

export const PROBLEM_KINDS = [
  { value: "never_picked_up", label: "The driver never picked me up" },
  { value: "not_dropped_off", label: "I wasn't taken to where I was going" },
  { value: "unsafe_driving", label: "The driving felt unsafe" },
  { value: "asked_for_cash", label: "The driver asked me for extra money" },
  { value: "other", label: "Something else" },
] as const;

export type ProblemKind = (typeof PROBLEM_KINDS)[number]["value"];

const REPORT_ERRORS: Record<string, string> = {
  "28000": SESSION,
  "42501": "That isn't your booking.",
  P0002: "That booking no longer exists.",
  KP006: "The time to report a problem with this ride has passed. Contact support if you still need help.",
};

export async function reportProblemAction(
  bookingId: string,
  kind: ProblemKind,
  note: string,
): Promise<{ ok: true } | Fail> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const text = note.trim();
  if (text.length < 5) return { ok: false, error: "Tell us what happened, in a sentence or two." };

  const { error } = await supabase.rpc("report_problem", { p_booking_id: bookingId, p_kind: kind, p_note: text });
  if (error) {
    // KP006 has fixed wording above; the other custom codes use the database's own sentence.
    if (error.code === "KP006") return { ok: false, error: REPORT_ERRORS.KP006 };
    return { ok: false, error: dbMessage(error.code, error.message, REPORT_ERRORS, "We couldn't send that. Please try again.") };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  revalidatePath("/admin/problems");
  return { ok: true };
}

// ── Admin side ──────────────────────────────────────────────────────────────────

export async function resolveProblemAction(
  problemId: string,
  outcome: "clear" | "refund",
  note: string,
): Promise<{ ok: true } | Fail> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: SESSION };

  const { error } = await supabase.rpc("resolve_booking_problem", {
    p_problem_id: problemId,
    p_outcome: outcome,
    p_note: note.trim() || null,
  });
  if (error) {
    return {
      ok: false,
      error: dbMessage(error.code, error.message, { "28000": SESSION, "42501": "Admins only.", P0002: "That problem no longer exists." }, "We couldn't save that decision. Please try again."),
    };
  }

  revalidatePath("/admin/problems");
  return { ok: true };
}
