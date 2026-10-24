"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled, { keyframes } from "styled-components";
import {
  CaretDown,
  CheckSmall as Check,
  Crosshair,
  ImageSquare,
  MapPin,
  X,
} from "@/components/icons";
import { findNearestTown } from "@kipita/shared";
import { Avatar } from "@/components/profile/Avatar";
import { Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { createAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import { removeAlertImage, uploadAlertImage } from "@/lib/alerts/upload";
import { requestPreciseLocation } from "@/lib/alerts/location";
import type { AlertCategory } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { ButtonOrb } from "@/components/ui/ButtonOrb";

const MAX = 1000;

const Shell = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 12px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.surfaceContainerHighest};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
`;

const Input = styled.textarea`
  width: 100%;
  border: none;
  background: transparent;
  resize: none;
  padding: 8px 0 0;
  font: inherit;
  font-size: 1.15rem;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.onSurface};
  caret-color: ${({ theme }) => theme.color.primary};
  overflow: hidden;

  &::placeholder {
    color: ${({ theme }) => theme.color.muted};
    font-weight: 400;
  }
  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: none;
  }
`;

const Where = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  font-size: 16px;
  color: ${({ theme }) => theme.color.text};

  > svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  input {
    flex: 1 1 140px;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 16px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.text};
    padding: 6px 0;
  }
  input::placeholder {
    color: ${({ theme }) => theme.color.muted};
    font-weight: 400;
  }
  input:focus {
    outline: none;
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.color.primary};
  }
  @media (max-width: 599px) {
    padding-right: 8px;
  }
`;

const Locate = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  border-radius: 10px;
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.primary};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
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
  flex-wrap: wrap;
  gap: 8px;
  margin-left: 52px;
  padding-top: 2px;

  .spacer {
    flex: 1;
  }

  @media (max-width: 420px) {
    margin-left: 0;

    .spacer {
      flex-basis: 100%;
      height: 0;
    }
  }
`;

const Tool = styled.button<{ $on?: boolean }>`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.color.primary};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;

  svg {
    filter: ${({ $on }) =>
      $on ? "drop-shadow(0 1px 4px rgba(47, 108, 79, 0.45))" : "none"};
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.primaryContainer};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  &:active:not(:disabled) {
    transform: scale(0.94);
  }
  &:disabled {
    color: ${({ theme }) => theme.color.outline};
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 420px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ComposerButton = styled.button<{ $variant?: "primary" | "ghost" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  min-width: ${({ $variant }) => ($variant === "ghost" ? "78px" : "72px")};
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === "ghost" ? theme.color.outlineVariant : "transparent"};
  background: ${({ theme, $variant }) =>
    $variant === "ghost" ? theme.color.surfaceContainerLowest : theme.color.primary};
  color: ${({ theme, $variant }) =>
    $variant === "ghost" ? theme.color.onSurfaceVariant : theme.color.onPrimary};
  font: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease,
    transform 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) =>
      $variant === "ghost" ? theme.color.surfaceContainerHigh : theme.color.primaryDark};
    color: ${({ theme, $variant }) =>
      $variant === "ghost" ? theme.color.onSurface : theme.color.onPrimary};
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    border-color: ${({ theme }) => theme.color.outlineVariant};
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ToolCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 420px) {
    flex: 1 1 auto;
  }
`;

const pillsIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: none; }
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  animation: ${pillsIn} 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  /* line up with the text column, past the 40px avatar + 12px gap */
  margin-left: 52px;
  padding: 0;
  position: relative;

  /* On phones the location panel spans the text column instead of hanging
     off the second pill, which pushed it past the screen edge. */
  @media (max-width: 599px) {
    margin-left: 48px;

    > div:nth-child(2) {
      position: static;
    }
  }

  @media (max-width: 360px) {
    margin-left: 0;
  }
`;

const PillWrap = styled.div`
  position: relative;
  min-width: 0;
`;

