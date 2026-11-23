"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { PaperPlaneTilt } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { createClient } from "@/lib/supabase/client";
import { useRowStream } from "@/lib/trips/realtime";
import { ChatHelloArt } from "./CancelArt";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const COLUMNS = "id, conversation_id, sender_id, content, created_at";

const Feed = styled.ol`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 16px;
  list-style: none;
  background: ${nocturne.surface};
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const Day = styled.li`
  align-self: center;
  margin: 8px 0 4px;
  padding: 4px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  font-size: 12px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const Sender = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  margin: 16px 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: ${nocturne.cream};
`;

const Bubble = styled.li<{ $mine: boolean; $first: boolean; $last: boolean }>`
  align-self: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  max-width: 80%;
  margin-top: ${({ $first, $mine }) => ($first && $mine ? "16px" : "4px")};
  padding: 8px 12px;
  border-radius: ${({ $mine, $last }) =>
    $mine ? ($last ? "20px 20px 4px 20px" : "20px") : $last ? "20px 20px 20px 4px" : "20px"};
  background: ${({ $mine, theme }) => ($mine ? nocturne.green : theme.color.secondaryContainer)};
  color: ${({ $mine, theme }) => ($mine ? nocturne.onGreen : theme.color.onSecondaryContainer)};
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const Stamp = styled.li<{ $mine: boolean }>`
  align-self: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  margin-top: 4px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${nocturne.cream};
  font-variant-numeric: tabular-nums;
`;

const Empty = styled.li`
  margin: auto;
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;

  svg {
    max-width: 200px;
    margin-bottom: 12px;
  }

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 18px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  span {
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const Foot = styled.div`
  border-top: 1px solid ${nocturne.line};
  background: ${nocturne.surface};
`;

const Compose = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin: 8px 12px calc(10px + env(safe-area-inset-bottom));
  padding: 4px 4px 4px 16px;
  border: 1.5px solid ${nocturne.muted2};
  border-radius: 26px;
  background: ${nocturne.surface};
  transition: border-color ${dur.state} ${ease.standard};

  &:focus-within {
    border-color: ${nocturne.accent};
  }

  textarea {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    max-height: 140px;
    padding: 9px 0;
    border: 0;
    background: transparent;
    color: ${nocturne.cream};
    font: inherit;
    font-size: 16px;
    line-height: 1.35;
    resize: none;
    field-sizing: content;
  }
  textarea:focus {
    outline: none;
  }
  textarea::placeholder {
    color: ${nocturne.muted2};
  }
`;

