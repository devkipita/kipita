"use client";

import { Moon, Sun } from "@/components/icons";
import styled from "styled-components";
import { useThemeMode } from "@/components/providers/ThemeRuntimeProvider";

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primary};
  }
  &:active {
    transform: scale(0.94);
  }
`;

/** Compact icon button that flips light ⇄ dark. */
export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  return (
    <Btn type="button" onClick={toggle} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>
      {mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </Btn>
  );
}
