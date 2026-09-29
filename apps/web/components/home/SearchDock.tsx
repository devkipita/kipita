"use client";

import styled from "styled-components";
import { CalendarBlank as CalendarDays, Circle, MagnifyingGlass, MapPin, NavigationArrow as Navigation } from "@/components/icons";
import { HOME_COPY } from "@/lib/home/copy";
import type { PlaceField } from "./PlaceModal";

export type OriginStatus = "idle" | "detecting" | "ready" | "failed";

const Dock = styled.div`
  position: relative;
  z-index: 5;
  margin-top: -34px;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 4px;
  padding: 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.line};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 860px) {
    display: none;
  }
`;

const Compact = styled.div`
  display: none;

  @media (max-width: 860px) {
    position: relative;
    z-index: 5;
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 7px 7px 8px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.surface};
    border: 1px solid ${({ theme }) => theme.color.line};
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

  @media (max-width: 860px) {
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

export function SearchDock({
  from,
  to,
  scheduleLabel,
  originStatus,
  onOpenField,
  onOpenWhen,
}: {
  from: string;
  to: string;
  scheduleLabel: string | null;
  originStatus: OriginStatus;
  onOpenField: (field: PlaceField) => void;
  onOpenWhen: () => void;
}) {
  const fromText =
    from ||
    (originStatus === "detecting" ? HOME_COPY.fromDetecting : HOME_COPY.fromIdle);

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

        <When type="button" onClick={onOpenWhen}>
          <CalendarDays size={15} />
          {scheduleLabel ?? HOME_COPY.whenNow}
        </When>
      </Dock>
    </>
  );
}
