"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { ArrowLeft, CheckCircle as CheckCircle2, Plus, PaperPlaneTilt as Send } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";

/**
 * In-app support inbox. The left rail lists every conversation the rider has
 * had with support — each is a unique case (its own ID + assigned agent),
 * grouped into Active and History. The right pane is the selected thread.
 *
 * This is the front-end surface; conversations live in local state and get a
 * canned agent reply until the live support backend is wired in.
 */

type Msg = { id: number; from: "me" | "agent"; text: string; time: string };
type Convo = {
  id: string; // case number, e.g. "KP-4821"
  agent: string;
  topic: string;
  status: "open" | "resolved";
  updated: string;
  messages: Msg[];
};

// Pool of agents new cases rotate through, so the rider sees different people.
const AGENTS = ["Wanjiku N.", "Brian K.", "Aisha O.", "Kevin M."];

const SEED: Convo[] = [
  {
    id: "KP-4821",
    agent: "Wanjiku N.",
    topic: "M-Pesa refund not received",
    status: "open",
    updated: "2m",
    messages: [
      { id: 1, from: "agent", text: "Hi! I'm Wanjiku from payments. I can see your refund for case KP-4821 — let me check its status now.", time: "10:02" },
      { id: 2, from: "me", text: "Thanks. It's been two days since the cancelled trip.", time: "10:03" },
      { id: 3, from: "agent", text: "Understood. Escrow refunds land back on M-Pesa within 72 hours. I'll flag this to speed it up.", time: "10:04" },
    ],
  },
  {
    id: "KP-4790",
    agent: "Brian K.",
    topic: "Verify my driver account",
    status: "resolved",
    updated: "1d",
    messages: [
      { id: 1, from: "agent", text: "Hi, Brian here from onboarding. Your licence and ID have been received.", time: "Yesterday" },
      { id: 2, from: "agent", text: "You're verified and can now offer seats. Safe travels!", time: "Yesterday" },
    ],
  },
  {
    id: "KP-4712",
    agent: "Aisha O.",
    topic: "Driver no-show at pickup",
    status: "resolved",
    updated: "5d",
    messages: [
      { id: 1, from: "me", text: "My driver didn't show up this morning.", time: "Mon" },
      { id: 2, from: "agent", text: "So sorry about that. I've refunded the fare in full and flagged the driver for review.", time: "Mon" },
    ],
  },
];

const Shell = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  height: clamp(520px, 70vh, 680px);
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

/* ── Sidebar ──────────────────────────────────────────────────────────── */

const Sidebar = styled.aside<{ $view: "list" | "thread" }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface2};

  @media (max-width: 760px) {
    border-right: none;
    display: ${({ $view }) => ($view === "list" ? "flex" : "none")};
  }
`;

const SideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;

  b {
    font-size: 1.05rem;
  }
`;

const NewBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 18px 12px;
`;

const Tab = styled.button<{ $on: boolean }>`
  flex: 1;
  padding: 9px 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  background: ${({ theme, $on }) => ($on ? theme.color.primary : "transparent")};
  color: ${({ theme, $on }) =>
    $on ? theme.color.onPrimary : theme.color.textSoft};
  transition: background 0.2s ease, color 0.2s ease;
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Item = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
  text-align: left;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: none;
  cursor: pointer;
  font-family: inherit;
  background: ${({ theme, $active }) =>
    $active ? theme.color.surface : "transparent"};
  box-shadow: ${({ theme, $active }) =>
    $active ? theme.shadow.soft : "none"};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surface};
  }

  .body {
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .name {
    font-weight: 700;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.color.text};
  }
  .when {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.color.muted};
    flex: none;
  }
  .topic {
    margin: 2px 0 0;
    font-size: 0.88rem;
    color: ${({ theme }) => theme.color.textSoft};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .case {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 7px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: ${({ theme }) => theme.color.primaryDark};
    background: ${({ theme }) => theme.color.bgAlt};
    padding: 3px 9px;
    border-radius: 999px;
  }
`;

/* ── Thread pane ──────────────────────────────────────────────────────── */

const Pane = styled.section<{ $view: "list" | "thread" }>`
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media (max-width: 760px) {
    display: ${({ $view }) => ($view === "thread" ? "flex" : "none")};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${({ theme }) => theme.tone.deep.bg};
  color: ${({ theme }) => theme.tone.deep.on};

  b {
    display: block;
    font-size: 1.02rem;
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    opacity: 0.85;
  }
  .case {
    font-weight: 700;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #46d17e;
  }
`;

const Back = styled.button`
  display: none;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;

  @media (max-width: 760px) {
    display: inline-flex;
  }
`;

const StatusPill = styled.span<{ $resolved: boolean }>`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 16%, transparent);
  color: ${({ theme }) => theme.tone.deep.on};
`;

const Thread = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  background: ${({ theme }) => theme.color.surface2};
`;

const Row = styled.div<{ $me: boolean }>`
  display: flex;
  justify-content: ${({ $me }) => ($me ? "flex-end" : "flex-start")};
`;

const Bubble = styled.div<{ $me: boolean }>`
  max-width: min(78%, 460px);
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 0.98rem;
  line-height: 1.45;
  ${({ $me }) =>
    $me
      ? "border-bottom-right-radius: 6px;"
      : "border-bottom-left-radius: 6px;"}
  background: ${({ theme, $me }) =>
    $me ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $me }) => ($me ? theme.color.onPrimary : theme.color.text)};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  .time {
    display: block;
    margin-top: 5px;
    font-size: 0.7rem;
    opacity: 0.6;
  }
`;

const blink = keyframes`
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
`;

const Typing = styled.div`
  display: inline-flex;
  gap: 5px;
  padding: 15px 18px;
  border-radius: 20px;
  border-bottom-left-radius: 6px;
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.muted};
    animation: ${blink} 1.2s infinite ease-in-out;
  }
  span:nth-child(2) {
    animation-delay: 0.15s;
  }
  span:nth-child(3) {
    animation-delay: 0.3s;
  }

  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
    }
  }
`;

const Composer = styled.form`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  input {
    flex: 1;
    min-width: 0;
    padding: 13px 16px;
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 1.5px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.text};
    font-family: inherit;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.primary};
    }
  }
`;

const SendBtn = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  transition: transform 0.15s ease, opacity 0.2s ease;

  &:hover {
    transform: scale(1.06);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
  }
`;

export function ChatSupport() {
  const [convos, setConvos] = useState<Convo[]>(SEED);
  const [activeId, setActiveId] = useState(SEED[0].id);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [view, setView] = useState<"list" | "thread">("list");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const nextCase = useRef(4822); // seeded top is KP-4821
  const nextMsg = useRef(100);
  const nextAgent = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);

  const active = convos.find((c) => c.id === activeId) ?? convos[0];
  const listed = convos.filter((c) => c.status === tab);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active, typing]);

  const open = (id: string) => {
    setActiveId(id);
    setView("thread");
  };

  const startNew = () => {
    const agent = AGENTS[nextAgent.current++ % AGENTS.length];
    const id = `KP-${nextCase.current++}`;
    const convo: Convo = {
      id,
      agent,
      topic: "New conversation",
      status: "open",
      updated: "now",
      messages: [
        {
          id: nextMsg.current++,
          from: "agent",
          text: `Hi, I'm ${agent} from Kipita support. This is case ${id} — how can I help you today?`,
          time: "now",
        },
      ],
    };
    setConvos((c) => [convo, ...c]);
    setActiveId(id);
    setTab("open");
    setView("thread");
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    const mine: Msg = { id: nextMsg.current++, from: "me", text, time: "now" };
    setConvos((cs) =>
      cs.map((c) =>
        c.id === active.id
          ? { ...c, status: "open", updated: "now", messages: [...c.messages, mine] }
          : c,
      ),
    );
    setDraft("");
    setTyping(true);
    const caseId = active.id;
    window.setTimeout(() => {
      setTyping(false);
      setConvos((cs) =>
        cs.map((c) =>
          c.id === caseId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: nextMsg.current++,
                    from: "agent",
                    text: "Thanks for the details — an agent is reviewing your case and will reply here shortly.",
                    time: "now",
                  },
                ],
              }
            : c,
        ),
      );
    }, 1100);
  };

  return (
    <Shell>
      <Sidebar $view={view}>
        <SideHead>
          <b>Your chats</b>
          <NewBtn type="button" onClick={startNew}>
            <Plus size={16} />
            New chat
          </NewBtn>
        </SideHead>
        <Tabs>
          <Tab $on={tab === "open"} onClick={() => setTab("open")}>
            Active
          </Tab>
          <Tab $on={tab === "resolved"} onClick={() => setTab("resolved")}>
            History
          </Tab>
        </Tabs>
        <List>
          {listed.map((c) => (
            <Item
              key={c.id}
              $active={c.id === active?.id}
              onClick={() => open(c.id)}
            >
              <Avatar name={c.agent} size={42} />
              <div className="body">
                <div className="top">
                  <span className="name">{c.agent}</span>
                  <span className="when">{c.updated}</span>
                </div>
                <p className="topic">{c.topic}</p>
                <span className="case">{c.id}</span>
              </div>
            </Item>
          ))}
          {!listed.length && (
            <p style={{ padding: "24px 12px", opacity: 0.6, fontSize: "0.9rem" }}>
              {tab === "open"
                ? "No active chats. Start a new one above."
                : "No past conversations yet."}
            </p>
          )}
        </List>
      </Sidebar>

      <Pane $view={view}>
        {active && (
          <>
            <Header>
              <Back
                type="button"
                onClick={() => setView("list")}
                aria-label="Back to chats"
              >
                <ArrowLeft size={22} />
              </Back>
              <Avatar name={active.agent} size={40} />
              <div>
                <b>{active.agent}</b>
                <span className="meta">
                  <span className="case">{active.id}</span> ·{" "}
                  {active.status === "open" ? (
                    <>
                      <span className="dot" /> Online
                    </>
                  ) : (
                    "Resolved"
                  )}
                </span>
              </div>
              <StatusPill $resolved={active.status === "resolved"}>
                {active.status === "resolved" ? (
                  <>
                    <CheckCircle2 size={14} /> Resolved
                  </>
                ) : (
                  "Open"
                )}
              </StatusPill>
            </Header>

            <Thread ref={threadRef}>
              {active.messages.map((m) => (
                <Row key={m.id} $me={m.from === "me"}>
                  <Bubble $me={m.from === "me"}>
                    {m.text}
                    <span className="time">{m.time}</span>
                  </Bubble>
                </Row>
              ))}
              {typing && (
                <Row $me={false}>
                  <Typing aria-label="Agent is typing">
                    <span />
                    <span />
                    <span />
                  </Typing>
                </Row>
              )}
            </Thread>

            <Composer onSubmit={send}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${active.agent.split(" ")[0]}…`}
                aria-label="Message support"
              />
              <SendBtn type="submit" disabled={!draft.trim()} aria-label="Send">
                <Send size={20} />
              </SendBtn>
            </Composer>
          </>
        )}
      </Pane>
    </Shell>
  );
}
