"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { AnonAvatar } from "./AnonAvatar";
import { Collapse } from "@/components/anim/Collapse";
import { Notice } from "@/components/ui/primitives";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { Chip, IconAction, chipColors, type ChipTone } from "@/components/ui/Chip";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import { requestPreciseLocation } from "@/lib/alerts/location";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { AlertCategory } from "@/lib/alerts/types";
import type { Profile } from "@/lib/auth/types";
import { categoryTone } from "./CategoryBadge";

const MAX = 1000;

const Shell = styled.section`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid ${nocturne.line};
  background: ${nocturne.surface};
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
`;

const Input = styled.textarea`
  width: 100%;
  min-height: 40px;
  padding: 8px 0;
  border: none;
  background: transparent;
  resize: none;
  overflow: hidden;
  font: inherit;
  font-size: 17px;
  line-height: 24px;
  color: ${nocturne.cream};
  caret-color: ${nocturne.accent};

  &::placeholder {
    color: ${nocturne.muted2};
  }
  &:focus-visible {
    outline: none;
  }
`;

const Indent = styled.div`
  margin-left: 52px;

  @media (max-width: 420px) {
    margin-left: 0;
  }
`;

const ChipRow = styled(Indent)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 4px;

  .label {
    min-width: 0;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .caret {
    transition: transform ${dur.state} ${ease.standard};
  }
  [aria-expanded="true"] .caret {
    transform: rotate(180deg);
  }
`;

const Preview = styled(Indent)`
  position: relative;
  aspect-ratio: 16 / 9;
  max-height: 240px;
  overflow: hidden;
  border-radius: 12px;
  background: ${nocturne.surface3};

  img {
    object-fit: cover;
  }
  .remove {
    position: absolute;
    top: 8px;
    right: 8px;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
  }
`;

const Foot = styled(Indent)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  .hint {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: ${nocturne.muted};
  }
`;

const Counter = styled.span<{ $over: boolean }>`
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $over }) => ($over ? nocturne.danger : nocturne.muted2)};
`;

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const Button = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ $primary }) => ($primary ? nocturne.green : nocturne.surface2)};
  color: ${({ $primary }) => ($primary ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    min-height: 44px;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: ${({ $primary }) =>
        $primary
          ? nocturne.greenDeep
          : `color-mix(in oklab, ${nocturne.surface2} 88%, ${nocturne.cream})`};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: ${nocturne.surface3};
    color: ${nocturne.muted2};
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

const TypeOption = styled(PopoverItem)<{ $tone: ChipTone }>`
  .glyph {
    color: ${({ theme, $tone }) => chipColors(theme, $tone, true).bg};
  }
  .tick {
    margin-left: auto;
    color: ${nocturne.accent};
  }
  &[aria-selected="true"] {
    font-weight: 700;
    background: ${nocturne.surface2};
  }
`;

const WhereBody = styled.div`
  display: grid;
  gap: 8px;
  width: min(320px, calc(100vw - 48px));
  padding: 8px;

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
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  > svg {
    flex: none;
    color: ${nocturne.accent};
  }
  input {
    flex: 1 1 140px;
    min-width: 0;
    padding: 4px 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 16px;
    font-weight: 600;
    color: ${nocturne.cream};
  }
  input::placeholder {
    color: ${nocturne.muted2};
    font-weight: 400;
  }
  input:focus-visible {
    outline: none;
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

type MenuKind = "type" | "where" | null;

export type AlertDraft = {
  category: AlertCategory;
  location: string;
  content: string;
  lat: number | null;
  lng: number | null;
  file: File | null;
  preview: string | null;
};

export function AlertComposerInline({
  profile,
  onSubmit,
}: {
  profile: Profile;
  onSubmit: (draft: AlertDraft) => void;
}) {
  const [menu, setMenu] = useState<MenuKind>(null);
  const [category, setCategory] = useState<AlertCategory>("traffic");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const whereRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const placeRef = useRef<HTMLButtonElement>(null);
  const locateTried = useRef(false);

  const composing = content.trim().length > 0 || Boolean(file);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, composing ? 72 : 40)}px`;
  }, [content, composing]);

  useEffect(() => {
    if (!composing || locateTried.current) return;
    locateTried.current = true;
    void locateMe({ silent: true });
  }, [composing]);

  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = previewUrl;
  });

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function reset() {
    setMenu(null);
    setCategory("traffic");
    setLocation("");
    setContent("");
    setCoords(null);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    locateTried.current = false;
  }

  async function locateMe(opts: { silent?: boolean } = {}) {
    setLocating(true);
    setError(null);
    const outcome = await requestPreciseLocation();
    setLocating(false);

    if (!outcome.ok) {
      if (opts.silent) return;
      setError(
        outcome.reason === "denied"
          ? "Location is off. Type the road name."
          : "No location. Type the road name.",
      );
      whereRef.current?.focus();
      return;
    }

    setCoords(outcome.coords);
    const town = findNearestTown(outcome.coords);
    if (town) setLocation((now) => now.trim() || town.name);
  }

  function pickFile(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  function closeWhere() {
    setMenu(null);
    placeRef.current?.focus({ preventScroll: true });
  }

  const hasText = content.trim().length >= 3;
  const hasPlace = location.trim().length >= 2;
  const canPost = hasText && hasPlace && content.length <= MAX;
  const dirty = Boolean(content.trim() || location.trim() || file);
  const remaining = MAX - content.length;
  const meta = ALERT_META[category];
  const ChosenIcon = meta.icon;

  const hint = !composing
    ? null
    : !hasText
      ? "Say what you can see"
      : !hasPlace
        ? "Add a place to post"
        : null;

  function submit() {
    if (!canPost) return;
    onSubmit({
      category,
      location: location.trim(),
      content: content.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      file,
      preview: previewUrl,
    });
    setPreviewUrl(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    reset();
  }
  return (
    <Shell aria-label="Post a road alert">
      <TopRow>
        <AnonAvatar id={profile.id} size={40} />
        <Input
          ref={inputRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          placeholder="What's happening on the road?"
          aria-label="What is happening on the road?"
        />
      </TopRow>

      <Collapse open={composing}>
        <ChipRow>
          <Chip
            ref={typeRef}
            type="button"
            $tone={categoryTone(category)}
            aria-haspopup="listbox"
            aria-expanded={menu === "type"}
            aria-label={`Alert type: ${meta.label}`}
            onClick={() => setMenu(menu === "type" ? null : "type")}
          >
            <ChosenIcon size={16} weight="fill" aria-hidden />
            <span className="label">{meta.label}</span>
            <CaretDown size={16} className="caret" aria-hidden />
          </Chip>

          <Chip
            ref={placeRef}
            type="button"
            $tone={hasPlace ? "primary" : "neutral"}
            aria-haspopup="dialog"
            aria-expanded={menu === "where"}
            aria-label={hasPlace ? `Place: ${location.trim()}` : "Add place"}
            onClick={() => setMenu(menu === "where" ? null : "where")}
          >
            {locating ? <ButtonOrb job="fetching" on="surface" /> : <MapPin size={16} weight={hasPlace ? "fill" : "regular"} aria-hidden />}
            <span className="label">{location.trim() || (locating ? "Finding you" : "Add place")}</span>
            <CaretDown size={16} className="caret" aria-hidden />
          </Chip>
        </ChipRow>
      </Collapse>

      {error && (
        <Indent>
          <Notice role="alert">{error}</Notice>
        </Indent>
      )}

      {previewUrl && (
        <Preview>
          <Image src={previewUrl} alt="Photo to post" fill unoptimized sizes="600px" />
          <IconAction
            className="remove"
            type="button"
            onClick={() => pickFile(null)}
            aria-label="Remove photo"
            title="Remove photo"
          >
            <X size={20} weight="bold" aria-hidden />
          </IconAction>
        </Preview>
      )}

      <Foot>
        <IconAction
          type="button"
          $on={Boolean(file)}
          $tone={nocturne.accent}
          onClick={() => fileRef.current?.click()}
          aria-label={file ? "Change photo" : "Add a photo"}
          title={file ? "Change photo" : "Add a photo"}
        >
          <ImageSquare size={20} weight={file ? "fill" : "regular"} aria-hidden />
        </IconAction>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <span className="hint" aria-live="polite">
          {hint}
        </span>

        {remaining <= 100 && <Counter $over={remaining < 0}>{remaining}</Counter>}

        <Actions>
          {dirty && (
            <Button type="button" onClick={reset}>
              Discard draft
            </Button>
          )}
          <Button
            type="button"
            $primary
            onClick={submit}
            disabled={!canPost}
          >
            Post alert
          </Button>
        </Actions>
      </Foot>

      <Popover
        open={menu === "type"}
        onClose={() => setMenu(null)}
        anchorRef={typeRef}
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
              $tone={categoryTone(key)}
              aria-selected={category === key}
              onClick={() => {
                setCategory(key);
                setMenu(null);
                typeRef.current?.focus({ preventScroll: true });
              }}
            >
              <Icon size={20} weight="fill" className="glyph" aria-hidden />
              {item.label}
              {category === key && <Check size={20} className="tick" aria-hidden />}
            </TypeOption>
          );
        })}
      </Popover>

      <Popover
        open={menu === "where"}
        onClose={() => setMenu(null)}
        anchorRef={placeRef}
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
              placeholder={locating ? "Finding you" : "Road, town or landmark"}
              maxLength={120}
              aria-label="Where is this?"
            />
          </Where>
          <Chip type="button" $tone="primary" disabled={locating} onClick={() => void locateMe()}>
            {locating ? <ButtonOrb job="fetching" on="surface" /> : <Crosshair size={16} aria-hidden />}
            {locating ? "Finding you" : coords ? "Update my location" : "Use my location"}
          </Chip>
        </WhereBody>
      </Popover>
    </Shell>
  );
}
