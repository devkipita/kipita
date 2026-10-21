"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, SignIn as LogIn, Envelope as Mail, Lock } from "@/components/icons";
import styled from "styled-components";
import { Brand } from "@/components/ui/Brand";
import {
  ButtonEl,
  Card,
  Field,
  Input,
  Notice,
} from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { signInAsAdminAction } from "@/lib/auth/auth-actions";
import { authErrorMessage } from "@/lib/auth/errors";
import GoogleLogo  from "@/public/Google";

const Screen = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 420px;
`;

const Title = styled.h1`
  font-size: 1.6rem;
  margin: 16px 0 24px;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.9rem;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

const RevealToggle = styled(Eye)`
  cursor: pointer;
  position: absolute;
  right: 12px;
  top: 40px;
  color: ${({ theme }) => theme.color.muted};
  z-index: 1;
`;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied");
  const authError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, startTransition] = useTransition();
  const [error, setError] = useState(() => {
    if (denied) return "This account isn't an admin.";
    return authErrorMessage(authError);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await signInAsAdminAction(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  function signInWithGoogle() {
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });

      if (oauthError) setError("Google sign-in couldn't start. Try again.");
    });
  }

  return (
    <Screen>
      <LoginCard>
        <Brand href="/" label="Kipita Admin" priority />
        <Title>Sign in</Title>

        {error && (
          <Notice $variant="error" style={{ marginBottom: 18 }}>
            {error}
          </Notice>
        )}

        <form onSubmit={submit}>
          <Field>
            <label htmlFor="email">
              <Mail size={16} />
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field style={{ position: "relative" }}>
            <label htmlFor="password">
              <Lock size={16} />
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <RevealToggle onClick={() => setShowPassword(!showPassword)} />
          </Field>
          <ButtonEl type="submit" style={{ width: "100%" }} disabled={busy}>
            {!busy && <LogIn size={20} />}
            {busy ? "Signing in…" : "Sign in"}
          </ButtonEl>
        </form>

        <Divider>or</Divider>

        <ButtonEl
          type="button"
          style={{ width: "100%" }}
          $variant="light"
          onClick={signInWithGoogle}
          disabled={busy}
        >
          <GoogleLogo size={20} />
          Sign in with Google
        </ButtonEl>
      </LoginCard>
    </Screen>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
