"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { Camera, CircleNotch as Loader2 } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarAction } from "@/lib/auth/actions";
import { Avatar } from "./Avatar";

const Wrap = styled.div`
  position: relative;
  width: 84px;
  height: 84px;
  flex: none;
`;

const Trigger = styled.button`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 3px solid ${({ theme }) => theme.color.bg};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.color.primaryDark};
  }
  &:active {
    transform: scale(0.92);
  }
  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
`;

const Err = styled.p`
  margin: 8px 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.dangerText};
`;

const spin = keyframes`to { transform: rotate(360deg); }`;
const Spin = styled(Loader2)`
  animation: ${spin} 0.7s linear infinite;
`;

const MAX = 5 * 1024 * 1024; // 5MB — matches the avatars bucket limit

/**
 * `userId` is the PUBLIC `users.id`, not `auth_id`. The bucket's insert policy
 * (migration 011) compares the first path segment to `current_app_user_id()`,
 * which resolves to `users.id` — uploading under the auth id is rejected by
 * RLS. That mismatch is the exact bug migration 011 was written to fix.
 */
export function AvatarUploader({
  userId,
  name,
  src,
}: {
  userId: string;
  name: string;
  src?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setError("Use a JPG, PNG or WebP image.");
    }
    if (file.size > MAX) return setError("Keep it under 5MB.");

    setError("");
    setBusy(true);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      setPreview(null);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const res = await updateAvatarAction(data.publicUrl);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      setPreview(null);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Wrap>
        <Avatar name={name} src={preview ?? src} size={84} />
        <Trigger type="button" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Change photo">
          {busy ? <Spin size={16} /> : <Camera size={16} />}
        </Trigger>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={onPick}
        />
      </Wrap>
      {error && <Err>{error}</Err>}
    </div>
  );
}
