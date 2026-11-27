"use client";

import { useRef, useState } from "react";
import styled from "styled-components";
import { DotsThree, Pencil, Trash } from "@/components/icons";
import { deleteAlertAction } from "@/lib/alerts/actions";
import { canEditAlert, editWindowRemaining } from "@/lib/alerts/meta";
import { nocturne } from "@/lib/nocturne";
import { IconAction } from "@/components/ui/Chip";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { useConfirm } from "@/components/ui/ConfirmPop";

const Trigger = styled(IconAction)`
  &[aria-expanded="true"] {
    background-color: color-mix(in oklab, ${nocturne.cream} 8%, transparent);
    color: ${nocturne.cream};
  }
  &:disabled {
    cursor: default;
  }
`;

const Item = styled(PopoverItem)`
  &:disabled {
    color: ${nocturne.muted2};
    cursor: default;
  }
`;

const Note = styled.p`
  max-width: 224px;
  margin: 8px 16px;
  font-size: 13px;
  line-height: 1.4;
  color: ${nocturne.muted};

  @media (max-width: 859px) {
    max-width: none;
  }
`;

function minutesLeft(createdAt: string): number {
  return Math.ceil(editWindowRemaining(createdAt) / 60000);
}

export function AlertOwnerMenu({
  alertId,
  createdAt,
  onEdit,
  onDeleted,
  onDeleteFailed,
}: {
  alertId: string;
  createdAt: string;
  onEdit: () => void;
  onDeleted: () => void;
  onDeleteFailed?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ask, confirmNode } = useConfirm();

  const editable = canEditAlert(createdAt);
  const left = minutesLeft(createdAt);

  async function remove() {
    setOpen(false);
    const ok = await ask(triggerRef.current, {
      title: "Delete this alert?",
      yes: "Delete alert",
      no: "Keep alert",
      danger: true,
    });
    if (!ok) return;
    onDeleted();
    const result = await deleteAlertAction(alertId);
    if (!result.ok) onDeleteFailed?.(result.error);
  }

  return (
    <>
      <Trigger
        ref={triggerRef}
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
        <DotsThree size={20} aria-hidden />
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
          <Pencil size={20} />
          Edit alert
        </Item>
        <Item
          type="button"
          role="menuitem"
          data-tone="danger"
          disabled={!editable}
          onClick={() => void remove()}
        >
          <Trash size={20} />
          Delete alert
        </Item>
        <Note>
          {editable
            ? `You can change this for ${left} more ${left === 1 ? "minute" : "minutes"}.`
            : "Can no longer be changed."}
        </Note>
      </Popover>
      {confirmNode}
    </>
  );
}
