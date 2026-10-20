"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth/types";

function fromUser(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
    "Kipita user";

  return {
    id: user.id,
    auth_id: user.id,
    full_name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
    email: user.email ?? null,
    phone: user.phone ?? null,
    avatar_url:
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null,
    date_of_birth: null,
    gender: null,
    city: null,
    country: "KE",
    is_verified: false,
    email_verified: !!user.email_confirmed_at,
    phone_verified: !!user.phone_confirmed_at,
    rating: 0,
    total_trips: 0,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

export function useViewerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const user = data.session?.user ?? null;
      setProfile(user ? fromUser(user) : null);
      setPending(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const user = session?.user ?? null;
      setProfile(user ? fromUser(user) : null);
      setPending(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, pending };
}
