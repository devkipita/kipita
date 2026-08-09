"use client";

import styled from "styled-components";

const Track = styled.button<{ $on: boolean }>`
  position: relative;
  width: 48px;
  height: 28px;
  flex: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  background: ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.line)};
  transition: background 0.22s ease;

  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(${({ $on }) => ($on ? "20px" : "0")});
  }
`;

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      $on={checked}
      onClick={() => onChange(!checked)}
    />
  );
}
