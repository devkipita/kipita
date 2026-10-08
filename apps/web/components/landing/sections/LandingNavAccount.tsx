"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { createClient } from "@/lib/supabase/client";
import { nocturne } from "../nocturne";
import { Avatar } from "../../profile/Avatar";

const NavCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
    color: ${nocturne.greenDeep};
  }

  @media (max-width: 640px) {
    gap: 6px;
    padding: 9px 14px;
    font-size: 15px;
  }

  @media (max-width: 420px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const NavProfile = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 16px 5px 5px;
  border-radius: 999px;
  background: rgba(22, 22, 22, 0.72);
  border: 1px solid rgba(250, 248, 244, 0.1);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: ${nocturne.onGreen};
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: rgba(28, 28, 28, 0.82);
    border-color: rgba(250, 248, 244, 0.18);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  }

  .name {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 420px) {
    padding: 4px;
    .name {
      display: none;
    }
  }
`;

type Account = { name: string; avatarUrl: string | null };

export function LandingNavAccount() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;

    const read = async () => {
      try {
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (!active || !user) return;

        const meta = user.user_metadata ?? {};
        const name =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          user.email?.split("@")[0] ||
          "Account";
        const avatarUrl =
          (typeof meta.avatar_url === "string" && meta.avatar_url) ||
          (typeof meta.picture === "string" && meta.picture) ||
          null;
        setAccount({ name, avatarUrl });
      } catch {
        /* stay signed out */
      }
    };

    void read();
    return () => {
      active = false;
    };
  }, []);

  if (!account) return <NavCta href="/auth/sign-up">Get started</NavCta>;

  return (
    <NavProfile href="/home" aria-label="Go to your Kipita home">
      <Avatar name={account.name} src={account.avatarUrl} size={32} />
      <span className="name">{account.name.split(/\s+/)[0]}</span>
    </NavProfile>
  );
}
