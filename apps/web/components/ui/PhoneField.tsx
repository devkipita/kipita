"use client";

import { forwardRef } from "react";
import styled from "styled-components";
import { KenyaFlag } from "@/components/ui/KenyaFlag";
import { KE_DIAL_CODE, formatKeLocal, normalizeKeLocal } from "@/lib/phone";

const Shell = styled.div<{ $invalid: boolean }>`
  display: flex;
  align-items: stretch;
  min-height: 52px;
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
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Prefix = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px 0 15px;
  margin: 9px 0;
  border-right: 1px solid ${({ theme }) => theme.color.outlineVariant};
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.onSurface};
  user-select: none;
`;

const Entry = styled.input`
  flex: 1;
  min-width: 0;
  padding: 0 15px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 600;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;

  &::placeholder {
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    font-weight: 500;
    letter-spacing: normal;
  }
  &:focus {
    outline: none;
  }
`;

export type PhoneFieldProps = {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  function PhoneField({ id, value, onChange, invalid = false, describedBy }, ref) {
    return (
      <Shell $invalid={invalid}>
        <Prefix aria-hidden="true">
          <KenyaFlag size={22} />
          {KE_DIAL_CODE}
        </Prefix>
        <Entry
          id={id}
          ref={ref}
          value={formatKeLocal(value)}
          onChange={(event) => onChange(normalizeKeLocal(event.target.value))}
          placeholder="712 345 678"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={11}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      </Shell>
    );
  },
);
