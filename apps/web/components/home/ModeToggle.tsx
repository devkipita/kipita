"use client";

import { useState, useTransition } from "react";
import styled from "styled-components";
import { CarProfile as CarFront, UserCircle as UserRound } from "@/components/icons";
import { setModeAction } from "@/lib/home/mode-actions";
import type { AppMode } from "@/lib/home/mode";
import { Segmented, SegmentButton } from "./fields";

const Shell = styled.div`
  display: inline-flex;
  max-width: 320px;
  width: 100%;

  ${Segmented} {
    width: 100%;
  }
`;

/**
 * Passenger / driver switch.
 *
 * Mirrors `apps/mobile/src/hooks/useRoleSwitch.ts`: leaving driver mode is
 * free, entering it needs driver KYC on file. The server action is the
 * authority — this only shows the result optimistically and rolls back if the
 * gate rejects.
 */
export function ModeToggle({
  mode,
  driverReady,
  onModeChange,
  onKycRequired,
}: {
  mode: AppMode;
  /** Whether driver KYC is already on file — lets us skip a round trip. */
  driverReady: boolean;
  onModeChange: (next: AppMode) => void;
  onKycRequired: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<AppMode | null>(null);
  const shown = optimistic ?? mode;

  function choose(next: AppMode) {
    if (next === shown || pending) return;

    // We already know the gate will reject — open the form without the wait.
    // The server action still re-checks; this is only about latency.
    if (next === "driver" && !driverReady) {
      onKycRequired();
      return;
    }

    setOptimistic(next);

    startTransition(async () => {
      const result = await setModeAction(next);
      setOptimistic(null);
      if (result.ok) {
        onModeChange(result.mode);
      } else if (result.reason === "kyc_required") {
        onKycRequired();
      }
    });
  }

  return (
    <Shell>
      <Segmented role="tablist" aria-label="Passenger or driver">
        <SegmentButton
          type="button"
          role="tab"
          aria-selected={shown === "passenger"}
          $active={shown === "passenger"}
          onClick={() => choose("passenger")}
          disabled={pending}
        >
          <UserRound size={16} />
          Passenger
        </SegmentButton>
        <SegmentButton
          type="button"
          role="tab"
          aria-selected={shown === "driver"}
          $active={shown === "driver"}
          onClick={() => choose("driver")}
          disabled={pending}
        >
          <CarFront size={16} />
          Driver
        </SegmentButton>
      </Segmented>
    </Shell>
  );
}
