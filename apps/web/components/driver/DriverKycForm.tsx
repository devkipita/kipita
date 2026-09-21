"use client";

import { useRef, useState, useTransition } from "react";
import styled from "styled-components";
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { submitDriverKycAction } from "@/lib/driver/actions";
import { FieldBlock, FieldHead, TextInput } from "@/components/home/fields";

const Intro = styled.div`
  display: flex;
  gap: 13px;
  padding: 15px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.tone.mint.bg};
  color: ${({ theme }) => theme.tone.mint.on};

  svg {
    flex: none;
    margin-top: 1px;
  }
  p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.5;
  }
`;

const Grid2 = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Driver verification — the web port of
 * `apps/mobile/src/components/sheets/DriverKycSheet.tsx`.
 *
 * Opened when someone switches the home toggle to Driver without a
 * `driver_profiles` row. On success the caller re-runs `setModeAction`, so the
 * cookie only flips once the row genuinely exists.
 */
export function DriverKycForm({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Mobile requires ≥4 characters in both fields before enabling submit.
  const canSubmit =
    nationalId.trim().length >= 4 && licenseNumber.trim().length >= 4;

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await submitDriverKycAction({
        national_id: nationalId,
        license_number: licenseNumber,
        license_expiry: licenseExpiry || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSubmitted();
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!pending}
      initialFocusRef={firstFieldRef}
      title="Verify to start driving"
      description="We check every driver before they can offer seats."
      footer={
        <DrawerFooter>
          <ButtonEl
            type="button"
            $variant="ghost"
            $compact
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </ButtonEl>
          <ButtonEl
            type="button"
            $compact
            style={{ flex: 1 }}
            onClick={submit}
            disabled={!canSubmit || pending}
          >
            {pending ? (
              <>
                <Loader2 size={18} strokeWidth={2.4} /> Submitting…
              </>
            ) : (
              <>
                <BadgeCheck size={18} strokeWidth={2.4} /> Submit for review
              </>
            )}
          </ButtonEl>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        <Intro>
          <ShieldCheck size={19} strokeWidth={2.3} />
          <p>
            Your details go to our review team and are never shown to
            passengers. You can post rides as soon as you&apos;ve submitted.
          </p>
        </Intro>

        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="kyc-national-id">National ID number</label>
          </FieldHead>
          <TextInput
            id="kyc-national-id"
            ref={firstFieldRef}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="e.g. 12345678"
            autoComplete="off"
            inputMode="numeric"
          />
        </FieldBlock>

        <Grid2>
          <FieldBlock>
            <FieldHead>
              <label htmlFor="kyc-license">Driving licence number</label>
            </FieldHead>
            <TextInput
              id="kyc-license"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. DL0123456"
              autoComplete="off"
            />
          </FieldBlock>

          <FieldBlock>
            <FieldHead>
              <label htmlFor="kyc-expiry">Licence expiry</label>
              <span className="k">Optional</span>
            </FieldHead>
            <TextInput
              id="kyc-expiry"
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
            />
          </FieldBlock>
        </Grid2>
      </DrawerBody>
    </Drawer>
  );
}
