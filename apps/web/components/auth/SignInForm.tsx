"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Info, ArrowRight, Envelope as Mail, Phone, ArrowClockwise as RotateCw } from "@/components/icons";
import {
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
} from "@/lib/auth/auth-actions";
import { isValidKeLocal } from "@/lib/phone";
import { signInEmailSchema } from "@/lib/validators/auth";
import { dur, ease, nocturne } from "@/lib/nocturne";
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
  Sub,
  TextButton,
  TextLink,
} from "./ui";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const Tabs = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  background: ${nocturne.surface2};
  border: 1px solid ${nocturne.line};
  border-radius: 999px;
  margin-bottom: 24px;
`;

const Slider = styled.span<{ $at: number }>`
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 5px;
  width: calc(50% - 8px);
  border-radius: 999px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};
  border: 1px solid ${nocturne.line};
  transform: translateX(${({ $at }) => ($at === 0 ? "0" : "calc(100% + 6px)")});
  transition: transform ${dur.state} ${ease.standard};
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ $active }) => ($active ? nocturne.cream : nocturne.muted)};
  transition: color ${dur.state} ${ease.standard};

  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 1px;
  }
`;

const RowBetween = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
`;

const CodeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 20px;
`;

const Notice = styled(AlertBox)`
  margin-bottom: 18px;
`;

const CodeSent = styled(Sub)`
  margin-bottom: 4px;
`;

type Mode = "email" | "phone";

const MODES: { key: Mode; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone", icon: Phone },
];

const COOLDOWN = 30;

export function SignInForm({
  next = "/home",
  notice = "",
}: {
  next?: string;
  notice?: string;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("email");
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(notice);
  const [info, setInfo] = useState("");
  const busy = pending || signingIn;
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ email: null, phone: null });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function done(target: string) {
    router.replace(target);
    router.refresh();
  }

  function pickMode(nextMode: Mode, focus = false) {
    setMode(nextMode);
    setError("");
    setInfo("");
    if (focus) tabRefs.current[nextMode]?.focus();
  }

  function onTabKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const target: Mode =
      e.key === "Home" ? "email" : e.key === "End" ? "phone" : mode === "email" ? "phone" : "email";
    pickMode(target, true);
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
    setSigningIn(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        next?: string;
      };

      if (!result.ok) {
        setError(result.error ?? "Couldn't sign you in.");
        setSigningIn(false);
        return;
      }
      done(result.next ?? next);
    } catch {
      setError("Couldn't reach Kipita. Check your connection and try again.");
      setSigningIn(false);
    }
  }

  function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!isValidKeLocal(phone)) {
      setError("Enter a valid Kenyan number.");
      return;
    }
    startTransition(async () => {
      const result = await sendPhoneOtpAction(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtpSent(true);
      setCooldown(COOLDOWN);
    });
  }

  function resendOtp() {
    if (cooldown > 0 || resending) return;
    setError("");
    setInfo("");
    startResend(async () => {
      const result = await sendPhoneOtpAction(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtp("");
      setInfo(`We sent a new code to +254 ${phone}.`);
      setCooldown(COOLDOWN);
    });
  }

  function verifyOtp(code: string) {
    setError("");
    startTransition(async () => {
      const result = await verifyPhoneOtpAction(phone, code, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      done(result.next ?? next);
    });
  }

  const signUpHref =
    next && next !== "/home" ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up";

  return (
    <>
      <Heading>Welcome back</Heading>
      <Sub>Sign in to book a seat, offer a ride, or check your trips.</Sub>

      <Tabs role="tablist" aria-label="Sign in with" onKeyDown={onTabKey}>
        <Slider $at={mode === "email" ? 0 : 1} aria-hidden />
        {MODES.map(({ key, label, icon: Icon }) => {
          const active = mode === key;
          return (
            <Tab
              key={key}
              ref={(el) => {
                tabRefs.current[key] = el;
              }}
              id={`sign-in-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="sign-in-panel"
              tabIndex={active ? 0 : -1}
              $active={active}
              onClick={() => pickMode(key)}
            >
              <Icon size={16} aria-hidden /> {label}
            </Tab>
          );
        })}
      </Tabs>

      <div id="sign-in-panel" role="tabpanel" aria-labelledby={`sign-in-tab-${mode}`}>
        {error && (
          <Notice>
            <Info size={18} />
            {error}
          </Notice>
        )}
        {!error && info && (
          <Notice $tone="info">
            <Info size={18} />
            {info}
          </Notice>
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
            <PrimaryButton type="submit" disabled={busy} aria-busy={busy}>
              {busy ? <>Signing in <ButtonOrb job="fetching" /></> : <>Sign in <ArrowRight size={19} /></>}
            </PrimaryButton>
          </Form>
        ) : !otpSent ? (
          <Form onSubmit={sendOtp}>
            <PhoneField value={phone} onChange={setPhone} />
            <PrimaryButton type="submit" disabled={busy || !isValidKeLocal(phone)} aria-busy={busy}>
              {busy ? <>Sending <ButtonOrb job="committing" /></> : <>Send code <ArrowRight size={19} /></>}
            </PrimaryButton>
          </Form>
        ) : (
          <Form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) verifyOtp(otp); }}>
            <CodeSent>
              We texted a 6-digit code to +254 {phone}. Enter it below.
            </CodeSent>
            <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
            <PrimaryButton type="submit" disabled={busy || otp.length !== 6} aria-busy={busy}>
              {busy ? <>Verifying <ButtonOrb job="committing" /></> : "Verify & continue"}
            </PrimaryButton>
            <CodeRow>
              <TextButton
                type="button"
                disabled={cooldown > 0 || resending}
                aria-busy={resending}
                onClick={resendOtp}
              >
                {resending ? "Sending code" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </TextButton>
              <TextButton
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setInfo("");
                  setError("");
                }}
              >
                <RotateCw size={14} aria-hidden />
                Use a different number
              </TextButton>
            </CodeRow>
          </Form>
        )}
      </div>

      <Divider>or continue with</Divider>
      <OAuthButtons next={next} />

      <FootNote>
        New to Kipita? <Link href={signUpHref}>Create an account</Link>
      </FootNote>
    </>
  );
}
