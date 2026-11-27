"use client";

import { useEffect, useState, useTransition } from "react";
import styled from "styled-components";
import { Info, ArrowRight, ArrowClockwise as RotateCw } from "@/components/icons";
import {
  confirmPhoneVerificationAction,
  startPhoneVerificationAction,
} from "@/lib/auth/auth-actions";
import { formatKeLocal, isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";
import { PhoneField } from "@/components/auth/PhoneField";
import { OtpInput } from "@/components/auth/OtpInput";
import { AlertBox, Form, PrimaryButton, Sub, TextButton } from "@/components/auth/ui";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const COOLDOWN = 30;

const Notice = styled(AlertBox)`
  margin-bottom: 4px;
`;

const CodeSent = styled(Sub)`
  margin-bottom: 4px;
`;

const CodeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 20px;
`;

/**
 * Add or change a phone number and confirm it with an SMS code. The person is
 * already signed in; this never signs anyone in. `onVerified` receives the number
 * in Daraja form (2547XXXXXXXX), the same form the database stores.
 */
export function PhoneVerifyFlow({
  initialPhone,
  onVerified,
  onCancel,
}: {
  initialPhone?: string | null;
  onVerified: (phone: string) => void;
  onCancel?: () => void;
}) {
  const [phone, setPhone] = useState(() => normalizeKeLocal(initialPhone ?? ""));
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const busy = pending || resending;

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!isValidKeLocal(phone)) {
      setError("Enter a valid Kenyan number.");
      return;
    }
    startTransition(async () => {
      const result = await startPhoneVerificationAction(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtpSent(true);
      setCooldown(COOLDOWN);
    });
  }

  function resend() {
    if (cooldown > 0 || resending) return;
    setError("");
    setInfo("");
    startResend(async () => {
      const result = await startPhoneVerificationAction(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtp("");
      setInfo(`New code sent to +254 ${formatKeLocal(phone)}.`);
      setCooldown(COOLDOWN);
    });
  }

  function verify(code: string) {
    setError("");
    startTransition(async () => {
      const result = await confirmPhoneVerificationAction(phone, code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onVerified(toDaraja(phone));
    });
  }

  return (
    <>
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

      {!otpSent ? (
        <Form onSubmit={send}>
          <PhoneField value={phone} onChange={setPhone} />
          <PrimaryButton type="submit" disabled={busy || !isValidKeLocal(phone)} aria-busy={busy}>
            {busy ? <>Sending <ButtonOrb job="committing" /></> : <>Send code <ArrowRight size={19} /></>}
          </PrimaryButton>
          {onCancel && (
            <CodeRow>
              <TextButton type="button" onClick={onCancel}>
                Not now
              </TextButton>
            </CodeRow>
          )}
        </Form>
      ) : (
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.length === 6) verify(otp);
          }}
        >
          <CodeSent>Code sent to +254 {formatKeLocal(phone)}. Enter it below.</CodeSent>
          <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
          <PrimaryButton type="submit" disabled={busy || otp.length !== 6} aria-busy={busy}>
            {busy ? <>Verifying <ButtonOrb job="committing" /></> : "Verify number"}
          </PrimaryButton>
          <CodeRow>
            <TextButton type="button" disabled={cooldown > 0 || resending} aria-busy={resending} onClick={resend}>
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
    </>
  );
}
