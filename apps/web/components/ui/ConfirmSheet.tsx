"use client";

import { useRef, type ReactNode } from "react";
import styled, { css } from "styled-components";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { dur, ease, nocturne } from "@/lib/nocturne";

const Body = styled(DrawerBody)`
  align-items: center;
  gap: 12px;
  text-align: center;

  .art {
    display: grid;
    place-items: center;
    width: 100%;
    max-width: 220px;
  }
  .lead {
    margin: 0;
    max-width: 34ch;
    font-size: 15px;
    line-height: 22px;
    color: ${nocturne.muted};
  }
`;

const Quote = styled.blockquote`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  width: 100%;
  margin: 4px 0 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${nocturne.cream};
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  overflow-wrap: anywhere;
`;

const Foot = styled(DrawerFooter)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: transparent;
`;

const pill = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const KeepButton = styled.button`
  ${pill}
  background: ${({ theme }) => theme.color.surfaceContainerHighest};
  color: ${nocturne.cream};
`;

const GoButton = styled.button<{ $danger: boolean }>`
  ${pill}
  background: ${({ theme, $danger }) => ($danger ? theme.color.errorContainer : nocturne.green)};
  color: ${({ theme, $danger }) => ($danger ? theme.color.onErrorContainer : nocturne.onGreen)};
`;

export function ConfirmSheet({
  open,
  title,
  lead,
  art,
  quote,
  yes,
  no,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  lead: string;
  art?: ReactNode;
  quote?: ReactNode;
  yes: string;
  no: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      side
      initialFocusRef={keepRef}
      footer={
        <Foot>
          <KeepButton ref={keepRef} type="button" onClick={onClose}>
            {no}
          </KeepButton>
          <GoButton type="button" $danger={danger} onClick={onConfirm}>
            {yes}
          </GoButton>
        </Foot>
      }
    >
      <Body>
        {art ? <div className="art">{art}</div> : null}
        <p className="lead">{lead}</p>
        {quote ? <Quote>{quote}</Quote> : null}
      </Body>
    </Drawer>
  );
}
