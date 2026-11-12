"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Car, Plus, SealCheck, Trash, Warning } from "@/components/icons";
import { useAppMode } from "@/components/nav/AppShell";
import { CarDialog, carName } from "@/components/driver/CarDialog";
import { deleteCarAction } from "@/lib/driver/cars";
import { nocturne } from "@/lib/nocturne";
import type { GarageCar } from "@/lib/home/vehicle";
import { ControlRow, Panel, SectionTitle } from "./SettingsUI";

const Pill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primary};
      border-color: ${({ theme }) => theme.color.primary};
      color: ${({ theme }) => theme.color.onPrimary};
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const AddRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  margin-top: 10px;
  padding: 0 16px;
  border: 1.5px dashed ${nocturne.green};
  border-radius: 16px;
  background: transparent;
  color: ${nocturne.green};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  @media (hover: hover) {
    &:hover {
      background: ${nocturne.surface2};
    }
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Remove = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.color.onSurfaceVariant};
  cursor: pointer;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceContainerHigh};
      color: ${({ theme }) => theme.color.error};
    }
  }
  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const ErrorLine = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 4px 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.error};
`;

const STATUS = {
  not_submitted: { text: "Not verified yet", action: "Get verified" },
  pending: { text: "In review. We’ll let you know.", action: null },
  approved: { text: "Verified driver", action: null },
  rejected: { text: "We couldn’t verify your details", action: "Send again" },
} as const;

export function DriverSection({ cars: initial }: { cars: GarageCar[] }) {
  const { kycStatus, requireKyc } = useAppMode();
  const router = useRouter();
  const [cars, setCars] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const status = STATUS[kycStatus] ?? STATUS.not_submitted;

  function remove(car: GarageCar) {
    setError("");
    setRemoving(car.id);
    startTransition(async () => {
      const result = await deleteCarAction(car.id);
      setRemoving(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCars((list) => list.filter((c) => c.id !== car.id));
      router.refresh();
    });
  }

  return (
    <>
      <SectionTitle>Driving</SectionTitle>
      <Panel>
        <ControlRow icon={SealCheck} title="Driver verification" description={status.text} tone="green">
          {status.action && (
            <Pill type="button" onClick={() => requireKyc()}>
              {status.action}
            </Pill>
          )}
        </ControlRow>
        {cars.map((car) => (
          <ControlRow key={car.id} icon={Car} title={carName(car) || "Your car"} description={car.plate} tone="mint">
            <Remove
              type="button"
              aria-label={`Remove ${carName(car)} ${car.plate}`}
              disabled={removing === car.id}
              onClick={() => remove(car)}
            >
              <Trash size={18} />
            </Remove>
          </ControlRow>
        ))}
      </Panel>
      <AddRow type="button" onClick={() => setAdding(true)}>
        <Plus size={18} weight="bold" />
        Add a car
      </AddRow>
      {error && (
        <ErrorLine role="alert">
          <Warning size={16} />
          {error}
        </ErrorLine>
      )}
      <CarDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(car) => {
          setCars((list) => [car, ...list.filter((c) => c.id !== car.id)]);
          router.refresh();
        }}
      />
    </>
  );
}
