"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { Check, Info, Lock } from "@/components/icons";
import { requestPasswordChangeAction } from "@/lib/auth/auth-actions";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const Lead = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};
`;

const Body = styled.span`
  flex: 1;
  min-width: 0;

  .t {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
  }

  .d {
    display: block;
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 40px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

export function ChangePasswordCard({ email }: { email: string | null }) {
  const [busy, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function request() {
    setError("");
    startTransition(async () => {
      const result = await requestPasswordChangeAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <Card>
      <Lead>{sent ? <Check size={20} /> : <Lock size={20} />}</Lead>
      <Body>
        <span className="t">Change password</span>
        <span className="d">
          {error ? (
            error
          ) : sent ? (
            <>Confirmation link sent to {email}. Open it to set a new password.</>
          ) : (
            <>We email a confirmation link before any password change.</>
          )}
        </span>
      </Body>
      {!sent && (
        <Action type="button" onClick={request} disabled={busy}>
          {busy ? <><ButtonOrb job="committing" on="surface" size={20} /> Sending</> : "Send link"}
        </Action>
      )}
      {error && <Info size={18} />}
    </Card>
  );
}
