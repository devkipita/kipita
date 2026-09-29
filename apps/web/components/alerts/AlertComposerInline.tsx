"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";
import {
  Crosshair,
  ImageSquare,
  MapPin,
  Tag,
  X,
} from "@/components/icons";
import { findNearestTown } from "@kipita/shared";
import { Avatar } from "@/components/profile/Avatar";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { createAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import { removeAlertImage, uploadAlertImage } from "@/lib/alerts/upload";
import { requestPreciseLocation } from "@/lib/alerts/location";
import type { AlertCategory } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";

const MAX = 1000;

const Shell = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px 4px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
`;

const Main = styled.div`
  min-width: 0;
  display: grid;
  gap: 10px;
`;

const Input = styled.textarea`
  width: 100%;
  border: none;
  background: transparent;
  resize: none;
  padding: 8px 0 0;
  font: inherit;
  font-size: 1.15rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;

  &::placeholder {
    color: ${({ theme }) => theme.color.muted};
  }
  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: none;
  }
`;

const Chosen = styled.button<{ $accent: string }>`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.onSecondaryContainer};
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;

  svg {
    color: ${({ $accent }) => $accent};
    flex: none;
  }

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
  }
`;

const Where = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  color: ${({ theme }) => theme.color.primary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    color: ${({ theme }) => theme.color.primary};
    padding: 6px 0;
  }
  input::placeholder {
    color: ${({ theme }) => theme.color.primary};
    opacity: 0.7;
  }
  input:focus {
    outline: none;
  }
`;

const Preview = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  max-height: 240px;

  img {
    width: 100%;
    object-fit: cover;
    display: block;
  }
  button {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    cursor: pointer;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding-top: 2px;

  .spacer {
    flex: 1;
  }
`;

const Tool = styled.button<{ $on?: boolean }>`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.textSoft)};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surface2};
    color: ${({ theme }) => theme.color.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Types = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TypeChip = styled.button<{ $accent: string; $active: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? "transparent" : theme.color.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ theme, $active }) =>
    $active ? theme.color.secondaryContainer : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onSecondaryContainer : theme.color.onSurfaceVariant};
  font: inherit;
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  svg {
    color: ${({ $accent }) => $accent};
    flex: none;
  }

  &:hover {
    color: ${({ theme }) => theme.color.onSurface};
    border-color: ${({ theme }) => theme.color.outline};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Counter = styled.span<{ $over: boolean }>`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ theme, $over }) => ($over ? theme.color.dangerText : theme.color.muted)};
`;

export function AlertComposerInline({
  profile,
  onPosted,
}: {
  profile: Profile;
  onPosted: (input: {
    id: string;
    category: AlertCategory;
    location: string;
    content: string;
    image_url: string | null;
    lat: number | null;
    lng: number | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [category, setCategory] = useState<AlertCategory>("traffic");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const whereRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, open ? 56 : 32)}px`;
  }, [content, open]);

  function reset() {
    setOpen(false);
    setShowTypes(false);
    setCategory("traffic");
    setLocation("");
    setContent("");
    setCoords(null);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  async function useMyLocation() {
    setOpen(true);
    setLocating(true);
    setError(null);
    const outcome = await requestPreciseLocation();
    setLocating(false);

    if (!outcome.ok) {
      setError(
        outcome.reason === "denied"
          ? "Location is off for this site. Type the road name instead."
          : "Couldn’t get your location. Type the road name instead.",
      );
      whereRef.current?.focus();
      return;
    }

    setCoords(outcome.coords);
    const town = findNearestTown(outcome.coords);
    if (town && !location.trim()) setLocation(town.name);
  }

  function pickFile(next: File | null) {
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  const canPost = content.trim().length >= 3 && location.trim().length >= 2;
  const remaining = MAX - content.length;
  const meta = ALERT_META[category];
  const ChosenIcon = meta.icon;

  function submit() {
    if (!canPost || pending) return;

    startTransition(async () => {
      setError(null);
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (file) {
        const upload = await uploadAlertImage(createClient(), file, profile.id);
        if (!upload.ok) {
          setError(upload.error);
          return;
        }
        imageUrl = upload.url;
        imagePath = upload.path;
      }

      const payload = {
        category,
        location: location.trim(),
        content: content.trim(),
        image_url: imageUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      };

      const result = await createAlertAction(payload);
      if (!result.ok) {
        if (imagePath) await removeAlertImage(createClient(), imagePath);
        setError(result.error);
        return;
      }

      onPosted({ id: result.id, ...payload });
      reset();
    });
  }

  return (
    <Shell>
      <Avatar name={profile.full_name || "You"} src={profile.avatar_url} size={40} />

      <Main>
        {error && <Notice $variant="error">{error}</Notice>}

        <Input
          ref={inputRef}
          rows={1}
          value={content}
          onFocus={() => setOpen(true)}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          placeholder="What&#x2019;s happening on the road?"
          aria-label="What is happening on the road?"
        />

        {open && (
          <>
            <Chosen
              type="button"
              $accent={meta.color}
              onClick={() => setShowTypes((v) => !v)}
              aria-expanded={showTypes}
            >
              <ChosenIcon size={16} />
              {meta.label}
            </Chosen>

            {showTypes && (
              <Types role="group" aria-label="Alert type">
                {ALERT_CATEGORIES.map((key) => {
                  const m = ALERT_META[key];
                  const Icon = m.icon;
                  return (
                    <TypeChip
                      key={key}
                      type="button"
                      $accent={m.color}
                      $active={category === key}
                      aria-pressed={category === key}
                      onClick={() => {
                        setCategory(key);
                        setShowTypes(false);
                      }}
                    >
                      <Icon size={16} />
                      {m.label}
                    </TypeChip>
                  );
                })}
              </Types>
            )}

            <Where>
              <MapPin size={24} weight="fill" />
              <input
                ref={whereRef}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add the road or place"
                maxLength={120}
                aria-label="Where is this?"
              />
            </Where>

            {previewUrl && (
              <Preview>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" />
                <button type="button" onClick={() => pickFile(null)} aria-label="Remove photo">
                  <X size={24} weight="bold" />
                </button>
              </Preview>
            )}
          </>
        )}

        <Foot>
          <Tool
            type="button"
            onClick={() => {
              setOpen(true);
              fileRef.current?.click();
            }}
            aria-label="Add a photo"
            title="Add a photo"
          >
            <ImageSquare size={20} />
          </Tool>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          <Tool
            type="button"
            $on={Boolean(coords)}
            disabled={locating}
            onClick={() => void useMyLocation()}
            aria-label="Use my location"
            title="Use my location"
          >
            <Crosshair size={20} />
          </Tool>

          <Tool
            type="button"
            $on={open && showTypes}
            onClick={() => {
              setOpen(true);
              setShowTypes((v) => !v);
            }}
            aria-label="Choose alert type"
            title="Choose alert type"
          >
            <Tag size={20} />
          </Tool>

          <span className="spacer" />

          {open && remaining <= 100 && (
            <Counter $over={remaining < 0}>{remaining}</Counter>
          )}

          {open && (
            <ButtonEl type="button" $compact $variant="ghost" onClick={reset}>
              Cancel
            </ButtonEl>
          )}

          <ButtonEl type="button" $compact onClick={submit} disabled={!canPost || pending}>
            {pending ? "Posting…" : "Post"}
          </ButtonEl>
        </Foot>
      </Main>
    </Shell>
  );
}
