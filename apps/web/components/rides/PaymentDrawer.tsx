"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { m } from "motion/react";
import {
  ArrowClockwise,
  CircleNotch as Loader2,
  DeviceMobile as Smartphone,
  Warning,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import {
  EscrowHeldArt,
  PaymentFailedArt,
  PaymentWaitingArt,
  PinPromptArt,
} from "@/components/ui/MoneyArt";
import { PhoneField } from "@/components/ui/PhoneField";
import { Swap } from "@/components/anim/Swap";
import { FieldBlock, FieldError, FieldHead } from "@/components/home/fields";
import { pressable } from "@/components/ui/interactions";
import { formatKes } from "@/lib/rides";
import {
  checkPaymentStatus,
  initiatePayment,
  PaymentError,
  pollPaymentStatus,
} from "@/lib/payments";
import { isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";
import { spring } from "@/lib/motion";
import { nocturne } from "@/lib/nocturne";

type Stage = "form" | "pushing" | "waiting" | "checking" | "done" | "failed" | "timeout";

const spin = keyframes`to { transform: rotate(360deg); }`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.9s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StageSwap = styled(Swap)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const Summary = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 4px 12px;
  padding: 16px 18px;
  border-radius: 14px;
  background: ${nocturne.surface2};

  .label {
    font-size: 15px;
    font-weight: 600;
    color: ${nocturne.cream};
  }
  .amount {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 22px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .held {
    grid-column: 1 / -1;
    font-size: 14px;
    color: ${nocturne.muted};
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
    background: ${nocturne.surface3};
    color: ${nocturne.accent};
  }
  .art {
    width: 100%;
  }
  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${nocturne.cream};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 15px;
    line-height: 1.5;
    color: ${nocturne.muted};
  }
`;

const Hint = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${nocturne.muted};
`;

const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 24px 20px;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${nocturne.surface2};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: ${nocturne.cream};

  svg {
    flex: none;
    margin-top: 2px;
    color: ${nocturne.danger};
  }
`;

const FormAlert = styled(Alert)`
  margin: 0;
`;

const PayButton = styled.button`
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  ${pressable()}

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border: 1.5px solid ${nocturne.outline};
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.cream};
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  ${pressable()}
`;

export function PaymentDrawer({
  open,
  bookingId,
  amount,
  defaultPhone,
  onClose,
  onPaid,
}: {
  open: boolean;
  bookingId: string;
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
  const paymentIdRef = useRef<string | null>(null);
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

  const busy = stage === "pushing" || stage === "waiting" || stage === "checking";
  const valid = isValidKeLocal(phone);
  const phoneBad = phone.length > 0 && !valid;

  async function watch(paymentId: string) {
    const controller = new AbortController();
    abortRef.current = controller;
    setStage("waiting");
    const outcome = await pollPaymentStatus(paymentId, { signal: controller.signal });
    if (controller.signal.aborted) return;
    setStage(outcome === "completed" ? "done" : outcome === "failed" ? "failed" : "timeout");
  }

  async function sendPrompt() {
    if (!valid || busy) return;
    setError("");
    setStage("pushing");
    try {
      const { payment_id, status } = await initiatePayment({
        booking_id: bookingId,
        method: "mpesa",
        phone: toDaraja(phone),
      });
      paymentIdRef.current = payment_id;
      if (status === "completed") {
        setStage("done");
        return;
      }
      await watch(payment_id);
    } catch (err) {
      setError(
        err instanceof PaymentError
          ? err.message
          : "We couldn't reach M-Pesa. Try again.",
      );
      setStage("form");
    }
  }

  async function checkAgain() {
    const paymentId = paymentIdRef.current;
    if (!paymentId || busy) return;
    setError("");
    setStage("checking");
    let status: string;
    try {
      status = await checkPaymentStatus(paymentId);
    } catch {
      setError("We couldn't check with M-Pesa. Try again.");
      setStage("timeout");
      return;
    }
    if (status === "completed") setStage("done");
    else if (status === "failed") setStage("failed");
    else if (status === "refunded") {
      setError("This payment was refunded to your Kipita wallet.");
      setStage("failed");
    } else await watch(paymentId);
  }

  function body() {
    if (stage === "done") {
      return (
        <Status>
          <m.span
            className="art"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: spring.success }}
          >
            <EscrowHeldArt />
          </m.span>
          <b>Paid. Your seat is confirmed</b>
          <p>
            Kipita holds {formatKes(amount)} until your trip is done, then it
            goes to your driver.
          </p>
        </Status>
      );
    }

    if (stage === "failed") {
      return (
        <>
          <Status>
            <PaymentFailedArt />
            <b>Payment didn&apos;t go through</b>
            <p>
              M-Pesa declined it or the prompt was cancelled. Your seat is still
              held.
            </p>
          </Status>
          {error && (
            <Alert role="alert">
              <Warning size={18} />
              {error}
            </Alert>
          )}
        </>
      );
    }

    if (stage === "timeout") {
      return (
        <>
          <Status>
            <PaymentWaitingArt />
            <b>Still waiting on M-Pesa</b>
            <p>
              The prompt may still be on your phone. Finish it there, then
              check again here.
            </p>
          </Status>
          {error && (
            <Alert role="alert">
              <Warning size={18} />
              {error}
            </Alert>
          )}
        </>
      );
    }

    if (stage === "pushing" || stage === "checking") {
      return (
        <Status role="status">
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>{stage === "pushing" ? "Sending the request" : "Checking with M-Pesa"}</b>
          <p>
            {stage === "pushing"
              ? `Asking M-Pesa to prompt +254 ${phone}.`
              : "Making sure your first prompt didn't go through before we send another."}
          </p>
        </Status>
      );
    }

    if (stage === "waiting") {
      return (
        <Status role="status">
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
          <span className="held">Kipita holds it until your trip is done.</span>
        </Summary>

        {error && (
          <FormAlert role="alert">
            <Warning size={18} />
            {error}
          </FormAlert>
        )}

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
          We&apos;ll send the payment prompt to this number.
        </Hint>
      </DrawerBody>
    );
  }

  function footer() {
    if (busy) return undefined;
    if (stage === "done") {
      return (
        <DrawerFooter>
          <PayButton type="button" onClick={onPaid}>
            See your trip
          </PayButton>
        </DrawerFooter>
      );
    }
    if (stage === "timeout") {
      return (
        <DrawerFooter>
          <SecondaryButton type="button" onClick={onClose}>
            Close payment
          </SecondaryButton>
          <PayButton type="button" onClick={checkAgain}>
            <ArrowClockwise size={18} />
            Check M-Pesa again
          </PayButton>
        </DrawerFooter>
      );
    }
    return (
      <DrawerFooter>
        <SecondaryButton type="button" onClick={onClose}>
          {stage === "failed" ? "Close payment" : "Cancel payment"}
        </SecondaryButton>
        <PayButton type="button" onClick={sendPrompt} disabled={!valid}>
          <Smartphone size={18} />
          Pay {formatKes(amount)} with M-Pesa
        </PayButton>
      </DrawerFooter>
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
      footer={footer()}
    >
      <StageSwap id={stage}>{body()}</StageSwap>
    </Drawer>
  );
}
