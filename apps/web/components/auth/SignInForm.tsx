"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Info, ArrowRight, Envelope as Mail } from "@/components/icons";
import { signInEmailSchema } from "@/lib/validators/auth";
import { TextField } from "./TextField";
import { PasswordField } from "./PasswordField";
import { OAuthButtons } from "./OAuthButtons";
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

const RowBetween = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
`;

const Notice = styled(AlertBox)`
  margin-bottom: 18px;
`;

/**
 * Sign-in is by email only. A phone number is a separate, verified detail kept in
 * the profile (see PhoneVerifyFlow), so no SMS is ever sent to let someone in.
 */
export function SignInForm({
  next = "/home",
  notice = "",
}: {
  next?: string;
  notice?: string;
}) {
  const router = useRouter();

  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(notice);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});

  function done(target: string) {
    router.replace(target);
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
      setError("No connection. Try again.");
      setSigningIn(false);
    }
  }

  const signUpHref =
    next && next !== "/home" ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up";

  return (
    <>
      <Heading>Welcome back</Heading>
      <Sub>Sign in to continue.</Sub>

      {error && (
        <Notice>
          <Info size={18} />
          {error}
        </Notice>
      )}

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
        <PrimaryButton type="submit" disabled={signingIn} aria-busy={signingIn}>
          {signingIn ? <>Signing in <ButtonOrb job="fetching" /></> : <>Sign in <ArrowRight size={19} /></>}
        </PrimaryButton>
      </Form>

      <Divider>or continue with</Divider>
      <OAuthButtons next={next} />

      <FootNote>
        New to Kipita? <Link href={signUpHref}>Create an account</Link>
      </FootNote>
    </>
  );
}
