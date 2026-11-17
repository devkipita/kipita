"use client";

import { useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { DotsThree, Pencil, Trash } from "@/components/icons";
import { deleteAlertAction } from "@/lib/alerts/actions";
import { canEditAlert, editWindowRemaining } from "@/lib/alerts/meta";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { useConfirm } from "@/components/ui/ConfirmPop";

const Trigger = styled.button`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerHigh};
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  &[aria-expanded="true"] {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Item = styled(PopoverItem)`
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const Note = styled.p`
  max-width: 220px;
  margin: 6px 14px 8px;

  @media (max-width: 859px) {
    max-width: none;
  }
  font-size: 13px;
  line-height: 1.4;
  color: ${nocturne.muted2};
`;

function minutesLeft(createdAt: string): number {
  return Math.ceil(editWindowRemaining(createdAt) / 60000);
}

export function AlertOwnerMenu({
  alertId,
  createdAt,
  onEdit,
  onDeleted,
  onError,
}: {
  alertId: string;
  createdAt: string;
  onEdit: () => void;
  onDeleted: () => void;
  onError?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ask, confirmNode } = useConfirm();

  const editable = canEditAlert(createdAt);
  const left = minutesLeft(createdAt);

  async function remove() {
    if (pending) return;
    setOpen(false);
    const ok = await ask(triggerRef.current, {
      title: "Delete this alert?",
      yes: "Delete alert",
      no: "Keep alert",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteAlertAction(alertId);
      if (!result.ok) {
        onError?.(result.error);
        triggerRef.current?.focus();
        return;
      }
      onDeleted();
    });
  }

  return (
    <>
      <Trigger
        ref={triggerRef}
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={pending}
        aria-label={pending ? "Deleting alert" : "Alert options"}
      >
        {pending ? <ButtonOrb job="committing" on="surface" /> : <DotsThree size={22} />}
      </Trigger>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        label="Alert options"
        align="end"
      >
        <Item
          type="button"
          role="menuitem"
          disabled={!editable}
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Pencil size={18} />
          Edit alert
        </Item>
        <Item
          type="button"
          role="menuitem"
          data-tone="danger"
          disabled={!editable}
          onClick={() => void remove()}
        >
          <Trash size={18} />
          Delete alert
        </Item>
        <Note>
          {editable
            ? `You can change this for ${left} more ${left === 1 ? "minute" : "minutes"}.`
            : "The five-minute window for changes has closed."}
        </Note>
      </Popover>
      {confirmNode}
    </>
  );
}
