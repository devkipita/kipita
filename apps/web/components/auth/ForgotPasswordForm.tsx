"use client";

import { useState } from "react";
import styled from "styled-components";
import { ArrowRight, Info, Envelope as Mail, EnvelopeSimple as MailCheck } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validators/auth";
import { TextField } from "./TextField";
import {
  AlertBox,
  FootNote,
  Form,
  Heading,
  PrimaryButton,
  Spinner,
  Sub,
} from "./ui";

const Burst = styled.div`
  width: 84px;
  height: 84px;
  margin: 6px auto 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
`;

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setErr("");
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
    const { error: e2 } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (e2) return setError(e2.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center" }}>
        <Burst>
          <MailCheck size={38} />
        </Burst>
        <Heading style={{ fontSize: "1.8rem" }}>Reset link sent</Heading>
        <Sub style={{ margin: "10px auto 24px" }}>
          If an account uses <strong>{email}</strong>, a reset link is on its
          way. Open it to choose a new password.
        </Sub>
        <FootNote>
          <a href="/auth/sign-in">Back to sign in</a>
        </FootNote>
      </div>
    );
  }

  return (
    <>
      <Heading>Forgot password?</Heading>
      <Sub>No stress. Enter your email and we&apos;ll send a reset link.</Sub>

      {error && (
        <AlertBox style={{ marginBottom: 18 }}>
          <Info size={18} />
          {error}
        </AlertBox>
      )}

      <Form onSubmit={submit}>
        <TextField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={err}
        />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? <Spinner /> : <>Send reset link <ArrowRight size={19} /></>}
        </PrimaryButton>
      </Form>

      <FootNote>
        Remembered it? <a href="/auth/sign-in">Sign in</a>
      </FootNote>
    </>
  );
}
