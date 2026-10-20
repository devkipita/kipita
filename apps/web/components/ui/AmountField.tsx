"use client";

import { forwardRef } from "react";
import styled from "styled-components";

const Shell = styled.div<{ $invalid: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 16px 18px 18px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  box-shadow: ${({ theme, $invalid }) =>
    $invalid ? `inset 0 0 0 1.5px ${theme.color.error}` : "none"};
  transition: background 0.16s ease, box-shadow 0.16s ease;

  &:focus-within {
    background: ${({ theme }) => theme.color.surfaceContainerHighest};
    box-shadow: inset 0 0 0 2px
      ${({ theme, $invalid }) =>
        $invalid ? theme.color.error : theme.color.primary};
  }

  .unit {
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.muted};
    user-select: none;
  }
  input {
    flex: 1;
    min-width: 0;
    width: 100%;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 2.125rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.onSurface};
  }
  input::placeholder {
    color: ${({ theme }) => theme.color.outlineVariant};
  }
  input:focus {
    outline: none;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export type AmountFieldProps = {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  label: string;
  maxDigits?: number;
  placeholder?: string;
  invalid?: boolean;
};

export const AmountField = forwardRef<HTMLInputElement, AmountFieldProps>(
  function AmountField(
    { id, value, onChange, label, maxDigits = 6, placeholder = "0", invalid = false },
    ref,
  ) {
    return (
      <Shell $invalid={invalid}>
        <span className="unit" aria-hidden="true">
          KES
        </span>
        <input
          id={id}
          ref={ref}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, "").slice(0, maxDigits))
          }
          placeholder={placeholder}
          inputMode="numeric"
          aria-invalid={invalid || undefined}
          aria-label={label}
        />
      </Shell>
    );
  },
);
