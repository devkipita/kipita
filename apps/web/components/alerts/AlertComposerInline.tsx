"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";
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
import { Collapse } from "@/components/anim/Collapse";
import { Notice } from "@/components/ui/primitives";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { createClient } from "@/lib/supabase/client";
import { createAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import { removeAlertImage, uploadAlertImage } from "@/lib/alerts/upload";
import { requestPreciseLocation } from "@/lib/alerts/location";
import { dur, ease, nocturne } from "@/lib/nocturne";
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
  &:focus,
  &:focus-visible {
    outline: none;
  }
`;

const WhereBody = styled.div`
  display: grid;
  gap: 8px;
  width: min(320px, calc(100vw - 48px));
  padding: 6px;

  @media (max-width: 859px) {
    width: auto;
    padding: 0;
  }
`;

const Where = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid ${nocturne.outline};
  border-radius: 12px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  input {
    flex: 1 1 140px;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.cream};
    padding: 6px 0;
  }
  input::placeholder {
    color: ${nocturne.muted2};
    font-weight: 400;
  }
  input:focus {
    outline: none;
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Locate = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid ${nocturne.accent};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.accent};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${nocturne.surface2};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
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
    top: 6px;
    right: 6px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 999px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
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
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: ${({ theme, $on }) => ($on ? theme.color.primaryContainer : "transparent")};
  color: ${({ theme }) => theme.color.primary};
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryContainer};
    }
  }
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.primaryContainer};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    color: ${({ theme }) => theme.color.outline};
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
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
  gap: 6px;
  min-height: 44px;
  min-width: ${({ $variant }) => ($variant === "ghost" ? "78px" : "72px")};
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid
    ${({ theme, $variant }) => ($variant === "ghost" ? theme.color.primary : "transparent")};
  background: ${({ theme, $variant }) =>
    $variant === "ghost" ? theme.color.surfaceContainerLowest : theme.color.primary};
  color: ${({ theme, $variant }) =>
    $variant === "ghost" ? theme.color.primary : theme.color.onPrimary};
  font: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme, $variant }) =>
        $variant === "ghost" ? theme.color.primaryContainer : theme.color.primaryDark};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    border-color: ${({ theme }) => theme.color.outlineVariant};
    cursor: default;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const ToolCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 420px) {
    flex: 1 1 auto;
  }
`;

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 4px 4px;
  margin-left: 48px;

  @media (max-width: 599px) {
    margin-left: 44px;
  }

  @media (max-width: 360px) {
    margin-left: -4px;
  }
`;

const Pill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 44px;
  padding: 0 14px 0 12px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? "transparent" : theme.color.outlineVariant)};
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surfaceContainerLowest};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.onSurface};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};

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
    transition: transform ${dur.state} ${ease.standard};
  }
  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.secondaryContainer};
      color: ${({ theme }) => theme.color.onSecondaryContainer};
    }
  }
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.secondaryContainer};
    color: ${({ theme }) => theme.color.onSecondaryContainer};
  }
  &[aria-expanded="true"] .caret {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 1px;
  }
`;

const TypeOption = styled(PopoverItem)`
  .tick {
    margin-left: auto;
    color: ${nocturne.accent};
  }
  &[aria-selected="true"] {
    font-weight: 800;
    background: ${nocturne.surface2};
  }
`;

const Counter = styled.span<{ $over: boolean }>`
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $over }) => ($over ? nocturne.danger : nocturne.muted2)};
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

type MenuKind = "type" | "where" | null;

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
  const [menu, setMenu] = useState<MenuKind>(null);
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
  const typePillRef = useRef<HTMLButtonElement>(null);
  const wherePillRef = useRef<HTMLButtonElement>(null);
  const whereToolRef = useRef<HTMLButtonElement>(null);
  const whereAnchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, open ? 56 : 32)}px`;
  }, [content, open]);

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

  const composing = content.trim().length > 0;

  const locateTried = useRef(false);
  useEffect(() => {
    if (!composing || locateTried.current) return;
    locateTried.current = true;
    void locateMe({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composing]);

  async function locateMe(opts: { silent?: boolean } = {}) {
    setOpen(true);
    setLocating(true);
    setError(null);
    const outcome = await requestPreciseLocation();
    setLocating(false);

    if (!outcome.ok) {
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

  function toggleWhere(anchor: HTMLElement | null) {
    setOpen(true);
    if (menu === "where" && whereAnchorRef.current === anchor) {
      setMenu(null);
      return;
    }
    whereAnchorRef.current = anchor;
    setMenu("where");
  }

  function closeWhere() {
    setMenu(null);
    whereAnchorRef.current?.focus({ preventScroll: true });
  }

  const canPost = content.trim().length >= 3 && location.trim().length >= 2;
  const dirty = Boolean(content.trim() || location.trim() || file);
  const remaining = MAX - content.length;
  const meta = ALERT_META[category];
  const ChosenIcon = meta.icon;
  const located = Boolean(location.trim() || coords);

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
      <div>
        <TopRow>
          <Avatar name={profile.full_name || "You"} src={profile.avatar_url} size={40} />
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

        <Collapse open={composing}>
          <PillRow>
            <Pill
              ref={typePillRef}
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

            <Pill
              ref={wherePillRef}
              type="button"
              $active={Boolean(location.trim())}
              aria-haspopup="dialog"
              aria-expanded={menu === "where" && whereAnchorRef.current === wherePillRef.current}
              onClick={() => toggleWhere(wherePillRef.current)}
            >
              <MapPin size={20} aria-hidden />
              <span className="label">{location.trim() || "Add location"}</span>
              <CaretDown size={16} className="caret" aria-hidden />
            </Pill>
          </PillRow>
        </Collapse>
      </div>

      {error && <Notice role="alert">{error}</Notice>}

      {previewUrl && (
        <PreviewWrap>
          <Preview>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" />
            <button type="button" onClick={() => pickFile(null)} aria-label="Remove photo">
              <X size={22} weight="bold" />
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
            ref={whereToolRef}
            type="button"
            $on={located}
            aria-haspopup="dialog"
            aria-expanded={menu === "where" && whereAnchorRef.current === whereToolRef.current}
            onClick={() => toggleWhere(whereToolRef.current)}
            aria-label="Add location"
            title="Add location"
          >
            <MapPin size={24} weight={located ? "fill" : "bold"} />
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

        {open && remaining <= 100 && <Counter $over={remaining < 0}>{remaining}</Counter>}

        <ActionGroup>
          {dirty && (
            <ComposerButton type="button" $variant="ghost" onClick={reset}>
              Clear alert
            </ComposerButton>
          )}

          <ComposerButton
            type="button"
            onClick={submit}
            disabled={!canPost || pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <ButtonOrb job="committing" /> Posting
              </>
            ) : (
              "Post alert"
            )}
          </ComposerButton>
        </ActionGroup>
      </Foot>

      <Popover
        open={menu === "type"}
        onClose={() => setMenu(null)}
        anchorRef={typePillRef}
        label="What kind of alert?"
        align="start"
        role="listbox"
      >
        {ALERT_CATEGORIES.map((key) => {
          const item = ALERT_META[key];
          const Icon = item.icon;
          return (
            <TypeOption
              key={key}
              type="button"
              role="option"
              aria-selected={category === key}
              onClick={() => {
                setCategory(key);
                setMenu(null);
                typePillRef.current?.focus({ preventScroll: true });
              }}
            >
              <Icon size={20} style={{ color: item.color }} aria-hidden />
              {item.label}
              {category === key && <Check size={18} className="tick" aria-hidden />}
            </TypeOption>
          );
        })}
      </Popover>

      <Popover
        open={menu === "where"}
        onClose={() => setMenu(null)}
        anchorRef={whereAnchorRef}
        label="Where is this?"
        align="start"
        role="dialog"
      >
        <WhereBody>
          <Where>
            <MapPin size={20} aria-hidden />
            <input
              ref={whereRef}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  closeWhere();
                }
              }}
              placeholder={locating ? "Finding you..." : "Road, town or landmark"}
              maxLength={120}
              aria-label="Where is this?"
            />
          </Where>
          <Locate type="button" disabled={locating} onClick={() => void locateMe()}>
            {locating ? <ButtonOrb job="fetching" on="surface" /> : <Crosshair size={18} aria-hidden />}
            {locating ? "Locating" : coords ? "Update my location" : "Use my location"}
          </Locate>
        </WhereBody>
      </Popover>
    </Shell>
  );
}