const Pill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 36px;
  padding: 0 12px 0 10px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? "transparent" : theme.color.outlineVariant};
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surfaceContainerLowest};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.onSurface};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  .label {
    min-width: 0;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex: none;
  }
  .caret {
    color: currentColor;
    opacity: 0.72;
    transition: transform 0.2s ease;
  }
  &:hover,
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.secondaryContainer};
    color: ${({ theme }) => theme.color.onSecondaryContainer};
  }
  &[aria-expanded="true"] .caret {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    .caret {
      transition: none;
    }
  }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: none; }
`;

const Menu = styled.div`
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.color.outlineVariant};
  border-radius: 16px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  box-shadow:
    0 2px 6px rgba(18, 48, 31, 0.1),
    0 14px 32px rgba(18, 48, 31, 0.18);
  animation: ${popIn} 0.16s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const MenuItem = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 10px;
  background: ${({ theme, $on }) =>
    $on ? theme.color.secondaryContainer : "transparent"};
  color: ${({ theme, $on }) =>
    $on ? theme.color.onSecondaryContainer : theme.color.onSurface};
  font: inherit;
  font-size: 15px;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  text-align: left;
  cursor: pointer;

  .tick {
    margin-left: auto;
    color: ${({ theme }) => theme.color.primary};
  }
  &:hover,
  &:focus-visible {
    background: ${({ theme, $on }) =>
      $on ? theme.color.secondaryContainer : theme.color.surfaceContainerLow};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
`;

const WherePanel = styled(Menu)`
  min-width: min(320px, calc(100vw - 48px));
  padding: 10px;
  display: grid;
  gap: 8px;

  @media (max-width: 599px) {
    left: 0;
    right: 0;
    min-width: 0;
  }
`;

const PreviewWrap = styled.div`
  margin-left: 52px;

  @media (max-width: 599px) {
    margin-left: 48px;
  }

  @media (max-width: 360px) {
    margin-left: 0;
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
  const [menu, setMenu] = useState<"type" | "where" | null>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!pillsRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function reset() {
    setOpen(false);
    setMenu(null);
    setCategory("traffic");
    setLocation("");
    setContent("");
    setCoords(null);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  // The type and location pills appear the moment there is something to post.
  const composing = content.trim().length > 0;

  // Offer a location as soon as they start writing, so the common case is one
  // less thing to fill in. Failure is silent — the field stays typeable.
  const locateTried = useRef(false);
  useEffect(() => {
    if (!composing || locateTried.current) return;
    locateTried.current = true;
    void useMyLocation({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composing]);

  async function useMyLocation(opts: { silent?: boolean } = {}) {
    setOpen(true);
    setLocating(true);
    setError(null);
    const outcome = await requestPreciseLocation();
    setLocating(false);

    if (!outcome.ok) {
      // The automatic attempt must not shout at someone who is mid-sentence.
      if (opts.silent) return;
      setError(
        outcome.reason === "denied"
          ? "Location is off for this site. Type the road name instead."
          : "Couldn't get your location. Type the road name instead.",
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
  const dirty = Boolean(content.trim() || location.trim() || file);
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
      {composing && (
      <PillRow ref={pillsRef}>
            <PillWrap>
              <Pill
                type="button"
                aria-haspopup="listbox"
                aria-expanded={menu === "type"}
                aria-label={`Alert type: ${meta.label}`}
                onClick={() => {
                  setOpen(true);
                  setMenu(menu === "type" ? null : "type");
                }}
              >
                <ChosenIcon size={20} style={{ color: meta.color }} aria-hidden />
                <span className="label">{meta.label}</span>
                <CaretDown size={16} className="caret" aria-hidden />
              </Pill>
              {menu === "type" && (
                <Menu role="listbox" aria-label="What kind of alert?">
                  {ALERT_CATEGORIES.map((key) => {
                    const m = ALERT_META[key];
                    const Icon = m.icon;
                    return (
                      <MenuItem
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={category === key}
                        $on={category === key}
                        onClick={() => {
                          setCategory(key);
                          setMenu(null);
                        }}
                      >
                        <Icon size={20} style={{ color: m.color }} aria-hidden />
                        {m.label}
                        {category === key && (
                          <Check size={18} className="tick" aria-hidden />
                        )}
                      </MenuItem>
                    );
                  })}
                </Menu>
              )}
            </PillWrap>

            <PillWrap>
              <Pill
                type="button"
                $active={Boolean(location.trim())}
                aria-haspopup="dialog"
                aria-expanded={menu === "where"}
                onClick={() => {
                  setOpen(true);
                  const next = menu === "where" ? null : "where";
                  setMenu(next);
                  if (next) setTimeout(() => whereRef.current?.focus(), 0);
                }}
              >
                <MapPin size={20} aria-hidden />
                <span className="label">
                  {location.trim() || "Add location"}
                </span>
                <CaretDown size={16} className="caret" aria-hidden />
              </Pill>
              {menu === "where" && (
                <WherePanel role="dialog" aria-label="Where is this?">
                  <Where>
                    <MapPin size={20} aria-hidden />
                    <input
                      ref={whereRef}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setMenu(null);
                        }
                      }}
                      placeholder={
                        locating ? "Finding you..." : "Road, town or landmark"
                      }
                      maxLength={120}
                      aria-label="Where is this?"
                    />
                  </Where>
                  <Locate
                    type="button"
                    disabled={locating}
                    onClick={() => void useMyLocation()}
                  >
                    <Crosshair size={16} aria-hidden />
                    {locating
                      ? "Locating..."
                      : coords
                        ? "Update my location"
                        : "Use my location"}
                  </Locate>
                </WherePanel>
              )}
            </PillWrap>
      </PillRow>
      )}

      <TopRow>
        <Avatar
          name={profile.full_name || "You"}
          src={profile.avatar_url}
          size={40}
        />
        <Input
          ref={inputRef}
          rows={1}
          value={content}
          onFocus={() => setOpen(true)}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          placeholder="What's happening on the road?"
          aria-label="What is happening on the road?"
        />
      </TopRow>

      {error && <Notice $variant="error">{error}</Notice>}

      {previewUrl && (
        <PreviewWrap>
          <Preview>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" />
            <button
              type="button"
              onClick={() => pickFile(null)}
              aria-label="Remove photo"
            >
              <X size={24} weight="bold" />
            </button>
          </Preview>
        </PreviewWrap>
      )}
      <Foot>
        <ToolCluster>
          <Tool
            type="button"
            $on={Boolean(file)}
            onClick={() => {
              setOpen(true);
              fileRef.current?.click();
            }}
            aria-label="Add a photo"
            title="Add a photo"
          >
            <ImageSquare size={24} weight={file ? "fill" : "bold"} />
          </Tool>
          <Tool
            type="button"
            $on={Boolean(location.trim() || coords)}
            onClick={() => {
              setOpen(true);
              setMenu("where");
              setTimeout(() => whereRef.current?.focus(), 0);
            }}
            aria-label="Add location"
            title="Add location"
          >
            <MapPin
              size={24}
              weight={location.trim() || coords ? "fill" : "bold"}
            />
          </Tool>
        </ToolCluster>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          <span className="spacer" />

          {open && remaining <= 100 && (
            <Counter $over={remaining < 0}>{remaining}</Counter>
          )}

          <ActionGroup>
          {dirty && (
            <ComposerButton type="button" $variant="ghost" onClick={reset}>
              Clear
            </ComposerButton>
          )}

          <ComposerButton type="button" onClick={submit} disabled={!canPost || pending} aria-busy={pending}>
            {pending ? <><ButtonOrb job="committing" /> Posting</> : "Post"}
          </ComposerButton>
          </ActionGroup>
        </Foot>
    </Shell>
  );
}
