"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { MapPin } from "@/components/icons";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { updateAlertAction } from "@/lib/alerts/actions";
import { ALERT_CATEGORIES, ALERT_META } from "@/lib/alerts/meta";
import type { Alert, AlertCategory } from "@/lib/alerts/types";
import type { AccentName, AccentStep } from "@/lib/theme";

const MAX = 1000;

const Shell = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceContainer};
`;

const Body = styled.textarea`
  width: 100%;
  min-height: 90px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  padding: 10px 12px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 1px;
  }
`;

const Where = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: ${({ theme }) => theme.radius.xs};
  padding: 0 12px;
  min-height: 42px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.color.onSurface};
  }
  input:focus {
    outline: none;
  }
`;

const Types = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const TypeChip = styled.button<{
  $accent: AccentName;
  $step: AccentStep;
  $active: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;

  background: ${({ theme, $accent, $step, $active }) =>
    $active ? theme.accent[$accent][$step].bg : theme.color.surfaceContainerHigh};
  color: ${({ theme, $accent, $step, $active }) =>
    $active ? theme.accent[$accent][$step].on : theme.color.onSurfaceVariant};
  opacity: ${({ $active }) => ($active ? 1 : 0.85)};

  --icon-knockout: ${({ theme, $accent, $step, $active }) =>
    $active ? theme.accent[$accent][$step].bg : theme.color.surfaceContainerHigh};

  svg {
    flex: none;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .spacer {
    flex: 1;
  }
  .count {
    font-size: 0.78rem;
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
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
        <MapPin size={16} weight="fill" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          aria-label="Where is this?"
        />
      </Where>

      <Types role="group" aria-label="Alert type">
        {ALERT_CATEGORIES.map((key) => {
          const m = ALERT_META[key];
          const Icon = m.icon;
          return (
            <TypeChip
              key={key}
              type="button"
              $accent={m.accent}
              $step={m.step}
              $active={category === key}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              <Icon size={14} weight="fill" />
              {m.label}
            </TypeChip>
          );
        })}
      </Types>

      <Foot>
        {remaining <= 100 && <span className="count">{remaining}</span>}
        <span className="spacer" />
        <ButtonEl type="button" $compact $variant="ghost" onClick={onCancel}>
          Cancel
        </ButtonEl>
        <ButtonEl
          type="button"
          $compact
          onClick={save}
          disabled={!valid || !dirty || pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </ButtonEl>
      </Foot>
    </Shell>
  );
}
