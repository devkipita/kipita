"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Headset, Send } from "lucide-react";

/**
 * In-app support chat — an inbox-style thread between the rider and Kipita
 * support. This is the front-end surface; messages are held in local state and
 * answered by a canned reply until the live support backend is wired in.
 */

type Msg = { id: number; from: "me" | "support"; text: string };

const GREETING =
  "Hey there — welcome to Kipita support. How can we help with your rides, payments, or account today?";

const REPLY =
  "Thanks for reaching out! An agent will jump in shortly. Meanwhile, the FAQs above answer most common questions.";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: clamp(440px, 60vh, 600px);
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  background: ${({ theme }) => theme.tone.deep.bg};
  color: ${({ theme }) => theme.tone.deep.on};

  .mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    flex: none;
    background: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 18%, transparent);
  }
  b {
    display: block;
    font-size: 1.05rem;
  }
  small {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.85rem;
    opacity: 0.85;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #46d17e;
  }
`;

const Thread = styled.div`
  flex: 1;
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
  padding: 13px 17px;
  border-radius: 20px;
  font-size: 1rem;
  line-height: 1.45;
  ${({ $me }) => ($me ? "border-bottom-right-radius: 6px;" : "border-bottom-left-radius: 6px;")}
  background: ${({ theme, $me }) =>
    $me ? theme.color.primary : theme.color.surface};
  color: ${({ theme, $me }) => ($me ? theme.color.onPrimary : theme.color.text)};
  box-shadow: ${({ theme }) => theme.shadow.soft};
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
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: "support", text: GREETING },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const nextId = useRef(1);
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "me", text }]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, from: "support", text: REPLY },
      ]);
    }, 1100);
  };

  return (
    <Panel>
      <Header>
        <span className="mark">
          <Headset size={22} strokeWidth={2.2} />
        </span>
        <div>
          <b>Kipita Support</b>
          <small>
            <span className="dot" /> Online · replies in a few minutes
          </small>
        </div>
      </Header>

      <Thread ref={threadRef}>
        {messages.map((m) => (
          <Row key={m.id} $me={m.from === "me"}>
            <Bubble $me={m.from === "me"}>{m.text}</Bubble>
          </Row>
        ))}
        {typing && (
          <Row $me={false}>
            <Typing aria-label="Support is typing">
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
          placeholder="Type your message…"
          aria-label="Message support"
        />
        <SendBtn type="submit" disabled={!draft.trim()} aria-label="Send">
          <Send size={20} strokeWidth={2.2} />
        </SendBtn>
      </Composer>
    </Panel>
  );
}
