"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FinishScene } from "@/components/trips/FinishScene";

type Done = {
  passengerName: string | null;
  passengers: number;
  seats: number;
  payout: number | null;
  startedAt: string | null;
  completedAt: string | null;
};

async function loadDone(tripId: string): Promise<Done | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, seats_booked, started_at, completed_at, passenger:users!passenger_id ( full_name )")
    .eq("trip_id", tripId)
    .eq("status", "completed");
  if (error) return null;
  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string);
  const payouts =
    ids.length > 0
      ? await supabase.from("wallet_transactions").select("amount").eq("type", "payout").in("booking_id", ids)
      : { data: [], error: null };
  const starts = rows.map((r) => r.started_at as string | null).filter((v): v is string => !!v).sort();
  const ends = rows.map((r) => r.completed_at as string | null).filter((v): v is string => !!v).sort();
  const only = rows.length === 1 ? rows[0].passenger : null;
  const person = (Array.isArray(only) ? only[0] : only) as { full_name: string | null } | null;
  return {
    passengerName: person?.full_name?.trim().split(" ")[0] ?? null,
    passengers: rows.length,
    seats: rows.reduce((sum, r) => sum + Number(r.seats_booked ?? 0), 0),
    payout: payouts.error ? null : (payouts.data ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
    startedAt: starts[0] ?? null,
    completedAt: ends[ends.length - 1] ?? null,
  };
}

export function RideFinish({
  tripId,
  destination,
  pending = false,
}: {
  tripId: string;
  destination: string;
  pending?: boolean;
}) {
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    if (pending) {
      setDone(null);
      return;
    }
    let alive = true;
    void loadDone(tripId).then((d) => {
      if (alive) setDone(d);
    });
    return () => {
      alive = false;
    };
  }, [tripId, pending]);

  return (
    <FinishScene
      destination={destination}
      startedAt={done?.startedAt ?? null}
      completedAt={done?.completedAt ?? null}
      amount={done?.payout ?? null}
      seats={done?.seats ?? 0}
      passengers={done?.passengers}
      passengerName={done?.passengerName ?? undefined}
      isDriver
    />
  );
}
