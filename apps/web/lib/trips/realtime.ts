"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "./types";

export type BookingRow = {
  id: string;
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  status: BookingStatus;
  seats_booked: number;
  total_price: number;
  expires_at: string | null;
};

export type BookingEvent = "INSERT" | "UPDATE";

export function useRowStream<T>(
  channelName: string,
  table: string,
  filter: string | null,
  onRow: (row: T, event: BookingEvent) => void,
): void {
  const handler = useRef(onRow);
  handler.current = onRow;

  useEffect(() => {
    if (!filter) return;
    const where = filter;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function open() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      } catch {}
      if (cancelled) return;
      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: where }, ({ new: row }) =>
          handler.current(row as T, "INSERT"),
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: where }, ({ new: row }) =>
          handler.current(row as T, "UPDATE"),
        )
        .subscribe();
    }

    void open();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [channelName, table, filter]);
}

export function useBookingStream(
  channelName: string,
  filter: string | null,
  onChange: (row: BookingRow, event: BookingEvent) => void,
): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!filter) return;
    const where = filter;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function open() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      } catch {
        /* a failed handshake degrades to the server-rendered list */
      }
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings", filter: where },
          ({ new: row }) => handler.current(row as BookingRow, "INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bookings", filter: where },
          ({ new: row }) => handler.current(row as BookingRow, "UPDATE"),
        )
        .subscribe();
    }

    void open();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [channelName, filter]);
}
