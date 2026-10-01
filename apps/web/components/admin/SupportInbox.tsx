"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Check, CircleNotch, PaperPlaneTilt } from "@/components/icons";
import { SmallButton } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { subscribeToSupport } from "@/lib/support/api";
import {
  adminFetchMessagesAction,
  adminReplyAction,
  adminSetCaseStatusAction,
} from "@/lib/support/admin-actions";
import type { AdminSupportCase } from "@/lib/support/admin";
import type { SupportMessage } from "@/lib/support/types";

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  max-height: 70vh;
  overflow-y: auto;
`;

const CaseButton = styled.button<{ $active: boolean }>`
  width: 100%;
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $active }) =>
    $active ? theme.color.bgAlt : theme.color.surface};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.color.primary};
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  b {
    font-size: 0.95rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Pill = styled.span<{ $tone: "open" | "waiting" | "done" }>`
  flex: none;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ theme, $tone }) =>
    $tone === "done"
      ? theme.color.surface2
      : $tone === "waiting"
        ? theme.color.warnBg
        : theme.tone.mint.bg};
  color: ${({ theme, $tone }) =>
    $tone === "done"
      ? theme.color.muted
      : $tone === "waiting"
        ? theme.color.warnText
        : theme.tone.mint.on};
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 460px;
  max-height: 70vh;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`;

const PanelHead = styled.header`
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  b {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }
  small {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Thread = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Bubble = styled.div<{ $support: boolean }>`
  align-self: ${({ $support }) => ($support ? "flex-end" : "flex-start")};
  max-width: 76%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.45;
  white-space: pre-wrap;
  background: ${({ theme, $support }) =>
    $support ? theme.color.primary : theme.color.surface2};
  color: ${({ theme, $support }) =>
    $support ? theme.color.onPrimary : theme.color.text};
`;

const Stamp = styled.span<{ $support: boolean }>`
  align-self: ${({ $support }) => ($support ? "flex-end" : "flex-start")};
  font-size: 0.72rem;
  color: ${({ theme }) => theme.color.muted};
`;

const Composer = styled.form`
  flex: none;
  display: flex;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.line};

  textarea {
    flex: 1;
    min-height: 44px;
    max-height: 140px;
    padding: 11px 13px;
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    font: inherit;
    font-size: 0.94rem;
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.primary};
  }
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  flex: 1;
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.color.muted};
`;

const Problem = styled.p`
  margin: 0;
  padding: 10px 16px;
  font-size: 0.86rem;
  font-weight: 600;
  background: ${({ theme }) => theme.color.dangerBg};
  color: ${({ theme }) => theme.color.dangerText};
`;

function stamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toneFor(status: string): "open" | "waiting" | "done" {
  if (status === "resolved") return "done";
  if (status === "awaiting_reply") return "waiting";
  return "open";
}

export function SupportInbox({ cases: initial }: { cases: AdminSupportCase[] }) {
  const [cases, setCases] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial.find((c) => c.status !== "resolved")?.id ?? initial[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const active = cases.find((c) => c.id === activeId) ?? null;

  const load = useCallback(async (caseId: string) => {
    setLoading(true);
    setError("");
    try {
      setMessages(await adminFetchMessagesAction(caseId));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void load(activeId);
  }, [activeId, load]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    return subscribeToSupport(supabase, (incoming) => {
      setCases((prev) =>
        prev.map((c) =>
          c.id === incoming.case_id && c.status !== "resolved"
            ? {
                ...c,
                status: incoming.from_support ? "awaiting_reply" : "open",
                updated_at: incoming.created_at,
              }
            : c,
        ),
      );
      if (incoming.case_id !== activeId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
      );
    });
  }, [activeId]);

  async function reply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || sending || !draft.trim()) return;

    setSending(true);
    setError("");
    const result = await adminReplyAction(activeId, draft);
    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDraft("");
    setMessages((prev) =>
      prev.some((m) => m.id === result.message.id)
        ? prev
        : [...prev, result.message],
    );
    setCases((prev) =>
      prev.map((c) =>
        c.id === activeId && c.status !== "resolved"
          ? { ...c, status: "awaiting_reply" }
          : c,
      ),
    );
  }

  async function resolve() {
    if (!activeId) return;
    const result = await adminSetCaseStatusAction(activeId, "resolved");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCases((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, status: "resolved" } : c)),
    );
  }

  if (cases.length === 0) {
    return <Empty>No support cases yet.</Empty>;
  }

  return (
    <Layout>
      <List>
        {cases.map((c) => (
          <li key={c.id}>
            <CaseButton
              type="button"
              $active={c.id === activeId}
              onClick={() => setActiveId(c.id)}
            >
              <span className="top">
                <b>{c.subject}</b>
                <Pill $tone={toneFor(c.status)}>
                  {c.status === "awaiting_reply" ? "replied" : c.status}
                </Pill>
              </span>
              <small>
                {c.user_name} · {stamp(c.updated_at)}
              </small>
            </CaseButton>
          </li>
        ))}
      </List>

      <Panel>
        {active ? (
          <>
            <PanelHead>
              <div>
                <b>{active.subject}</b>
                <small>
                  {active.user_name} · {active.category}
                </small>
              </div>
              {active.status !== "resolved" && (
                <SmallButton type="button" onClick={() => void resolve()}>
                  <Check size={15} />
                  Resolve
                </SmallButton>
              )}
            </PanelHead>

            {error && <Problem role="alert">{error}</Problem>}

            <Thread ref={threadRef}>
              {loading && messages.length === 0 ? (
                <Empty>Loading…</Empty>
              ) : messages.length === 0 ? (
                <Empty>No messages in this case.</Empty>
              ) : (
                messages.map((m) => (
                  <div key={m.id} style={{ display: "contents" }}>
                    <Bubble $support={m.from_support}>{m.body}</Bubble>
                    <Stamp $support={m.from_support}>
                      {m.from_support ? "Support" : active.user_name} ·{" "}
                      {stamp(m.created_at)}
                    </Stamp>
                  </div>
                ))
              )}
            </Thread>

            <Composer onSubmit={reply}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  active.status === "resolved"
                    ? "This case is resolved — replying reopens nothing, it just adds a note."
                    : "Write a reply…"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    void reply(e as unknown as React.FormEvent);
                  }
                }}
              />
              <SmallButton type="submit" disabled={sending || !draft.trim()}>
                {sending ? <CircleNotch size={15} /> : <PaperPlaneTilt size={15} />}
                Send
              </SmallButton>
            </Composer>
          </>
        ) : (
          <Empty>Pick a case to read it.</Empty>
        )}
      </Panel>
    </Layout>
  );
}
