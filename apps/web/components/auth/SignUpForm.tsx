"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { ArrowRight, Info, Mail, MailCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signUpEmailSchema } from "@/lib/validators/auth";
import {
  attemptCooldownMs,
  cooldownMessage,
  recordFailedAttempt,
} from "@/lib/security/attempt-throttle";
import { TextField } from "./TextField";
import { OAuthButtons } from "./OAuthButtons";
import { StepDots } from "./StepDots";
import {
  AlertBox,
  Divider,
  FootNote,
  Form,
  Heading,
  PrimaryButton,
  Spinner,
  Sub,
  TextLink,
} from "./ui";

const Sent = styled.div`
  text-align: center;
`;

const Burst = styled.div`
  width: 84px;
  height: 84px;
  margin: 6px auto 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
  animation: pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3);

  @keyframes pop {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;

const Strong = styled.strong`
  color: ${({ theme }) => theme.color.text};
`;

export function SignUpForm() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [errs, setErrs] = useState<{ fullName?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data: { full_name: fullName.trim() },
      },
    });
    return err;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = signUpEmailSchema.safeParse({ fullName, email });
    if (!parsed.success) {
      const f: typeof errs = {};
      parsed.error.issues.forEach((i) => (f[i.path[0] as "fullName" | "email"] = i.message));
      setErrs(f);
      return;
    }
    setErrs({});

    // Signup hits Supabase directly, so this is only a courtesy throttle —
    // see the note in lib/security/attempt-throttle.ts. Enable CAPTCHA and the
    // Supabase auth rate limits for the real protection.
    const throttleKey = `signup:${email.trim().toLowerCase()}`;
    const wait = attemptCooldownMs(throttleKey);
    if (wait > 0) return setError(cooldownMessage(wait));

    setBusy(true);
    const err = await send();
    setBusy(false);
    if (err) {
      recordFailedAttempt(throttleKey);
      return setError(err.message);
    }
    recordFailedAttempt(throttleKey);
    setSent(true);
    setCooldown(30);
  }

  async function resend() {
    if (cooldown > 0) return;
    setBusy(true);
    const err = await send();
    setBusy(false);
    if (err) return setError(err.message);
    setCooldown(30);
  }

  if (sent) {
    return (
      <Sent>
        <StepDots total={4} current={1} />
        <Burst>
          <MailCheck size={38} strokeWidth={2.2} />
        </Burst>
        <Heading style={{ fontSize: "1.8rem" }}>Check your inbox</Heading>
        <Sub style={{ margin: "10px auto 24px" }}>
          We sent a magic link to <Strong>{email}</Strong>. Tap it to confirm
          your email — you&apos;ll set a password next.
        </Sub>
        {error && (
          <AlertBox style={{ marginBottom: 16, textAlign: "left" }}>
            <Info size={18} />
            {error}
          </AlertBox>
        )}
        <PrimaryButton type="button" onClick={resend} disabled={busy || cooldown > 0}>
          {busy ? <Spinner /> : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </PrimaryButton>
        <FootNote>
          Wrong email?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setSent(false); }}>
            Go back
          </a>
        </FootNote>
      </Sent>
    );
  }

  return (
    <>
      <StepDots total={4} current={0} />
      <Heading>Create your account</Heading>
      <Sub>Start with your email — no password yet. We keep it quick.</Sub>

      {error && (
        <AlertBox style={{ marginBottom: 18 }}>
          <Info size={18} />
          {error}
        </AlertBox>
      )}

      <Form onSubmit={submit}>
        <TextField
          label="Full name"
          icon={User}
          autoComplete="name"
          placeholder="Wanjiku Kamau"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errs.fullName}
        />
        <TextField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errs.email}
        />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? <Spinner /> : <>Continue <ArrowRight size={19} strokeWidth={2.4} /></>}
        </PrimaryButton>
      </Form>

      <Divider>or sign up with</Divider>
      <OAuthButtons next="/profile/edit?welcome=1" />

      <FootNote>
        Already have an account? <a href="/auth/sign-in">Sign in</a>
      </FootNote>
    </>
  );
}
