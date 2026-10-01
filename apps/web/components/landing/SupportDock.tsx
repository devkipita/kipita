"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { createClient } from "@/lib/supabase/client";
import {
  openSupportCaseAction,
  sendSupportMessageAction,
} from "@/lib/support/actions";
import { nocturne } from "./nocturne";

const popIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// Resting width when the pill shows its "Chat with us" label vs. the collapsed
// icon-only circle. On render the pill starts expanded, then shrinks to a circle.
const PILL_W = "184px";
const CIRCLE = "58px";

const DockShell = styled.div<{ $open: boolean; $expanded: boolean }>`
  position: fixed;
  right: clamp(16px, 2vw, 28px);
  bottom: clamp(16px, 2vw, 28px);
  z-index: 96;
  width: ${({ $open, $expanded }) =>
    $open ? "min(360px, calc(100vw - 32px))" : $expanded ? PILL_W : CIRCLE};
  height: ${({ $open }) => ($open ? "min(540px, calc(100dvh - 32px))" : CIRCLE)};
  max-width: calc(100vw - 32px);
  border-radius: ${({ $open }) => ($open ? "30px" : "999px")};
  background: ${({ $open }) => ($open ? nocturne.surface : nocturne.lime)};
  border: 1px solid
    ${({ $open }) => ($open ? "#2a2a2a" : "rgba(159, 232, 112, 0.22)")};
  overflow: hidden;
  transform-origin: bottom right;
  animation: ${popIn} 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
  box-shadow: ${({ $open }) =>
    $open
      ? "0 34px 88px rgba(0, 0, 0, 0.72)"
      : "0 16px 40px rgba(0, 0, 0, 0.55)"};
  transition:
    width 420ms cubic-bezier(0.22, 1, 0.36, 1),
    height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1),
    background 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms ease;
  will-change: width, height, border-radius, background;

  @media (max-width: 640px) {
    width: ${({ $open, $expanded }) =>
      $open ? "calc(100vw - 24px)" : $expanded ? PILL_W : CIRCLE};
    right: 12px;
    bottom: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const DockLauncher = styled.button<{ $open: boolean; $expanded: boolean }>`
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $expanded }) => ($expanded ? "flex-start" : "center")};
  gap: ${({ $expanded }) => ($expanded ? "10px" : "0")};
  padding: ${({ $expanded }) => ($expanded ? "15px 22px" : "0")};
  border: none;
  background: transparent;
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  opacity: ${({ $open }) => ($open ? 0 : 1)};
  transform: ${({ $open }) =>
    $open ? "translateY(10px) scale(0.96)" : "translateY(0) scale(1)"};
  pointer-events: ${({ $open }) => ($open ? "none" : "auto")};
  transition:
    opacity 180ms ease,
    gap 300ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 300ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const LauncherIcon = styled.span`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(20, 57, 42, 0.12);
`;

const DockPanel = styled.div<{ $open: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: ${({ $open }) =>
    $open ? "translateY(0) scale(1)" : "translateY(18px) scale(0.96)"};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition:
    opacity 200ms ease 110ms,
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1) 70ms;
`;

const ChatTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background: ${nocturne.green};
`;

const ChatTopWho = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const ChatAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${nocturne.greenDeep};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: ${nocturne.sage};
`;

const ChatTitle = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.25;

  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.cream};
  }
  span {
    font-size: 12px;
    color: #cfe3d1;
  }
`;

const ChatClose = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: ${nocturne.greenDeep};
  color: ${nocturne.sage};
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
`;

const ChatBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  padding: 20px;
  overflow-y: auto;
`;

const MsgRow = styled.div<{ $me?: boolean }>`
  display: flex;
  flex-direction: column;
  max-width: 82%;
  align-self: ${({ $me }) => ($me ? "flex-end" : "flex-start")};
  align-items: ${({ $me }) => ($me ? "flex-end" : "flex-start")};
`;

const Bubble = styled.div<{ $me?: boolean }>`
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  background: ${({ $me }) => ($me ? nocturne.green : nocturne.bg)};
  color: ${({ $me }) => ($me ? nocturne.cream : nocturne.muted)};
  ${({ $me }) =>
    $me
      ? "border-bottom-right-radius: 6px;"
      : "border-bottom-left-radius: 6px;"}
`;

const QuickRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px 14px;
`;

const Quick = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${nocturne.line};
  background: transparent;
  color: ${nocturne.sage};
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: ${nocturne.sage};
    background: ${nocturne.greenDeep};
  }
`;

const ChatForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid #2a2a2a;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid ${nocturne.line};
  background: ${nocturne.bg};
  color: ${nocturne.cream};
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${nocturne.sage};
  }
`;

const ChatSend = styled.button`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
  border: none;
  background: ${nocturne.green};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.sage};
  }
`;

const LauncherLabel = styled.span<{ $expanded: boolean }>`
  white-space: nowrap;
  overflow: hidden;
  max-width: ${({ $expanded }) => ($expanded ? "160px" : "0")};
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition:
    max-width 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
