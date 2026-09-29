"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { CheckCircle as CheckCircle2, Clock, CircleNotch as Loader2, DeviceMobile as Smartphone, Warning as TriangleAlert } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { FieldBlock, FieldHead, TextInput } from "@/components/home/fields";
import { formatKes } from "@/lib/rides";
import {
  initiatePayment,
  isValidKenyanPhone,
  pollPaymentStatus,
  toDarajaPhone,
} from "@/lib/payments";

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

const Stage_ = styled.div<{ $tone: "wait" | "ok" | "bad" }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 30px 18px 34px;

  .badge {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: ${({ theme, $tone }) =>
      $tone === "ok"
        ? theme.tone.mint.bg
        : $tone === "bad"
          ? theme.color.dangerBg
          : theme.color.surface2};
    color: ${({ theme, $tone }) =>
      $tone === "ok"
        ? theme.tone.mint.on
        : $tone === "bad"
          ? theme.color.dangerText
          : theme.color.primary};
  }
  b {
    font-size: 1.15rem;
    font-weight: 800;
    color: ${({ theme }) => theme.color.text};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: 0.92rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.muted};
  }
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
  const [phone, setPhone] = useState(defaultPhone ?? "");
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

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = stage === "pushing" || stage === "waiting";
  const valid = isValidKenyanPhone(phone);

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
        phone: toDarajaPhone(phone),
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
        <Stage_ $tone="ok">
          <span className="badge">
            <CheckCircle2 size={34} />
          </span>
          <b>Paid — your seat is confirmed</b>
          <p>
            We&apos;re holding {formatKes(amount)} until your trip is done, then
            it goes to your driver.
          </p>
        </Stage_>
      );
    }

    if (stage === "failed") {
      return (
        <Stage_ $tone="bad">
          <span className="badge">
            <TriangleAlert size={32} />
          </span>
          <b>Payment didn&apos;t go through</b>
          <p>
            M-Pesa declined or the request was cancelled. Your seat is still
            held — you can try again.
          </p>
        </Stage_>
      );
    }

    if (stage === "timeout") {
      return (
        <Stage_ $tone="wait">
          <span className="badge">
            <Clock size={32} />
          </span>
          <b>Still waiting on M-Pesa</b>
          <p>
            We stopped watching, but the prompt may still be on your phone. If
            you complete it, your booking updates on its own.
          </p>
        </Stage_>
      );
    }

    if (busy) {
      return (
        <Stage_ $tone="wait">
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>
            {stage === "pushing" ? "Sending the request…" : "Check your phone"}
          </b>
          <p>
            {stage === "pushing"
              ? "Asking M-Pesa to prompt your number."
              : `Enter your M-Pesa PIN to pay ${formatKes(amount)}. Keep this page open.`}
          </p>
        </Stage_>
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
          <TextInput
            id="mpesa-phone"
            ref={phoneRef}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            inputMode="tel"
            autoComplete="tel"
            aria-label="M-Pesa number"
          />
        </FieldBlock>

        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, opacity: 0.7 }}>
          We&apos;ll send a prompt to this number. Your fare is held until the
          trip is complete, then released to the driver.
        </p>
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
