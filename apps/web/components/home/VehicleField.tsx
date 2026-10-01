"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Camera, CarProfile, X } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { fetchMyVehicle, uploadVehiclePhoto } from "@/lib/home/vehicle";

export type VehicleDraft = {
  make: string;
  model: string;
  color: string;
  photoUrl: string | null;
};

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
`;

const Shot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};

  .frame {
    position: relative;
    display: grid;
    place-items: center;
    width: 104px;
    height: 72px;
    flex: none;
    border-radius: ${({ theme }) => theme.radius.xs};
    overflow: hidden;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  .copy p {
    margin: 0 0 6px;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.45;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.onSecondaryContainer};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  svg {
    flex: none;
  }
`;

const Clear = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  cursor: pointer;
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  padding: 0 12px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};

  &::placeholder {
    color: ${({ theme }) => theme.color.textSoft};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 1px;
  }
`;

const Problem = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.type.micro};
  color: ${({ theme }) => theme.color.dangerText};
`;

export function VehicleField({
  value,
  onChange,
  userId,
}: {
  value: VehicleDraft;
  onChange: (next: VehicleDraft) => void;
  userId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded) return;
    let alive = true;

    void (async () => {
      const mine = await fetchMyVehicle(createClient(), userId);
      if (!alive) return;
      setLoaded(true);
      if (!mine) return;
      onChange({
        make: mine.make ?? "",
        model: mine.model ?? "",
        color: mine.color ?? "",
        photoUrl: mine.image_url,
      });
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loaded]);

  async function pick(file: File | null) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const result = await uploadVehiclePhoto(createClient(), file, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ ...value, photoUrl: result.url });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrap>
      <Shot>
        <span className="frame">
          {value.photoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.photoUrl} alt="" />
              <Clear
                type="button"
                onClick={() => onChange({ ...value, photoUrl: null })}
                aria-label="Remove car photo"
              >
                <X size={14} weight="bold" />
              </Clear>
            </>
          ) : (
            <CarProfile size={26} />
          )}
        </span>

        <span className="copy">
          <p>A photo of your car helps passengers find you at pick-up.</p>
          <Action
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={16} />
            {busy ? "Uploading…" : value.photoUrl ? "Replace photo" : "Add car photo"}
          </Action>
        </span>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => void pick(e.target.files?.[0] ?? null)}
        />
      </Shot>

      {error && <Problem role="alert">{error}</Problem>}

      <Fields>
        <Input
          value={value.make}
          onChange={(e) => onChange({ ...value, make: e.target.value })}
          placeholder="Make (Toyota)"
          aria-label="Car make"
          maxLength={40}
        />
        <Input
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
          placeholder="Model (Premio)"
          aria-label="Car model"
          maxLength={40}
        />
        <Input
          value={value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          placeholder="Colour (Silver)"
          aria-label="Car colour"
          maxLength={30}
        />
      </Fields>
    </Wrap>
  );
}
