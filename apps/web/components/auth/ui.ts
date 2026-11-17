"use client";

import Link from "next/link";
import styled, { css, keyframes } from "styled-components";
import { dur, ease, nocturne } from "@/lib/nocturne";

export const Heading = styled.h1`
  font-size: clamp(1.9rem, 4vw, 2.5rem);
  line-height: 1.04;
  letter-spacing: -0.03em;
  font-weight: 800;
  margin: 0 0 10px;
  color: ${({ theme }) => theme.color.text};
`;

export const Sub = styled.p`
  margin: 0 0 28px;
  font-size: 1.02rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSoft};
  max-width: 42ch;
`;

export const Form = styled.form`
  display: grid;
  gap: 18px;
`;

export const Label = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSoft};
  margin-bottom: 8px;
`;

export const ControlShell = styled.div<{ $error?: boolean; $focused?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${nocturne.surface};
  --autofill-bg: ${nocturne.surface};
  --autofill-fg: ${nocturne.cream};
  border: 1.5px solid ${nocturne.outline};
  transition:
    border-color ${dur.state} ${ease.standard},
    box-shadow ${dur.state} ${ease.standard};
  color: ${nocturne.muted};

  ${({ $focused }) =>
    $focused &&
    css`
      border-color: ${nocturne.accent};
      box-shadow: 0 0 0 4px ${nocturne.ring};
      color: ${nocturne.accent};
    `}

  ${({ $error }) =>
    $error &&
    css`
      border-color: ${nocturne.danger};
      box-shadow: 0 0 0 4px color-mix(in srgb, ${nocturne.danger} 14%, transparent);
      color: ${nocturne.danger};
    `}

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 1rem;
    color: ${nocturne.cream};

    &::placeholder {
      color: ${nocturne.muted2};
    }
  }
`;

export const FieldError = styled.p`
  margin: 8px 2px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${nocturne.danger};
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
`;

export const AlertBox = styled.div.attrs<{ $tone?: "error" | "info" }>(({ $tone = "error" }) => ({
  role: $tone === "error" ? "alert" : "status",
}))<{ $tone?: "error" | "info" }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.45;
  ${({ theme, $tone = "error" }) =>
    $tone === "error"
      ? css`
          background: ${theme.color.dangerBg};
          color: ${theme.color.dangerText};
          animation: ${shake} ${dur.enter} ${ease.standard};

          @media (prefers-reduced-motion: reduce) {
            animation: none;
          }
        `
      : css`
          background: ${theme.color.primaryContainer};
          color: ${theme.color.onPrimaryContainer};
        `}

  svg {
    flex: none;
    margin-top: 1px;
  }
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 700;
  font-size: 1.05rem;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.color.line};
  transition:
    transform ${dur.press} ${ease.standard},
    background ${dur.state} ${ease.standard},
    opacity ${dur.state} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryDark};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }

  svg {
    flex: none;
  }
`;

export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid ${nocturne.outline};
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition:
    border-color ${dur.state} ${ease.standard},
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      border-color: ${nocturne.accent};
      background: ${nocturne.surface2};
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

export const OAuthRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  button {
    height: 54px;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 22px 0;
  color: ${nocturne.muted2};
  font-size: 0.85rem;
  font-weight: 600;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid ${nocturne.line};
  }
`;

export const FootNote = styled.p`
  margin: 26px 0 0;
  text-align: center;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.textSoft};

  a,
  button {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 4px;
    border: none;
    background: none;
    font: inherit;
    color: ${nocturne.accent};
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        text-decoration: underline;
      }
    }
    &:focus-visible {
      outline: 3px solid ${nocturne.accent};
      outline-offset: 2px;
      border-radius: 6px;
    }
  }
`;

const textAction = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 4px;
  border: none;
  background: none;
  font: inherit;
  color: ${nocturne.accent};
  font-weight: 700;
  text-decoration: none;
  font-size: 0.92rem;
  cursor: pointer;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      text-decoration: underline;
    }
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
    border-radius: 6px;
  }
  &:disabled {
    color: ${nocturne.muted2};
    cursor: default;
  }
`;

export const TextLink = styled(Link)`
  ${textAction}
`;

export const TextButton = styled.button`
  ${textAction}
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  border-top-color: transparent;
  animation: ${spin} 0.7s linear infinite;
`;
