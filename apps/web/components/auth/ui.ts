"use client";

import Link from "next/link";
import styled, { css, keyframes } from "styled-components";

/**
 * Auth form vocabulary — minimal, no cards, no gradients. Generous space,
 * soft filled inputs that light up green on focus, one loud primary action.
 */

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

/** Input surface with a leading-icon slot; lights up on focus-within. */
export const ControlShell = styled.div<{ $error?: boolean; $focused?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};
  border: 1.5px solid transparent;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  color: ${({ theme }) => theme.color.muted};

  ${({ theme, $focused }) =>
    $focused &&
    css`
      background: ${theme.color.surface};
      border-color: ${theme.color.primary};
      box-shadow: 0 0 0 4px ${theme.color.primary}22;
      color: ${theme.color.primary};
    `}

  ${({ theme, $error }) =>
    $error &&
    css`
      border-color: ${theme.color.dangerText};
      box-shadow: 0 0 0 4px ${theme.color.dangerText}1f;
      color: ${theme.color.dangerText};
    `}

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 1rem;
    color: ${({ theme }) => theme.color.text};

    &::placeholder {
      color: ${({ theme }) => theme.color.muted};
    }
  }
`;

export const FieldError = styled.p`
  margin: 8px 2px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.dangerText};
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
`;

export const AlertBox = styled.div<{ $tone?: "error" | "info" }>`
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
          animation: ${shake} 0.4s ease;
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

/** The one loud action. Full width, lifts on hover, spinner-ready. */
export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 56px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 700;
  font-size: 1.05rem;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.color.line};
  transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.primaryDark};
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
    box-shadow: none;
  }

  svg {
    flex: none;
  }
`;

/** Neutral bordered button — OAuth + secondary paths. */
export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.primary};
    background: ${({ theme }) => theme.color.surface2};
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.55;
    cursor: default;
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
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.85rem;
  font-weight: 600;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`;

export const FootNote = styled.p`
  margin: 26px 0 0;
  text-align: center;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.textSoft};

  a {
    color: ${({ theme }) => theme.color.primaryDark};
    font-weight: 700;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

export const TextLink = styled(Link)`
  color: ${({ theme }) => theme.color.primaryDark};
  font-weight: 700;
  text-decoration: none;
  font-size: 0.92rem;
  &:hover {
    text-decoration: underline;
  }
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
