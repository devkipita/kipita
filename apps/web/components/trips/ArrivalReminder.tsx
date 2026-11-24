"use client";

import styled from "styled-components";
import { Briefcase, DeviceMobile, Package } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { RollingNumber } from "@/components/ui/Counter";
import { dur, ease, nocturne } from "@/lib/nocturne";
import { LuggageArt } from "./StageArt";
import { RateRide } from "./RateRide";

export type ArrivalStage = "arriving" | "arrived";

const Art = styled.div`
  display: grid;
  place-items: center;
  padding: 8px 0;
`;

const Lead = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: ${nocturne.cream};
  font-variant-numeric: tabular-nums;
`;

const Checks = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 8px 16px;
    border-radius: 16px;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    font-size: 16px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
  }
  svg {
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Got = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.secondaryContainer};
  color: ${({ theme }) => theme.color.onSecondaryContainer};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
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

export function ArrivalReminder({
  stage,
  open,
  onClose,
  destination,
  driverFirst,
  minutes,
  bookingId,
  driverName,
  driverAvatar,
  rating,
}: {
  stage: ArrivalStage;
  open: boolean;
  onClose: () => void;
  destination: string;
  driverFirst: string;
  minutes: number | null;
  bookingId: string;
  driverName: string;
  driverAvatar: string | null;
  rating: number | null | undefined;
}) {
  const arriving = stage === "arriving";
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={arriving ? `Almost at ${destination}` : `You're in ${destination}`}
      footer={
        <DrawerFooter>
          <Got type="button" onClick={onClose}>
            {arriving ? "I have my things" : "Close reminder"}
          </Got>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        <Art>
          <LuggageArt />
        </Art>
        <Lead>
          {arriving ? (
            minutes != null ? (
              <>
                About <RollingNumber value={minutes} /> min to go. Gather your things before {driverFirst} stops.
              </>
            ) : (
              <>Gather your things before {driverFirst} stops.</>
            )
          ) : (
            <>Check the seat and the boot before {driverFirst} drives off.</>
          )}
        </Lead>
        <Checks aria-label="Take with you">
          <li>
            <Briefcase size={20} aria-hidden />
            Bags from the boot
          </li>
          <li>
            <Package size={20} aria-hidden />
            Parcels and shopping
          </li>
          <li>
            <DeviceMobile size={20} aria-hidden />
            Phone, wallet and keys
          </li>
        </Checks>
        {!arriving && (
          <RateRide bookingId={bookingId} name={driverName} avatarUrl={driverAvatar} isDriver={false} initial={rating} />
        )}
      </DrawerBody>
    </Drawer>
  );
}
