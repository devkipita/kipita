"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Info, ArrowRight, Envelope as Mail, Phone, ArrowClockwise as RotateCw } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { isValidKeLocal, toE164 } from "@/lib/auth/phone";
import { signInEmailSchema } from "@/lib/validators/auth";
import { TextField } from "./TextField";
import { PasswordField } from "./PasswordField";
import { PhoneField } from "./PhoneField";
import { OtpInput } from "./OtpInput";
import { OAuthButtons } from "./OAuthButtons";
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

const Tabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  background: ${({ theme }) => theme.color.surface2};
  border-radius: ${({ theme }) => theme.radius.pill};
  margin-bottom: 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: ${({ theme, $active }) => ($active ? theme.color.surface : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.color.text : theme.color.muted)};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadow.soft : "none")};
`;

const RowBetween = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
`;

import {
  attemptCooldownMs,
  clearAttempts,
  cooldownMessage,
  recordFailedAttempt,
} from "@/lib/security/attempt-throttle";

type Mode = "email" | "phone";

export function SignInForm({ next = "/home" }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});

  // phone
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  function done() {
    router.push(next);
    router.refresh();
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = signInEmailSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f: typeof errs = {};
      parsed.error.issues.forEach((i) => (f[i.path[0] as "email" | "password"] = i.message));
      setErrs(f);
      return;
    }
    setErrs({});

    const throttleKey = `signin:${email.trim().toLowerCase()}`;
    const wait = attemptCooldownMs(throttleKey);
    if (wait > 0) {
      setError(cooldownMessage(wait));
      return;
    }

    setBusy(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err || !data.session) {
      recordFailedAttempt(throttleKey);
      setError(err?.message ?? "Couldn't sign you in.");
      setBusy(false);
      return;
    }
    clearAttempts(throttleKey);
    done();
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidKeLocal(phone)) {
      setError("Enter a valid Kenyan number.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
    });
    setBusy(false);
    if (err) return setError(err.message);
    setOtpSent(true);
  }

  async function verifyOtp(code: string) {
    setError("");
    setBusy(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: code,
      type: "sms",
    });
    if (err || !data.session) {
      setError(err?.message ?? "That code didn't work.");
      setBusy(false);
      return;
    }
    done();
  }

  return (
    <>
      <Heading>Welcome back</Heading>
      <Sub>Sign in to book a seat, offer a ride, or check your trips.</Sub>

      <Tabs role="tablist">
        <Tab type="button" $active={mode === "email"} onClick={() => { setMode("email"); setError(""); }}>
          <Mail size={16} /> Email
        </Tab>
        <Tab type="button" $active={mode === "phone"} onClick={() => { setMode("phone"); setError(""); }}>
          <Phone size={16} /> Phone
        </Tab>
      </Tabs>

      {error && (
        <AlertBox style={{ marginBottom: 18 }}>
          <Info size={18} />
          {error}
        </AlertBox>
      )}

      {mode === "email" ? (
        <Form onSubmit={submitEmail}>
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
          <PasswordField
            value={password}
            onChange={setPassword}
            error={errs.password}
            autoComplete="current-password"
          />
          <RowBetween>
            <TextLink href="/auth/forgot-password">Forgot password?</TextLink>
          </RowBetween>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? <Spinner /> : <>Sign in <ArrowRight size={19} /></>}
          </PrimaryButton>
        </Form>
      ) : !otpSent ? (
        <Form onSubmit={sendOtp}>
          <PhoneField value={phone} onChange={setPhone} />
          <PrimaryButton type="submit" disabled={busy || !isValidKeLocal(phone)}>
            {busy ? <Spinner /> : <>Send code <ArrowRight size={19} /></>}
          </PrimaryButton>
        </Form>
      ) : (
        <Form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) verifyOtp(otp); }}>
          <Sub style={{ marginBottom: 4 }}>
            We texted a 6-digit code to +254 {phone}. Enter it below.
          </Sub>
          <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
          <PrimaryButton type="submit" disabled={busy || otp.length !== 6}>
            {busy ? <Spinner /> : "Verify & continue"}
          </PrimaryButton>
          <RowBetween style={{ justifyContent: "center" }}>
            <TextLink href="#" onClick={(e) => { e.preventDefault(); setOtpSent(false); setOtp(""); }}>
              <RotateCw size={13} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              Use a different number
            </TextLink>
          </RowBetween>
        </Form>
      )}

      <Divider>or continue with</Divider>
      <OAuthButtons next={next} />

      <FootNote>
        New to Kipita? <a href="/auth/sign-up">Create an account</a>
      </FootNote>
    </>
  );
}
