"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { setPasswordSchema } from "@/lib/validators/auth";
import { PasswordField } from "./PasswordField";
import { StepDots } from "./StepDots";
import {
  AlertBox,
  Form,
  Heading,
  PrimaryButton,
  Spinner,
  Sub,
} from "./ui";

type Props = {
  heading: string;
  sub: string;
  cta: string;
  redirectTo: string;
  /** Show the signup progress rail (step index) when part of onboarding. */
  step?: number;
};

/** Sets a new password on the current (verified / recovery) session. */
export function NewPasswordForm({ heading, sub, cta, redirectTo, step }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = setPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const f: typeof errs = {};
      parsed.error.issues.forEach((i) => (f[i.path[0] as "password" | "confirm"] = i.message));
      setErrs(f);
      return;
    }
    setErrs({});
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      {step !== undefined && <StepDots total={4} current={step} />}
      <Heading>{heading}</Heading>
      <Sub>{sub}</Sub>

      {error && (
        <AlertBox style={{ marginBottom: 18 }}>
          <Info size={18} />
          {error}
        </AlertBox>
      )}

      <Form onSubmit={submit}>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          error={errs.password}
          strength
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          error={errs.confirm}
          autoComplete="new-password"
        />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? <Spinner /> : <>{cta} <Check size={19} /></>}
        </PrimaryButton>
      </Form>
    </>
  );
}
