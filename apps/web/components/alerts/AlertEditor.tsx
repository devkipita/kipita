"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { CheckSmall as Check, MapPin } from "@/components/icons";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Chip } from "@/components/ui/Chip";
import { updateAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META, CATEGORY_ROLE } from "@/lib/alerts/meta";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { Alert, AlertCategory } from "@/lib/alerts/types";

const MAX = 1000;

const Shell = styled.div`
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: ${nocturne.surface2};
`;

const field = `
  border: 1px solid ${nocturne.outline};
  border-radius: 8px;
  background: ${nocturne.surface};
`;

const Body = styled.textarea`
  ${field}
  width: 100%;
  min-height: 96px;
  padding: 8px 12px;
  color: ${nocturne.cream};
  caret-color: ${nocturne.accent};
  font: inherit;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  &:focus-visible {
    outline: none;
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Where = styled.label`
  ${field}
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  color: ${nocturne.accent};
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};

  svg {
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 16px;
    color: ${nocturne.cream};
  }
  input:focus {
    outline: none;
  }
  &:focus-within {
    border-color: ${nocturne.accent};
    box-shadow: 0 0 0 3px ${nocturne.ring};
  }
`;

const Types = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  .spacer {
    flex: 1;
  }
  .count {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.muted2};
  }
  .why {
    font-size: 13px;
    color: ${nocturne.muted};
  }
`;

export function AlertEditor({
  alert,
  onCancel,
  onSaved,
}: {
  alert: Alert;
  onCancel: () => void;
  onSaved: (next: Alert) => void;
}) {
  const [category, setCategory] = useState<AlertCategory>(alert.category);
  const [location, setLocation] = useState(alert.location);
  const [content, setContent] = useState(alert.content);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const dirty =
    category !== alert.category ||
    location.trim() !== alert.location ||
    content.trim() !== alert.content;
  const valid = content.trim().length >= 3 && location.trim().length >= 2;
  const remaining = MAX - content.length;
  const why = !valid
    ? location.trim().length < 2
      ? "Add where this is to save"
      : "Write at least 3 characters to save"
    : !dirty
      ? "Nothing changed yet"
      : "";

  function save() {
    if (!valid || !dirty || pending) return;
    setError("");

    startTransition(async () => {
      const result = await updateAlertAction(alert.id, {
        category,
        location: location.trim(),
        content: content.trim(),
        image_url: alert.image_url,
        lat: alert.lat,
        lng: alert.lng,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved({
        ...alert,
        category,
        location: location.trim(),
        content: content.trim(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  return (
    <Shell>
      {error && <Notice $variant="error">{error}</Notice>}

      <Body
        ref={bodyRef}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX))}
        aria-label="Alert text"
      />

      <Where>
        <MapPin size={20} weight="fill" aria-hidden />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          placeholder="Road, town or landmark"
          aria-label="Where is this?"
        />
      </Where>

      <Types role="group" aria-label="Alert type">
        {ALERT_CATEGORIES.map((key) => {
          const m = ALERT_META[key];
          const Icon = m.icon;
          const on = category === key;
          return (
            <Chip
              key={key}
              type="button"
              $tone={CATEGORY_ROLE[key]}
              $selected={on}
              aria-pressed={on}
              onClick={() => setCategory(key)}
            >
              {on ? <Check size={16} aria-hidden /> : <Icon size={16} weight="fill" aria-hidden />}
              {m.label}
            </Chip>
          );
        })}
      </Types>

      <Foot>
        {remaining <= 100 && <span className="count">{remaining}</span>}
        {why && <span className="why">{why}</span>}
        <span className="spacer" />
        <ButtonEl type="button" $compact $variant="ghost" onClick={onCancel}>
          Discard changes
        </ButtonEl>
        <ButtonEl
          type="button"
          $compact
          onClick={save}
          disabled={!valid || !dirty || pending}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <ButtonOrb job="committing" /> Saving changes
            </>
          ) : (
            "Save changes"
          )}
        </ButtonEl>
      </Foot>
    </Shell>
  );
}
