"use client";

import styled from "styled-components";
import { CarProfile as CarFront, UserCircle as UserRound } from "@/components/icons";
import { RAIL_COMPACT_MAX } from "@/lib/nav/rail";
import type { AppMode } from "@/lib/home/mode";

const Group = styled.div<{ $collapsed: boolean }>`
  display: ${({ $collapsed }) => ($collapsed ? "none" : "flex")};
  gap: 4px;
  padding: 4px;
  margin-inline: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface2};

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    display: none;
  }
`;

const Option = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.textSoft};

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Compact = styled.button<{ $collapsed: boolean }>`
  display: none;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-inline: auto;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
  cursor: pointer;

  ${({ $collapsed }) => $collapsed && `display: grid;`}

  @media (min-width: 900px) and (max-width: ${RAIL_COMPACT_MAX}px) {
    display: grid;
  }
`;

export function RailModeSwitch({
  mode,
  collapsed,
  driverReady,
  onModeChange,
  onKycRequired,
}: {
  mode: AppMode;
  collapsed: boolean;
  driverReady: boolean;
  onModeChange: (next: AppMode) => void;
  onKycRequired: () => void;
}) {
  function choose(next: AppMode) {
    if (next === mode) return;
    if (next === "driver" && !driverReady) {
      onKycRequired();
      return;
    }
    onModeChange(next);
  }

  const label = mode === "driver" ? "Driver mode" : "Passenger mode";

  return (
    <>
      <Group role="radiogroup" aria-label="Passenger or driver" $collapsed={collapsed}>
        <Option
          type="button"
          role="radio"
          aria-checked={mode === "passenger"}
          $active={mode === "passenger"}
          onClick={() => choose("passenger")}
        >
          <UserRound size={15} />
          Passenger
        </Option>
        <Option
          type="button"
          role="radio"
          aria-checked={mode === "driver"}
          $active={mode === "driver"}
          onClick={() => choose("driver")}
        >
          <CarFront size={15} />
          Driver
        </Option>
      </Group>

      <Compact
        type="button"
        $collapsed={collapsed}
        aria-label={`${label}. Switch mode.`}
        title={label}
        onClick={() => choose(mode === "driver" ? "passenger" : "driver")}
      >
        {mode === "driver" ? (
          <CarFront size={19} />
        ) : (
          <UserRound size={19} />
        )}
      </Compact>
    </>
  );
}
