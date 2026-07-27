import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/api/queryKeys";
import { useChatStore } from "@/store/slices/chat";
import { useTripStore } from "@/store/slices/trip";
import type { Booking, Message } from "@/types";

/**
 * Single multiplexed Supabase Realtime connection for the whole app.
 *
 * Everything realtime rides this one gateway — nothing else opens a channel.
 * It patches the React Query cache and the chat/trip stores surgically instead
 * of blindly invalidating, so a burst of events doesn't trigger a refetch storm.
 *
 * Uses Postgres Changes (works with stock Supabase + RLS). The event contracts
 * are isolated here, so we can later swap to broadcast-from-trigger without
 * touching feature code.
 */
class RealtimeGateway {
  private userId: string | null = null;
  private channels = new Map<string, RealtimeChannel>();

  /** Begin listening for a signed-in user. Safe to call repeatedly. */
  start(userId: string) {
    if (this.userId === userId) return;
    this.stop();
    this.userId = userId;
    this.subscribeBookings(userId);
    // Reconnected → drain anything queued while we were offline.
    void useChatStore.getState().flushOutbox();
  }

  /** Tear everything down (sign-out / app teardown). */
  stop() {
    for (const ch of this.channels.values()) void supabase.removeChannel(ch);
    this.channels.clear();
    this.userId = null;
  }

  private register(name: string, channel: RealtimeChannel) {
    this.channels.set(name, channel);
    channel.subscribe();
  }

  private leave(name: string) {
    const ch = this.channels.get(name);
    if (ch) {
      void supabase.removeChannel(ch);
      this.channels.delete(name);
    }
  }

  // ── Bookings: keep the trips list + live trip screen in sync ──
  private subscribeBookings(userId: string) {
    const onChange = (payload: RealtimePostgresChangesPayload<Booking>) => {
      const row = payload.new as Booking;
      if (!row?.id) return;
      // The realtime row is un-joined; only push the authoritative status and
      // let the (invalidated) query refetch the joined trip/driver/passenger.
      useTripStore.getState().setStatus(row.id, row.status);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
    };

    for (const [suffix, column] of [
      ["passenger", "passenger_id"],
      ["driver", "driver_id"],
    ] as const) {
      const name = `bookings-${suffix}`;
      this.register(
        name,
        supabase.channel(name).on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `${column}=eq.${userId}`,
          },
          onChange,
        ),
      );
    }
  }

  // ── Messaging: join a conversation while its screen is open ──
  joinConversation(conversationId: string): () => void {
    const name = `conv-${conversationId}`;
    if (this.channels.has(name)) return () => this.leave(name);

    const channel = supabase.channel(name).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        const msg = payload.new as Message;
        if (msg?.id) useChatStore.getState().receive(msg);
      },
    );

    this.register(name, channel);
    return () => this.leave(name);
  }
}

export const gateway = new RealtimeGateway();
