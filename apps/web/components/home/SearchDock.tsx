"use client";

import styled from "styled-components";
import {
  CalendarBlank as CalendarDays,
  Circle,
  MagnifyingGlass,
  MapPin,
  NavigationArrow as Navigation,
  X,
} from "@/components/icons";
import { HOME_COPY } from "@/lib/home/copy";
import type { PlaceField } from "./PlaceModal";

export type OriginStatus = "idle" | "detecting" | "ready" | "failed";

/** Material "near_me", rotated 45deg so the arrow points right. */
function SendArrow({ size = 22 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size}
      width={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      style={{ transform: "rotate(45deg)", flex: "none" }}
    >
      <path d="M409.33-409.33 139-515.67q-11-4.33-16-13.16-5-8.84-5-18.5 0-9.67 5.17-17.84 5.16-8.16 16.16-12.5l632-236.66q10-4.34 19.34-1.67 9.33 2.67 16 9.33 6.66 6.67 9.33 16 2.67 9.34-1.67 19.34l-236.66 632q-4.34 11-12.5 16.16Q557-118 547.33-118q-9.66 0-18.5-5-8.83-5-13.16-16L409.33-409.33Zm134.67 164L726-726 246-544l214.67 83.33L544-245.33Zm-83.33-215.34Z" />
    </svg>
  );
}

const Dock = styled.div`
  position: relative;
  z-index: 5;
  margin-top: clamp(12px, 3vw, 26px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  padding: 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 1020px) {
    display: none;
  }
`;

const Compact = styled.div`
  display: none;

  @media (max-width: 1020px) {
    position: relative;
    z-index: 5;
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 7px 7px 8px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    box-shadow: ${({ theme }) => theme.shadow.card};
  }
`;

const CompactField = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 8px 12px 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.textSoft};
  }
  b {
    min-width: 0;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  b[data-empty="true"] {
    color: ${({ theme }) => theme.color.textSoft};
    font-weight: 600;
  }
  &:active {
    background: ${({ theme }) => theme.color.surface2};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: -2px;
  }
`;

const CompactLater = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 15px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.tone.jungle.bg};
  color: ${({ theme }) => theme.tone.jungle.on};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Divider = styled.span`
  width: 1px;
  height: 30px;
  background: ${({ theme }) => theme.color.line};

  @media (max-width: 1020px) {
    display: none;
  }
`;

const Field = styled.button<{ $hideOnPhone?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: -3px;
  }

  .text {
    min-width: 0;
  }
  small {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${({ theme }) => theme.type.micro};
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.textSoft};
  }
  b {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  b[data-empty="true"] {
    color: ${({ theme }) => theme.color.textSoft};
    font-weight: 600;
  }

  @media (max-width: 480px) {
    display: ${({ $hideOnPhone }) => ($hideOnPhone ? "none" : "flex")};
  }
`;

const Dot = styled(Circle)`
  flex: none;
  color: ${({ theme }) => theme.color.primary};
  fill: ${({ theme }) => theme.color.primary};
`;

const Pin = styled(MapPin)`
  flex: none;
  color: ${({ theme }) => theme.color.dangerText};
`;

const When = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.tone.jungle.bg};
  color: ${({ theme }) => theme.tone.jungle.on};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconButton = styled.button<{ $solid?: boolean }>`
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font: inherit;
  cursor: pointer;
  background: ${({ theme, $solid }) =>
    $solid ? theme.color.primary : theme.color.surface2};
  color: ${({ theme, $solid }) =>
    $solid ? theme.color.onPrimary : theme.color.textSoft};
  transition:
    transform 0.15s ease,
    background 0.15s ease;

  @media (hover: hover) {
    &:hover {
      transform: scale(1.06);
    }
  }
  &:active {
    transform: scale(0.94);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function SearchDock({
  from,
  to,
  scheduleLabel,
  originStatus,
  canClear,
  onOpenField,
  onOpenWhen,
  onSearch,
  onClear,
}: {
  from: string;
  to: string;
  scheduleLabel: string | null;
  originStatus: OriginStatus;
  canClear: boolean;
  onOpenField: (field: PlaceField) => void;
  onOpenWhen: () => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  const fromText =
    from ||
    (originStatus === "detecting"
      ? HOME_COPY.fromDetecting
      : HOME_COPY.fromIdle);

  return (
    <>
      <Compact>
        <CompactField
          type="button"
          onClick={() => onOpenField("to")}
          aria-label={HOME_COPY.placeTitleTo}
        >
          <MagnifyingGlass size={19} weight="bold" />
          <b data-empty={to ? "false" : "true"}>
            {to || HOME_COPY.toPlaceholder}
          </b>
        </CompactField>

        <CompactLater
          type="button"
          onClick={onOpenWhen}
          aria-label={scheduleLabel ?? HOME_COPY.whenLater}
        >
          <CalendarDays size={15} />
          {scheduleLabel ?? HOME_COPY.whenLater}
        </CompactLater>

        {canClear && (
          <IconButton type="button" onClick={onClear} aria-label="Clear search">
            <X size={18} />
          </IconButton>
        )}
        <IconButton
          type="button"
          $solid
          onClick={onSearch}
          aria-label="Search rides"
        >
          <SendArrow size={22} />
        </IconButton>
      </Compact>

      <Dock>
        <Field type="button" onClick={() => onOpenField("from")} $hideOnPhone>
          <Dot size={11} />
          <span className="text">
            <small>
              {HOME_COPY.fromLabel}
              {originStatus === "ready" && from && (
                <Navigation size={9} aria-label={HOME_COPY.fromHint} />
              )}
            </small>
            <b data-empty={from ? "false" : "true"}>{fromText}</b>
          </span>
        </Field>

        <Divider aria-hidden="true" />

        <Field type="button" onClick={() => onOpenField("to")}>
          <Pin size={15} />
          <span className="text">
            <small>{HOME_COPY.toLabel}</small>
            <b data-empty={to ? "false" : "true"}>
              {to || HOME_COPY.toPlaceholder}
            </b>
          </span>
        </Field>

        <Actions>
          <When type="button" onClick={onOpenWhen}>
            <CalendarDays size={15} />
            {scheduleLabel ?? HOME_COPY.whenLater}
          </When>

          {canClear && (
            <IconButton
              type="button"
              onClick={onClear}
              aria-label="Clear search"
            >
              <X size={18} />
            </IconButton>
          )}
          <IconButton
            type="button"
            $solid
            onClick={onSearch}
            aria-label="Search rides"
          >
            <SendArrow size={22} />
          </IconButton>
        </Actions>
      </Dock>
    </>
  );
}
