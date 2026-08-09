"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ControlShell, FieldError, Label } from "./ui";

type Props = {
  label: string;
  icon?: LucideIcon;
  error?: string;
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** Labelled input with a leading icon, focus glow, and inline error. */
export function TextField({ label, icon: Icon, error, trailing, ...input }: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <ControlShell $error={!!error} $focused={focused}>
        {Icon && <Icon size={18} strokeWidth={2.2} />}
        <input
          id={id}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          aria-invalid={!!error}
          {...input}
        />
        {trailing}
      </ControlShell>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
