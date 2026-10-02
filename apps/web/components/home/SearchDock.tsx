"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  CalendarBlank as CalendarDays,
  CaretDown,
  Circle,
  MagnifyingGlass,
  MapPin,
  Minus,
  NavigationArrow as Navigation,
  Plus,
  Users,
  X,
} from "@/components/icons";
import { HOME_COPY } from "@/lib/home/copy";
import type { AppMode } from "@/lib/home/mode";
import type { PlaceField } from "./PlaceModal";

export type OriginStatus = "idle" | "detecting" | "ready" | "failed";

const MAX_SEATS = 8;

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
  border: 1.5px solid ${({ theme }) => theme.color.outline};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.color.primary};
    box-shadow:
      ${({ theme }) => theme.shadow.soft},
      0 0 0 1px ${({ theme }) => theme.color.primary};
  }

  @media (max-width: 1100px) {
    display: none;
  }
`;

const Compact = styled.div`
  display: none;

  @media (max-width: 1100px) {
    position: relative;
    z-index: 5;
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 7px 7px 8px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    border: 1.5px solid ${({ theme }) => theme.color.outline};
    box-shadow: ${({ theme }) => theme.shadow.card};
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;

    &:hover {
      border-color: ${({ theme }) => theme.color.onSurfaceVariant};
    }
    &:focus-within {
      border-color: ${({ theme }) => theme.color.primary};
      box-shadow:
        ${({ theme }) => theme.shadow.card},
        0 0 0 1px ${({ theme }) => theme.color.primary};
    }
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

  @media (max-width: 1100px) {
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

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconButton = styled.button`
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
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.textSoft};
  transition: transform 0.15s ease;

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

const SearchButton = styled.button`
  flex: none;
  height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease;

  @media (hover: hover) {
    &:hover {
      transform: translateY(-1px);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Panel = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface2};
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.textSoft};
  }
  .text {
    min-width: 0;
  }
  small {
    display: block;
    font-size: ${({ theme }) => theme.type.micro};
    font-weight: 500;
    color: ${({ theme }) => theme.color.textSoft};
  }
  b {
    display: block;
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (hover: hover) {
    &:hover {
      box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.outlineVariant};
    }
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const SeatsWrap = styled.div`
  position: relative;
`;

const SeatsMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.lg};
  min-width: 250px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.elevated};
  box-shadow: ${({ theme }) => theme.elevation[3]};

  .label b {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 700;
  }
  .label small {
    font-size: ${({ theme }) => theme.type.micro};
    color: ${({ theme }) => theme.color.textSoft};
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .stepper output {
    min-width: 20px;
    text-align: center;
    font-weight: 700;
  }
`;

function seatsLabel(seats: number): string {
  return `${seats} ${seats === 1 ? "passenger" : "passengers"}`;
}

export function SearchDock({
  from,
  to,
  scheduleLabel,
  originStatus,
  canClear,
  seats,
  showSeats,
  mode,
  onOpenField,
  onOpenWhen,
  onSearch,
  onClear,
  onSeatsChange,
}: {
  from: string;
  to: string;
  scheduleLabel: string | null;
  originStatus: OriginStatus;
  canClear: boolean;
  seats: number;
  showSeats: boolean;
  mode: AppMode;
  onOpenField: (field: PlaceField) => void;
  onOpenWhen: () => void;
  onSearch: () => void;
  onClear: () => void;
  onSeatsChange: (seats: number) => void;
}) {
  const [seatsOpen, setSeatsOpen] = useState(false);
  const seatsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seatsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!seatsRef.current?.contains(e.target as Node)) setSeatsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeatsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [seatsOpen]);

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
            {to || HOME_COPY.searchPlaceholder[mode]}
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
          <Panel type="button" onClick={onOpenWhen}>
            <CalendarDays size={20} />
            <span className="text">
              <small>Select dates</small>
              <b>{scheduleLabel ?? HOME_COPY.whenLater}</b>
            </span>
          </Panel>

          {showSeats && (
            <SeatsWrap ref={seatsRef}>
              <Panel
                type="button"
                aria-haspopup="dialog"
                aria-expanded={seatsOpen}
                onClick={() => setSeatsOpen((v) => !v)}
              >
                <Users size={20} />
                <span className="text">
                  <small>Passengers</small>
                  <b>{seatsLabel(seats)}</b>
                </span>
                <CaretDown size={16} />
              </Panel>

              {seatsOpen && (
                <SeatsMenu role="dialog" aria-label="Passengers">
                  <span className="label">
                    <b>Passengers</b>
                    <small>Seats you need</small>
                  </span>
                  <span className="stepper">
                    <IconButton
                      type="button"
                      aria-label="Fewer passengers"
                      disabled={seats <= 1}
                      onClick={() => onSeatsChange(seats - 1)}
                    >
                      <Minus size={16} />
                    </IconButton>
                    <output aria-live="polite">{seats}</output>
                    <IconButton
                      type="button"
                      aria-label="More passengers"
                      disabled={seats >= MAX_SEATS}
                      onClick={() => onSeatsChange(seats + 1)}
                    >
                      <Plus size={16} />
                    </IconButton>
                  </span>
                </SeatsMenu>
              )}
            </SeatsWrap>
          )}

          {canClear && (
            <IconButton
              type="button"
              onClick={onClear}
              aria-label="Clear search"
            >
              <X size={18} />
            </IconButton>
          )}
          <SearchButton type="button" onClick={onSearch}>
            Search
          </SearchButton>
        </Actions>
      </Dock>
    </>
  );
}
