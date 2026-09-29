"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { ImageSquare, Lifebuoy, PaperPlaneTilt, X } from "@/components/icons";
import { palette } from "@/lib/theme";
import { Z } from "@/lib/z";
import { useSupport } from "./SupportProvider";

/**
 * The button *is* the panel: one element that morphs from a pill into a chat
 * window, so nothing appears from nowhere. Present on every screen for as long
 * as a case is open, and gone the moment the last one is closed.
 *
 * White rather than an accent — an always-on control should read as a tool, not
 * as a warning. The unread count is the only colour it carries.
 */

const PILL_H = 52;

const Shell = styled.div<{ $open: boolean }>`
  position: fixed;
  right: clamp(12px, 2vw, 24px);
  bottom: clamp(12px, 2vw, 24px);
  z-index: ${Z.notificationToast};

  width: ${({ $open }) => ($open ? "min(380px, calc(100vw - 24px))" : "auto")};
  height: ${({ $open }) =>
    $open ? "min(560px, calc(100dvh - 120px))" : `${PILL_H}px`};
  border-radius: ${({ $open, theme }) => ($open ? theme.radius.lg : "999px")};
  background: ${({ $open, theme }) =>
    $open ? theme.color.surfaceContainerLowest : "#ffffff"};
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-origin: bottom right;
  transition:
    width 360ms cubic-bezier(0.22, 1, 0.36, 1),
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 360ms cubic-bezier(0.22, 1, 0.36, 1),
    background 220ms ease;

  /* Clear the floating mobile tab bar rather than sitting on top of it. */
  @media (max-width: 899px) {
    bottom: calc(76px + max(10px, env(safe-area-inset-bottom)));
    right: 10px;
    left: ${({ $open }) => ($open ? "10px" : "auto")};
    width: ${({ $open }) => ($open ? "auto" : "auto")};
    height: ${({ $open }) => ($open ? "min(70dvh, 520px)" : `${PILL_H}px`)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Launcher = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: ${PILL_H}px;
  padding: 0 20px;
  border: none;
  background: transparent;
  color: ${palette.blackMid};
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  opacity: ${({ $open }) => ($open ? 0 : 1)};
  pointer-events: ${({ $open }) => ($open ? "none" : "auto")};
  transition: opacity 160ms ease;

  svg {
    flex: none;
  }
  --icon-knockout: #ffffff;
`;

const Count = styled.span`
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: ${palette.lime};
  color: ${palette.limeDark};
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
`;

const Panel = styled.div<{ $open: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 200ms ease ${({ $open }) => ($open ? "120ms" : "0ms")};
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 12px 18px;
  background: ${({ theme }) => theme.color.surfaceContainer};

  .who {
    flex: 1;
    min-width: 0;
  }
  b {
    display: block;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 1.02rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    display: block;
    font-size: 0.76rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const HeadButton = styled.button`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Thread = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
`;

const Row = styled.div<{ $mine: boolean }>`
  max-width: 84%;
  align-self: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  display: grid;
  gap: 4px;
  justify-items: ${({ $mine }) => ($mine ? "end" : "start")};
`;

const Bubble = styled.div<{ $mine: boolean }>`
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 0.92rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  background: ${({ theme, $mine }) =>
    $mine ? theme.color.primaryContainer : theme.color.surfaceContainerHigh};
  color: ${({ theme, $mine }) =>
    $mine ? theme.color.onPrimaryContainer : theme.color.onSurface};
  border-bottom-right-radius: ${({ $mine }) => ($mine ? "6px" : "18px")};
  border-bottom-left-radius: ${({ $mine }) => ($mine ? "18px" : "6px")};
`;

const Shot = styled.img`
  display: block;
  max-width: 220px;
  width: 100%;
  border-radius: 14px;
`;

const Stamp = styled.span`
  font-size: 0.68rem;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
`;

const Muted = styled.p`
  margin: auto;
  padding: 24px;
  max-width: 34ch;
  text-align: center;
  font-size: 0.88rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
`;

const Composer = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};

  textarea {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    max-height: 120px;
    border: none;
    border-radius: 20px;
    padding: 10px 14px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
    font: inherit;
    font-size: 0.92rem;
    line-height: 1.45;
    resize: none;
  }
  textarea:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 1px;
  }
