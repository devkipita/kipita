"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  CircleNotch as Loader2,
  DeviceMobile as Smartphone,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import {
  EscrowHeldArt,
  PaymentFailedArt,
  PaymentWaitingArt,
  PinPromptArt,
} from "@/components/ui/MoneyArt";
import { PhoneField } from "@/components/ui/PhoneField";
import { FieldBlock, FieldError, FieldHead } from "@/components/home/fields";
import { formatKes } from "@/lib/rides";
import { initiatePayment, pollPaymentStatus } from "@/lib/payments";
import { isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";

type Stage = "form" | "pushing" | "waiting" | "done" | "failed" | "timeout";

const spin = keyframes`to { transform: rotate(360deg); }`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.9s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Summary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface2};

  .label {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.color.muted};
  }
  .amount {
    font-size: 1.3rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const Status = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 26px 24px 36px;

  .badge {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.primary};
  }
  b {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: ${({ theme }) => theme.type.subhead};
    font-weight: 600;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: ${({ theme }) => theme.type.label};
    line-height: 1.5;
    color: ${({ theme }) => theme.color.muted};
  }
`;

const Hint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.type.micro};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.muted};
`;

export function PaymentDrawer({
  open,
  bookingId,
  userId,
  amount,
  defaultPhone,
  onClose,
  onPaid,
}: {
  open: boolean;
  bookingId: string;
  userId: string;
  amount: number;
  defaultPhone?: string | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [phone, setPhone] = useState(() =>
    normalizeKeLocal(defaultPhone ?? ""),
  );
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    setStage("form");
    setError("");
  }, [open]);

  useEffect(() => {
    const digits = normalizeKeLocal(defaultPhone ?? "");
    if (digits) setPhone((current) => current || digits);
  }, [defaultPhone]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = stage === "pushing" || stage === "waiting";
  const valid = isValidKeLocal(phone);
  const phoneBad = phone.length > 0 && !valid;

  async function pay() {
    if (!valid || busy) return;
    setError("");
    setStage("pushing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { payment_id } = await initiatePayment({
        booking_id: bookingId,
        user_id: userId,
        amount,
        method: "mpesa",
        phone: toDaraja(phone),
      });

      setStage("waiting");
      const outcome = await pollPaymentStatus(payment_id, {
        signal: controller.signal,
      });

      if (outcome === "completed") setStage("done");
      else if (outcome === "failed") setStage("failed");
      else setStage("timeout");
    } catch {
      setError("We couldn't reach M-Pesa. Check your connection and try again.");
      setStage("form");
    }
  }

  function body() {
    if (stage === "done") {
      return (
        <Status>
          <EscrowHeldArt />
          <b>Paid. Your seat is confirmed</b>
          <p>
            We&apos;re holding {formatKes(amount)} until your trip is done, then
            it goes to your driver.
          </p>
        </Status>
      );
    }

    if (stage === "failed") {
      return (
        <Status>
          <PaymentFailedArt />
          <b>Payment didn&apos;t go through</b>
          <p>
            M-Pesa declined or the request was cancelled. Your seat is still
            held. You can try again.
          </p>
        </Status>
      );
    }

    if (stage === "timeout") {
      return (
        <Status>
          <PaymentWaitingArt />
          <b>Still waiting on M-Pesa</b>
          <p>
            We stopped watching, but the prompt may still be on your phone. If
            you complete it, your booking updates on its own.
          </p>
        </Status>
      );
    }

    if (stage === "pushing") {
      return (
        <Status>
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>Sending the request…</b>
          <p>Asking M-Pesa to prompt +254 {phone}.</p>
        </Status>
      );
    }

    if (stage === "waiting") {
      return (
        <Status>
          <PinPromptArt />
          <b>Check your phone</b>
          <p>
            Enter your M-Pesa PIN to pay {formatKes(amount)}. Keep this page
            open.
          </p>
        </Status>
      );
    }

    return (
      <DrawerBody>
        <Summary>
          <span className="label">Total to pay</span>
          <span className="amount">{formatKes(amount)}</span>
        </Summary>

        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="mpesa-phone">M-Pesa number</label>
          </FieldHead>
          <PhoneField
            id="mpesa-phone"
            ref={phoneRef}
            value={phone}
            onChange={setPhone}
            invalid={phoneBad}
            describedBy="mpesa-phone-hint"
          />
          {phoneBad && (
            <FieldError>
              That isn&apos;t a Kenyan mobile number. It should be nine digits
              starting with 7 or 1.
            </FieldError>
          )}
        </FieldBlock>

        <Hint id="mpesa-phone-hint">
          We&apos;ll send a prompt to this number. Your fare is held until the
          trip is complete, then released to the driver.
        </Hint>
      </DrawerBody>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!busy}
      initialFocusRef={phoneRef}
      size="sm"
      title="Pay with M-Pesa"
      description="Your fare is held safely until you arrive."
      footer={
        stage === "done" ? (
          <DrawerFooter>
            <ButtonEl type="button" $compact style={{ flex: 1 }} onClick={onPaid}>
              Done
            </ButtonEl>
          </DrawerFooter>
        ) : busy ? undefined : (
          <DrawerFooter>
            <ButtonEl type="button" $variant="ghost" $compact onClick={onClose}>
              Cancel
            </ButtonEl>
            <ButtonEl
              type="button"
              $compact
              style={{ flex: 1 }}
              onClick={pay}
              disabled={!valid}
            >
              <Smartphone size={18} />
              {stage === "form" ? `Pay ${formatKes(amount)}` : "Try again"}
            </ButtonEl>
          </DrawerFooter>
        )
      }
    >
      {body()}
    </Drawer>
  );
}
