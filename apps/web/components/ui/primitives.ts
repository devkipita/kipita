"use client";

import Link from "next/link";
import styled, { css } from "styled-components";

/**
 * Shared styled primitives — the reusable vocabulary the rest of the web app
 * composes from. Everything here reads from the active theme, so all of it
 * adapts to light/dark automatically. Component-specific styling lives in the
 * component files; only genuinely cross-cutting atoms belong here.
 */

/* ── Layout ───────────────────────────────────────────────────────────── */

export const Container = styled.div`
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
`;

export const Section = styled.section<{ $alt?: boolean }>`
  padding: 96px 0;
  background: ${({ theme, $alt }) => ($alt ? theme.color.surface2 : "transparent")};

  @media (max-width: 860px) {
    padding: 64px 0;
  }
`;

export const Grid = styled.div<{ $cols?: 2 | 3 }>`
  display: grid;
  gap: 24px;
  ${({ $cols }) =>
    $cols &&
    css`
      grid-template-columns: repeat(${$cols}, 1fr);
    `}

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

/* ── Type ─────────────────────────────────────────────────────────────── */

export const Display = styled.h1`
  font-size: clamp(3rem, 7.5vw, 5.4rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  font-weight: 800;
  margin: 0;
`;

export const H2 = styled.h2`
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
  font-weight: 800;
  margin: 0 0 16px;
`;

export const Lead = styled.p`
  font-size: clamp(1.15rem, 2.2vw, 1.5rem);
  color: ${({ theme }) => theme.color.textSoft};
  max-width: 40ch;
`;

export const Eyebrow = styled.span`
  display: inline-block;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.primaryDark};
  background: ${({ theme }) => theme.color.bgAlt};
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
`;

/* ── Cards ────────────────────────────────────────────────────────────── */

export const Card = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 32px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "light";

const buttonBase = css<{ $variant?: ButtonVariant; $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: ${({ $compact }) => ($compact ? "1rem" : "1.05rem")};
  padding: ${({ $compact }) => ($compact ? "8px 15px" : "12px 22px")};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;

  &:active {
    transform: translateY(1px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  svg {
    display: block;
    flex: none;
  }

  ${({ theme, $variant = "primary" }) => {
    switch ($variant) {
      case "ghost":
        return css`
          background: transparent;
          color: ${theme.color.onSurfaceVariant};
          border-color: ${theme.color.outlineVariant};
          &:hover {
            background: ${theme.color.surfaceContainerHigh};
            color: ${theme.color.onSurface};
          }
        `;
      case "light":
        return css`
          background: ${theme.color.secondaryContainer};
          color: ${theme.color.onSecondaryContainer};
          &:hover {
            background: ${theme.color.surfaceContainerHigh};
          }
        `;
      default:
        return css`
          background: ${theme.color.primary};
          color: ${theme.color.onPrimary};
          &:hover {
            background: ${theme.color.primaryDark};
          }
        `;
    }
  }}
`;

/** Anchor button — use `as={Link}` for internal routes (forwards href). */
export const ButtonLink = styled(Link)<{
  $variant?: ButtonVariant;
  $compact?: boolean;
}>`
  ${buttonBase}
`;

export const ButtonAnchor = styled.a<{
  $variant?: ButtonVariant;
  $compact?: boolean;
}>`
  ${buttonBase}
`;

/** Native <button>, for forms/actions. */
export const ButtonEl = styled.button<{
  $variant?: ButtonVariant;
  $compact?: boolean;
}>`
  ${buttonBase}

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

/* ── Forms ────────────────────────────────────────────────────────────── */

export const Field = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 18px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textSoft};
  }
`;

export const Input = styled.input`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  font-size: 1rem;
  font-family: inherit;
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surface};

  &:focus {
    border-color: ${({ theme }) => theme.color.primary};
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

export const Notice = styled.div<{ $variant?: "error" }>`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-weight: 600;
  background: ${({ theme }) => theme.color.dangerBg};
  color: ${({ theme }) => theme.color.dangerText};
`;

export const Badge = styled.span`
  background: ${({ theme }) => theme.color.bgAlt};
  color: ${({ theme }) => theme.color.primaryDark};
  font-weight: 700;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
`;

export const Empty = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.color.muted};
  padding: 80px 0;
`;

/** Compact action button (admin tables). */
export const SmallButton = styled.button<{ $variant?: "approve" | "reject" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 0.95rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 700;
  border: none;
  cursor: pointer;

  ${({ theme, $variant }) =>
    $variant === "reject"
      ? css`
          background: ${theme.color.dangerBg};
          color: ${theme.color.dangerText};
        `
      : css`
          background: ${theme.color.primary};
          color: ${theme.color.onPrimary};
        `}

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
