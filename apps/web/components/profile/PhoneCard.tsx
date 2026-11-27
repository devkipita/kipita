"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Check, Phone } from "@/components/icons";
import { formatKeLocal, normalizeKeLocal } from "@/lib/phone";
import { PhoneVerifyFlow } from "./PhoneVerifyFlow";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`;

const Lead = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};
`;

const Body = styled.span`
  flex: 1;
  min-width: 0;

  .t {
    display: block;
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurface};
  }

  .d {
    display: block;
    margin-top: 2px;
    font-size: ${({ theme }) => theme.type.label};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 40px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
`;

type Via = "sms" | "mpesa" | null | undefined;

function statusText(phone: string | null, verified: boolean, via: Via): string {
  if (!phone) {
    return "Add your mobile number.";
  }
  if (!verified) return "Not verified. We’ll text a code.";
  return via === "mpesa" ? "Verified by M-Pesa." : "Confirmed by SMS code.";
}

/**
 * The profile's phone number: shows the number and how it was verified, and lets
 * the person add or change it with an SMS code. Sign-in never uses this number.
 */
export function PhoneCard({
  phone,
  verified,
  via,
}: {
  phone: string | null;
  verified: boolean;
  via?: Via;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const local = normalizeKeLocal(phone ?? "");
  const shown = local ? `+254 ${formatKeLocal(local)}` : "No number yet";

  return (
    <Wrap>
      <Top>
        <Lead>{verified ? <Check size={20} /> : <Phone size={20} />}</Lead>
        <Body>
          <span className="t">Phone number: {shown}</span>
          <span className="d">{statusText(phone, verified, via)}</span>
        </Body>
        {!open && (
          <Action type="button" onClick={() => setOpen(true)}>
            {phone ? "Change" : "Add number"}
          </Action>
        )}
      </Top>
      {open && (
        <PhoneVerifyFlow
          initialPhone={phone}
          onCancel={() => setOpen(false)}
          onVerified={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </Wrap>
  );
}
