"use client";

import { useEffect, useState, useTransition } from "react";
import styled from "styled-components";
import { ArrowRight, Info, Envelope as Mail, EnvelopeSimple as MailCheck, User } from "@/components/icons";
import { sendSignUpLinkAction } from "@/lib/auth/auth-actions";
import { signUpEmailSchema } from "@/lib/validators/auth";
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
  Sub,
  TextLink,
} from "./ui";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

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
  animation: pop 400ms cubic-bezier(0.05, 0.7, 0.1, 1) both;

  @keyframes pop {
    from { transform: scale(0.6); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Strong = styled.strong`
  color: ${({ theme }) => theme.color.text};
`;

export function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [errs, setErrs] = useState<{ fullName?: string; email?: string }>({});
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function submit(e: React.FormEvent) {
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

    startTransition(async () => {
      const result = await sendSignUpLinkAction(fullName, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      setCooldown(30);
    });
  }

  function resend() {
    if (cooldown > 0) return;
    startTransition(async () => {
      const result = await sendSignUpLinkAction(fullName, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCooldown(30);
    });
  }

  if (sent) {
    return (
      <Sent>
        <StepDots total={4} current={1} />
        <Burst>
          <MailCheck size={38} />
        </Burst>
        <Heading style={{ fontSize: "1.8rem" }}>Check your inbox</Heading>
        <Sub style={{ margin: "10px auto 24px" }}>
          We sent a magic link to <Strong>{email}</Strong>. Tap it to confirm
          your email. You&apos;ll set a password next.
        </Sub>
        {error && (
          <AlertBox style={{ marginBottom: 16, textAlign: "left" }}>
            <Info size={18} />
            {error}
          </AlertBox>
        )}
        <PrimaryButton type="button" onClick={resend} disabled={busy || cooldown > 0} aria-busy={busy}>
          {busy ? <>Sending <ButtonOrb job="committing" /></> : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
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
      <Sub>Start with your email. No password yet. We keep it quick.</Sub>

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
        <PrimaryButton type="submit" disabled={busy} aria-busy={busy}>
          {busy ? <>Sending <ButtonOrb job="committing" /></> : <>Continue <ArrowRight size={19} /></>}
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
