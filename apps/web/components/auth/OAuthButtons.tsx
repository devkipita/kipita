"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AlertBox, GhostButton, Spinner } from "./ui";
import GoogleLogo from "@/public/Google";

/** Google sign-in. Redirects through /auth/callback with the given next. */
export function OAuthButtons({ next = "/home" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) {
      // Provider not enabled in Supabase, etc. — don't fail silently.
      setError(
        /not enabled|unsupported/i.test(err.message)
          ? "Google sign-in isn't switched on yet. Use email or phone for now."
          : err.message,
      );
      setBusy(false);
    }
    // On success the browser navigates away.
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