const Send = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  cursor: pointer;
  transition: transform ${dur.press} ${ease.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

const Quick = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 12px 0;
`;

const QuickBtn = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 12px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -6px 0;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: color-mix(in oklab, ${({ theme }) => theme.tone.blue.bg} 86%, ${({ theme }) => theme.tone.blue.on});
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export type ChatRole = "driver" | "passenger";

function suggestions(role: ChatRole, status: string): string[] {
  if (role === "driver") {
    if (status === "in_progress") return ["Arriving in 5 min", "Slow traffic ahead", "Stopping briefly", "Thanks for riding"];
    if (status === "completed") return ["Thanks for riding", "You left something", "Safe travels", "See you next time"];
    return ["On my way to pickup", "I've arrived", "Running 5 min late", "Where exactly are you?"];
  }
  if (status === "in_progress") return ["Can we stop briefly?", "Please slow down", "Drop me here", "Thank you"];
  if (status === "completed") return ["Thanks for the ride", "I left something", "Safe travels", "See you next time"];
  return ["I'm at the pickup", "Running 5 min late", "Where are you now?", "Space for a bag?"];
}

function dayOf(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}

export default function ChatPanel({
  open,
  bookingId,
  me,
  otherName,
  otherAvatar,
  role,
  status,
}: {
  open: boolean;
  bookingId: string;
  me: string;
  otherName: string;
  otherAvatar?: string | null;
  role: ChatRole;
  status: string;
}) {
  const [conv, setConv] = useState<string | null>(null);
  const [items, setItems] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || conv) return;
    let live = true;
    const supabase = createClient();
    setError("");
    (async () => {
      const { data: id, error: rpcErr } = await supabase.rpc("booking_conversation", { p_booking_id: bookingId });
      if (!live) return;
      if (rpcErr || !id) {
        setError(rpcErr?.code === "22023" ? rpcErr.message : "We couldn't open messages.");
        return;
      }
      setConv(id as string);
      const { data, error: err } = await supabase
        .from("messages")
        .select(COLUMNS)
        .eq("conversation_id", id as string)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!live) return;
      if (err) setError("We couldn't load messages.");
      else setItems(((data as Message[]) ?? []).reverse());
    })().catch(() => {
      if (live) setError("We couldn't open messages.");
    });
    return () => {
      live = false;
    };
  }, [open, conv, bookingId, attempt]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 120);
    return () => clearTimeout(t);
  }, [open]);

  useLayoutEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, open]);

  const receive = useCallback((row: Message) => {
    setItems((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
  }, []);

  const refresh = useCallback(async (id: string) => {
    const { data, error: err } = await createClient()
      .from("messages")
      .select(COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (err || !data) return;
    setItems((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of data as Message[]) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  useEffect(() => {
    if (!open || !conv) return;
    void refresh(conv);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(conv);
    }, 8000);
    const onShow = () => {
      if (document.visibilityState === "visible") void refresh(conv);
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [open, conv, refresh]);

  useRowStream<Message>(`chat:${conv}`, "messages", conv ? `conversation_id=eq.${conv}` : null, receive);

  async function send(e: React.FormEvent, quick?: string) {
    e.preventDefault();
    const text = (quick ?? draft).trim();
    if (!text || !conv || sending) return;
    setSending(true);
    setError("");
    const { data, error: err } = await createClient()
      .from("messages")
      .insert({ conversation_id: conv, sender_id: me, content: text })
      .select(COLUMNS)
      .single();
    setSending(false);
    if (err || !data) {
      setError(err?.code === "42501" ? "Chat is closed." : "That didn't send. Try again.");
      return;
    }
    if (!quick) setDraft("");
    receive(data as Message);
    if (!quick) inputRef.current?.focus();
  }

  return (
    <>
      <Feed ref={feedRef} aria-live="polite">
        {items.length === 0 ? (
          <Empty role={error ? "alert" : undefined}>
            {!error && <ChatHelloArt />}
            <b>{error ? "Messages didn't load" : conv ? `Say hello to ${otherName.split(" ")[0]}` : "Opening messages…"}</b>
            <span>{error || "Pick a quick reply or type below"}</span>
            {error && !conv && (
              <QuickBtn type="button" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </QuickBtn>
            )}
          </Empty>
        ) : (
          items.map((m, i) => {
            const prev = items[i - 1];
            const next = items[i + 1];
            const mine = m.sender_id === me;
            const newDay = !prev || dayOf(prev.created_at) !== dayOf(m.created_at);
            const first = newDay || prev.sender_id !== m.sender_id;
            const last = !next || next.sender_id !== m.sender_id || dayOf(next.created_at) !== dayOf(m.created_at);
            return (
              <Fragment key={m.id}>
                {newDay && <Day>{dayLabel(m.created_at)}</Day>}
                {first && !mine && (
                  <Sender>
                    <Avatar name={otherName} src={otherAvatar ?? null} size={28} />
                    {otherName.split(" ")[0]}
                  </Sender>
                )}
                <Bubble $mine={mine} $first={first && !newDay} $last={last}>
                  {m.content}
                </Bubble>
                {last && (
                  <Stamp $mine={mine}>
                    <time dateTime={m.created_at}>{clock(m.created_at)}</time>
                  </Stamp>
                )}
              </Fragment>
            );
          })
        )}
        {error && items.length > 0 && <Stamp $mine={false} role="alert">{error}</Stamp>}
      </Feed>
      <Foot>
      <Quick role="group" aria-label="Quick replies">
        {suggestions(role, status).map((s) => (
          <QuickBtn key={s} type="button" disabled={!conv || sending} onClick={(e) => void send(e, s)}>
            {s}
          </QuickBtn>
        ))}
      </Quick>
      <Compose onSubmit={send}>
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder="Message"
          aria-label={`Message ${otherName}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e);
            }
          }}
          disabled={!conv}
        />
        <Send type="submit" aria-label="Send message" disabled={!conv || !draft.trim() || sending}>
          <PaperPlaneTilt size={18} weight="fill" />
        </Send>
      </Compose>
      </Foot>
    </>
  );
}
