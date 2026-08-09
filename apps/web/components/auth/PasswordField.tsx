"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import styled from "styled-components";
import { ControlShell, FieldError, Label } from "./ui";
import { passwordScore } from "@/lib/validators/auth";

const Toggle = styled.button`
  display: inline-flex;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.muted};
  cursor: pointer;
  padding: 4px;
  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Meter = styled.div`
  display: flex;
  gap: 6px;
  margin: 10px 2px 0;
`;

const Seg = styled.span<{ $on: boolean; $level: number }>`
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme, $on, $level }) =>
    !$on
      ? theme.color.line
      : $level <= 1
        ? theme.color.dangerText
        : $level === 2
          ? theme.color.warnText
          : theme.color.primary};
  transition: background 0.25s ease;
`;

const Hint = styled.p<{ $level: number }>`
  margin: 8px 2px 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${({ theme, $level }) =>
    $level <= 1
      ? theme.color.muted
      : $level === 2
        ? theme.color.warnText
        : theme.color.primaryDark};
`;

const LABELS = ["Too short", "Weak", "Getting there", "Strong", "Rock solid"];

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  strength?: boolean;
  autoComplete?: string;
  placeholder?: string;
};

/** Password input with reveal toggle and an optional live strength meter. */
export function PasswordField({
  label = "Password",
  value,
  onChange,
  error,
  strength = false,
  autoComplete = "current-password",
  placeholder = "••••••••",
}: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const score = passwordScore(value);

  return (
    <div>
      <Label htmlFor={id}>
        <Lock size={16} strokeWidth={2.2} /> {label}
      </Label>
      <ControlShell $error={!!error} $focused={focused}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
        />
        <Toggle type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </Toggle>
      </ControlShell>

      {strength && value.length > 0 && (
        <>
          <Meter>
            {[0, 1, 2, 3].map((i) => (
              <Seg key={i} $on={i < score} $level={score} />
            ))}
          </Meter>
          <Hint $level={score}>{LABELS[score]}</Hint>
        </>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
