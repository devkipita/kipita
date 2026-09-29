"use client";

import { useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { ImageSquare as ImagePlus, CircleNotch as Loader2, MapPin, Megaphone, X } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { createAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import { removeAlertImage, uploadAlertImage } from "@/lib/alerts/upload";
import type { AlertCategory } from "@/lib/alerts/types";
import {
  Chip,
  ChipRow,
  FieldBlock,
  FieldHead,
  TextArea,
  TextInput,
} from "@/components/home/fields";

const Warn = styled.p`
  margin: 0;
  font-size: 0.81rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.muted};
`;

const Preview = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface2};

  img {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: cover;
  }
  button {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    cursor: pointer;
  }
`;

const PickImage = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  height: 38px;
  padding: 0 15px;
  border: 1.5px dashed ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.color.textSoft};
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

/**
 * Post a road alert — the web port of `AlertPostSheet.tsx`, with the photo bug
 * fixed: the image is uploaded to the `alert-media` bucket (migration 019) and
 * the public URL is stored, rather than a device-local path.
 *
 * There is no edit or delete anywhere in this feature because `announcements`
 * has no UPDATE or DELETE policy — a posted alert is permanent, so the button
 * stays disabled until there is something worth posting.
 */
export function AlertComposer({
  open,
  viewerId,
  onClose,
  onPosted,
}: {
  open: boolean;
  viewerId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [category, setCategory] = useState<AlertCategory>("traffic");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  const canPost = content.trim().length >= 3 && location.trim().length >= 2;

  function reset() {
    setCategory("traffic");
    setLocation("");
    setContent("");
    setPreview(null);
    setFile(null);
    setError("");
  }

  function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!/^image\/(jpeg|png|webp)$/.test(picked.type)) {
      setError("Use a JPG, PNG or WebP image.");
      return;
    }
    setError("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
  }

  function submit() {
    if (!canPost) return;
    setError("");

    startTransition(async () => {
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (file) {
        const upload = await uploadAlertImage(createClient(), file, viewerId);
        if (!upload.ok) {
          setError(upload.error);
          return;
        }
        imageUrl = upload.url;
        imagePath = upload.path;
      }

      const result = await createAlertAction({
        category,
        location: location.trim(),
        content: content.trim(),
        image_url: imageUrl,
      });

      if (!result.ok) {
        // Don't leave the uploaded object behind if the row never landed.
        if (imagePath) await removeAlertImage(createClient(), imagePath);
        setError(result.error);
        return;
      }

      reset();
      onPosted();
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!pending}
      initialFocusRef={locationRef}
      title="Post a road alert"
      description="Tell drivers and passengers what's happening out there."
      footer={
        <DrawerFooter>
          <ButtonEl
            type="button"
            $variant="ghost"
            $compact
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </ButtonEl>
          <ButtonEl
            type="button"
            $compact
            style={{ flex: 1 }}
            onClick={submit}
            disabled={!canPost || pending}
          >
            {pending ? (
              <>
                <Loader2 size={18} /> Posting…
              </>
            ) : (
              <>
                <Megaphone size={18} /> Post alert
              </>
            )}
          </ButtonEl>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <span className="k">What kind of alert?</span>
          </FieldHead>
          <ChipRow>
            {ALERT_CATEGORIES.map((key) => {
              const meta = ALERT_META[key];
              const Icon = meta.icon;
              return (
                <Chip
                  key={key}
                  type="button"
                  $active={category === key}
                  onClick={() => setCategory(key)}
                >
                  <Icon size={14} />
                  {meta.label}
                </Chip>
              );
            })}
          </ChipRow>
        </FieldBlock>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="alert-location">
              <MapPin size={14} /> Where is this?
            </label>
          </FieldHead>
          <TextInput
            id="alert-location"
            ref={locationRef}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mombasa Road, near Cabanas"
            autoComplete="off"
          />
        </FieldBlock>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="alert-content">What&apos;s happening?</label>
            <span className="k">{content.trim().length}/1000</span>
          </FieldHead>
          <TextArea
            id="alert-content"
            value={content}
            maxLength={1000}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Heavy traffic building up after the roundabout…"
          />
        </FieldBlock>

        {preview ? (
          <Preview>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected" />
            <button type="button" onClick={clearImage} aria-label="Remove photo">
              <X size={15} />
            </button>
          </Preview>
        ) : (
          <PickImage
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
          >
            <ImagePlus size={16} /> Add a photo
          </PickImage>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={pickImage}
        />

        <Warn>
          Alerts can&apos;t be edited or deleted once posted, so give it a quick
          read first.
        </Warn>
      </DrawerBody>
    </Drawer>
  );
}