`;

type Message = { from: "bot" | "me"; text: string };
type Mode = "support" | "report";

const QUICK: Record<Mode, string[]> = {
  support: ["How does payment work?", "I want to drive", "Where is my refund?"],
  report: [
    "A driver behaved badly",
    "Wrong fare charged",
    "Trip never happened",
  ],
};

const OPENING: Record<Mode, Message> = {
  support: {
    from: "bot",
    text: "Habari! You've reached Kipita support. What's going on?",
  },
  report: {
    from: "bot",
    text: "Sorry that happened. Tell us the trip date and what went wrong â€” we'll open a case straight away.",
  },
};

const ChatIcon = ({ size = 22, fill }: { size?: number; fill: string }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill={fill} aria-hidden>
    <path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM96,140a12,12,0,1,1,12-12A12,12,0,0,1,96,140Zm32,0a12,12,0,1,1,12-12A12,12,0,0,1,128,140Zm32,0a12,12,0,1,1,12-12A12,12,0,0,1,160,140Z" />
  </svg>
);

const MIN_DETAIL = 10;

/** A subject short enough to scan in the case list, from the first message. */
function subjectFrom(text: string, mode: Mode): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const short = clean.length > 78 ? `${clean.slice(0, 75)}â€¦` : clean;
  return mode === "report" ? `Reported: ${short}`.slice(0, 120) : short;
}

/**
 * Floating support dock: a launcher button and a chat panel with quick replies.
 *
 * The first message opens a real `support_cases` row; every later message is
 * appended to it. Cases are RLS'd to their owner, so a signed-out visitor is
 * pointed at sign-in rather than being told a case was opened when none was.
 *
 * `openSignal` lets sibling buttons (Live chat / Report an issue) open it in a mode.
 */
export function SupportDock({
  openSignal,
}: {
  openSignal?: { mode: Mode; nonce: number };
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("support");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([OPENING.support]);
  // Intro flourish: the pill mounts showing "Chat with us", then shrinks to an
  // icon-only circle. Hovering re-expands it so the label stays discoverable.
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setAuthed(Boolean(data.user));
      })
      .catch(() => {
        if (alive) setAuthed(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const expanded = !open && (intro || hover);

  // React to external open requests from the contact cards.
  useEffect(() => {
    if (!openSignal) return;
    setMode(openSignal.mode);
    setMessages([OPENING[openSignal.mode]]);
    setCaseId(null);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal?.nonce]);

  useEffect(() => {
    bodyRef.current?.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const say = (text: string) =>
    setMessages((m) => [...m, { from: "bot", text }]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;

    setMessages((m) => [...m, { from: "me", text: t }]);
    setDraft("");

    if (authed === false) {
      say("Sign in and I can open a case for you â€” it keeps your fare held while we look into it.");
      return;
    }

    if (!caseId && t.length < MIN_DETAIL) {
      say("Give me a bit more than that â€” what happened, and when?");
      return;
    }

    setSending(true);
    try {
      if (!caseId) {
        const result = await openSupportCaseAction({
          subject: subjectFrom(t, mode),
          detail: t,
          category: mode === "report" ? "report" : "general",
        });
        if (!result.ok) {
          say(result.error);
          return;
        }
        setCaseId(result.id);
        say("Case opened. You can track it from the Support button anywhere in the app, and it stays there until it's closed.");
        return;
      }

      const result = await sendSupportMessageAction(caseId, t);
      if (!result.ok) {
        say(result.error);
        return;
      }
      say("Added to your case.");
    } catch {
      say("That didn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DockShell
      $open={open}
      $expanded={expanded}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <DockLauncher
        type="button"
        $open={open}
        $expanded={expanded}
        onClick={() => setOpen(true)}
        aria-label="Chat with us"
      >
        <LauncherIcon>
          <ChatIcon fill="#14392A" />
        </LauncherIcon>
        <LauncherLabel $expanded={expanded}>Chat with us</LauncherLabel>
      </DockLauncher>

      <DockPanel $open={open} role="dialog" aria-label="Kipita support chat">
        <ChatTop>
          <ChatTopWho>
            <ChatAvatar>KS</ChatAvatar>
            <ChatTitle>
              <b>{mode === "report" ? "Report an issue" : "Kipita Support"}</b>
              <span>Typically replies in 2 minutes</span>
            </ChatTitle>
          </ChatTopWho>
          <ChatClose aria-label="Close chat" onClick={() => setOpen(false)}>
            Ã—
          </ChatClose>
        </ChatTop>

        <ChatBody ref={bodyRef}>
          {messages.map((m, i) => (
            <MsgRow key={i} $me={m.from === "me"}>
              <Bubble $me={m.from === "me"}>{m.text}</Bubble>
            </MsgRow>
          ))}
        </ChatBody>

        {!caseId && (
          <QuickRow>
            {QUICK[mode].map((label) => (
              <Quick key={label} disabled={sending} onClick={() => void send(label)}>
                {label}
              </Quick>
            ))}
          </QuickRow>
        )}

        <ChatForm
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <ChatInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={sending ? "Sendingâ€¦" : "Type a messageâ€¦"}
            aria-label="Message"
            disabled={sending}
          />
          <ChatSend type="submit" aria-label="Send" disabled={sending || !draft.trim()}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 256 256"
              fill="#FAF8F4"
              aria-hidden
            >
              <path d="M231.87,114,88,26.19a16,16,0,0,0-24.24,17l25.13,73.06a4,4,0,0,1,0,2.6L63.76,212.8A16,16,0,0,0,88,229.81L231.87,142a16,16,0,0,0,0-28ZM96,136h56a8,8,0,0,0,0-16H96Z" />
            </svg>
          </ChatSend>
        </ChatForm>
      </DockPanel>
    </DockShell>
  );
}

