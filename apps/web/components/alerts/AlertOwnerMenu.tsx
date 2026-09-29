"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { DotsThree, Pencil, Trash } from "@/components/icons";
import { deleteAlertAction } from "@/lib/alerts/actions";
import { canEditAlert, editWindowRemaining } from "@/lib/alerts/meta";

const Wrap = styled.div`
  position: relative;
  flex: none;
`;

const Trigger = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Menu = styled.div`
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 20;
  min-width: 176px;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  box-shadow: ${({ theme }) => theme.shadow.card};
`;

const Item = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  background: transparent;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  color: ${({ theme, $danger }) =>
    $danger ? theme.accent.red.bold.bg : theme.color.onSurface};

  svg {
    flex: none;
  }

  &:hover:not(:disabled) {
    background: ${({ theme, $danger }) =>
      $danger ? theme.accent.red.soft.bg : theme.color.surfaceContainerHigh};
    color: ${({ theme, $danger }) =>
      $danger ? theme.accent.red.soft.on : theme.color.onSurface};
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`;

const Note = styled.p`
  margin: 4px 6px 2px;
  font-size: 0.74rem;
  line-height: 1.35;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const editable = canEditAlert(createdAt);

  function remove() {
    if (pending) return;
    if (!window.confirm("Delete this alert? Drivers relying on it will lose it.")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAlertAction(alertId);
      setOpen(false);
      if (!result.ok) {
        onError?.(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Alert options"
      >
        <DotsThree size={20} />
      </Trigger>

      {open && (
        <Menu role="menu">
          <Item
            type="button"
            role="menuitem"
            disabled={!editable}
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={17} />
            Edit alert
          </Item>
          <Item
            type="button"
            role="menuitem"
            $danger
            disabled={pending || !editable}
            onClick={(e) => {
              e.preventDefault();
              remove();
            }}
          >
            <Trash size={17} />
            {pending ? "Deleting…" : "Delete alert"}
          </Item>
          <Note>
            {editable
              ? `You can change this for ${minutesLeft(createdAt)} more ${
                  minutesLeft(createdAt) === 1 ? "minute" : "minutes"
                }.`
              : "The five-minute window for changes has closed."}
          </Note>
        </Menu>
      )}
    </Wrap>
  );
}
