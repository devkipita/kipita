"use client";

import { useState } from "react";
import styled from "styled-components";
import { dur, ease } from "@/lib/motion";
import { pressable } from "@/components/ui/interactions";
import { nocturne } from "./nocturne";
import { joinWaitlist } from "@/lib/waitlist";

type Status = "idle" | "loading" | "done" | "error";

const Waitlist = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  max-width: 480px;
  padding-top: 6px;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 14px;
    max-width: 100%;
  }
`;

const WaitlistInput = styled.input`
  flex: 1 1 220px;
  padding: 16px 22px;
  border-radius: 999px;
  border: 1px solid ${nocturne.line};
  background: ${nocturne.bg};
  color: ${nocturne.cream};
  font-size: 15px;
  font-family: inherit;

  transition:
    border-color ${dur.short4}ms ${ease.standard},
    box-shadow ${dur.short4}ms ${ease.standard};

  &::placeholder {
    color: ${nocturne.muted3};
  }
  &:hover:not(:disabled) {
    border-color: ${nocturne.accent};
  }
  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 4px ${nocturne.ring};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 640px) {
    width: 100%;
    flex: none;
    padding: 18px 22px;
  }
`;

const WaitlistBtn = styled.button`
  position: relative;
  min-height: 44px;
  padding: 16px 30px;
  border-radius: 999px;
  border: none;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;

  ${pressable(nocturne.green)}

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.green};
      color: ${nocturne.onGreen};
      filter: none;
    }
  }
  &:active:not(:disabled) {
    background: ${nocturne.greenDeep};
    color: ${nocturne.onGreen};
  }

  &:disabled {
    cursor: default;
    background: ${nocturne.sage};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 640px) {
    width: 100%;
    padding: 18px 24px;
  }
`;

const Note = styled.p<{ $tone: "ok" | "err" }>`
  width: 100%;
  margin: 2px 0 0;
  font-size: 15px;
  line-height: 1.4;
  color: ${({ $tone }) => ($tone === "ok" ? nocturne.sage : "#e88b7a")};
`;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const done = status === "done";
  const loading = status === "loading";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || done) return;

    setStatus("loading");
    try {
      await joinWaitlist(email);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Waitlist onSubmit={onSubmit} noValidate={false}>
      <WaitlistInput
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        disabled={loading || done}
      />
      <WaitlistBtn type="submit" disabled={loading || done}>
        {done
          ? "You're on the list"
          : loading
            ? "Joining…"
            : "Join waitlist"}
      </WaitlistBtn>

      {done ? (
        <Note $tone="ok">
          You&apos;re on the list. We&apos;ll email you the moment Kipita
          launches.
        </Note>
      ) : status === "error" ? (
        <Note $tone="err">
          Something went wrong. Please check your email and try again.
        </Note>
      ) : null}
    </Waitlist>
  );
}
