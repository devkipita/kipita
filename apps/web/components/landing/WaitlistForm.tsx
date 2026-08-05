"use client";

import { useState } from "react";
import styled from "styled-components";
import { nocturne } from "./nocturne";

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

/** Email capture for the app waitlist. Client-side confirmation only (no backend wired yet). */
export function WaitlistForm() {
  const [joined, setJoined] = useState(false);

  return (
    <Waitlist
      onSubmit={(e) => {
        e.preventDefault();
        setJoined(true);
      }}
    >
      <WaitlistInput
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        disabled={joined}
      />
      <WaitlistBtn type="submit" disabled={joined}>
        {joined ? "You're on the list" : "Join waitlist"}
      </WaitlistBtn>
    </Waitlist>
  );
}
