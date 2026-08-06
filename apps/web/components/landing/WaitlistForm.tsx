"use client";

import { useState } from "react";
import styled from "styled-components";
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

  &:focus {
    outline: none;
    border-color: ${nocturne.sage};
  }

  @media (max-width: 640px) {
    width: 100%;
    flex: none;
    padding: 18px 22px;
  }
`;

const WaitlistBtn = styled.button`
  padding: 16px 30px;
  border-radius: 999px;
  border: none;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
  }

  &:disabled {
    cursor: default;
    background: ${nocturne.sage};
  }

  @media (max-width: 640px) {
    width: 100%;
    padding: 18px 24px;
  }
`;

const Note = styled.p<{ $tone: "ok" | "err" }>`
  width: 100%;
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: ${({ $tone }) => ($tone === "ok" ? nocturne.sage : "#e88b7a")};
`;

/** Email capture for the app waitlist. Persists to the Supabase `waitlist` table. */
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
          You&apos;re on the list — we&apos;ll email you the moment Kipita
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
