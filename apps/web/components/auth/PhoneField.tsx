"use client";

import { useId, useState } from "react";
import styled from "styled-components";
import { ControlShell, FieldError, Label } from "./ui";
import { KenyaFlag } from "./KenyaFlag";
import { KE_DIAL_CODE, formatKeLocal, normalizeKeLocal } from "@/lib/auth/phone";

const Prefix = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  margin-right: 4px;
  border-right: 1.5px solid ${({ theme }) => theme.color.line};
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme }) => theme.color.text};
  white-space: nowrap;
`;

type Props = {
  value: string; // raw national digits
  onChange: (v: string) => void;
  error?: string;
  label?: string;
};

/** Kenya-only phone entry: real flag + fixed +254 prefix, 9 digits. */
export function PhoneField({ value, onChange, error, label = "Phone number" }: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <ControlShell $error={!!error} $focused={focused}>
        <Prefix>
          <KenyaFlag size={22} />
          {KE_DIAL_CODE}
        </Prefix>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="712 345 678"
          value={formatKeLocal(value)}
          onChange={(e) => onChange(normalizeKeLocal(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
        />
      </ControlShell>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
