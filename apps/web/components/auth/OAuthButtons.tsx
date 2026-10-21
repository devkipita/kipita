"use client";

import { useState } from "react";
import { Info } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/security/redirect";
import { AlertBox, GhostButton, Spinner } from "./ui";
import GoogleLogo from "@/public/Google";

export function OAuthButtons({ next = "/home" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const target = safeNextPath(next);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (err) {
      setError(
        /not enabled|unsupported|provider/i.test(err.message)
          ? "Google sign-in isn't switched on yet. Use email or phone for now."
          : "Google sign-in couldn't start. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <GhostButton type="button" onClick={go} disabled={busy}>
        {busy ? <Spinner /> : <GoogleLogo size={20} />}
        Continue with Google
      </GhostButton>
      {error && (
        <AlertBox style={{ marginTop: 12 }}>
          <Info size={18} />
          {error}
        </AlertBox>
      )}
    </>
  );
}