`;

const Tool = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const Send = styled(Tool)`
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.primaryDark};
    color: ${({ theme }) => theme.color.onPrimary};
  }
`;

const Attached = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 12px 8px;
  padding: 8px 10px;
  border-radius: 14px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  img {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    object-fit: cover;
  }
  .name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Problem = styled.p`
  margin: 0;
  padding: 10px 16px;
  font-size: 0.82rem;
  background: ${({ theme }) => theme.color.errorContainer};
  color: ${({ theme }) => theme.color.onErrorContainer};
`;

function time(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SupportDock() {
  const {
    open: openCases,
    active,
    messages,
    loading,
    sending,
    error,
    unread,
    send,
    close,
    markRead,
  } = useSupport();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    markRead();
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [open, messages.length, markRead]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (openCases.length === 0) return null;

  async function submit() {
    if (sending) return;
    if (!draft.trim() && !file) return;
    const sent = await send(draft, file);
    if (sent) {
      setDraft("");
      setFile(null);
      textRef.current?.focus();
    }
  }

  return (
    <Shell $open={open}>
      <Launcher
        type="button"
        $open={open}
        onClick={() => setOpen(true)}
        aria-label={`Support — ${openCases.length} open ${openCases.length === 1 ? "case" : "cases"}`}
      >
        <Lifebuoy size={20} weight="fill" />
        Support
        {unread > 0 ? (
          <Count>{unread > 9 ? "9+" : unread}</Count>
        ) : (
          <Count>{openCases.length}</Count>
        )}
      </Launcher>

      <Panel $open={open} role="dialog" aria-label="Support conversation">
        <Head>
          <div className="who">
            <b>{active?.subject ?? "Support"}</b>
            <small>
              {active?.status === "awaiting_reply"
                ? "Waiting on you"
                : "We usually reply within a few hours"}
            </small>
          </div>
          {active && (
            <HeadButton
              type="button"
              title="Mark resolved"
              aria-label="Mark this case resolved"
              onClick={() => {
                void close(active.id).then((ok) => {
                  if (ok) setOpen(false);
                });
              }}
            >
              <Lifebuoy size={17} />
            </HeadButton>
          )}
          <HeadButton
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close support"
          >
            <X size={17} weight="bold" />
          </HeadButton>
        </Head>

        {error && <Problem role="alert">{error}</Problem>}

        <Thread ref={threadRef}>
          {loading && messages.length === 0 ? (
            <Muted>Loading your conversation…</Muted>
          ) : messages.length === 0 ? (
            <Muted>
              Tell us what happened. You can attach a screenshot too.
            </Muted>
          ) : (
            messages.map((m) => (
              <Row key={m.id} $mine={!m.from_support}>
                {m.image_url && <Shot src={m.image_url} alt="" />}
                {m.body && <Bubble $mine={!m.from_support}>{m.body}</Bubble>}
                <Stamp>{time(m.created_at)}</Stamp>
              </Row>
            ))
          )}
        </Thread>

        {preview && (
          <Attached>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" />
            <span className="name">{file?.name}</span>
            <HeadButton
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remove attachment"
            >
              <X size={15} weight="bold" />
            </HeadButton>
          </Attached>
        )}

        <Composer
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Tool
            type="button"
            disabled={sending}
            onClick={() => fileRef.current?.click()}
            aria-label="Attach a screenshot"
            title="Attach a screenshot"
          >
            <ImageSquare size={20} />
          </Tool>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <textarea
            ref={textRef}
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={sending ? "Sending…" : "Type a message"}
            aria-label="Message"
          />

          <Send
            type="submit"
            disabled={sending || (!draft.trim() && !file)}
            aria-label="Send message"
          >
            <PaperPlaneTilt size={18} />
          </Send>
        </Composer>
      </Panel>
    </Shell>
  );
}
