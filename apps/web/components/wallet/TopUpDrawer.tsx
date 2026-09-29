"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  formatKes,
  isValidTopupAmount,
  MAX_TOPUP,
  MIN_TOPUP,
} from "@kipita/shared";
import {
  CheckCircle as CheckCircle2,
  Clock,
  CircleNotch as Loader2,
  DeviceMobile as Smartphone,
  Warning as TriangleAlert,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { FieldBlock, FieldHead, TextInput } from "@/components/home/fields";
import { isValidKenyanPhone, toDarajaPhone } from "@/lib/payments";
import { pollTopupStatus, startTopup } from "@/lib/wallet/api";

type Stage = "form" | "pushing" | "waiting" | "done" | "failed" | "timeout";

const PRESETS = [200, 500, 1000, 2500];

const spin = keyframes`to { transform: rotate(360deg); }`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.9s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Presets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Preset = styled.button<{ $active: boolean }>`
  min-height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surfaceContainerLow};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.onSurfaceVariant};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.color.primaryContainer : theme.color.surfaceContainer};
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

const Hint = styled.p`
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.muted};
`;

export function TopUpDrawer({
  open,
  defaultPhone,
  onClose,
  onToppedUp,
}: {
  open: boolean;
  defaultPhone?: string | null;
  onClose: () => void;
  onToppedUp: () => void;
}) {
  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    setStage("form");
    setError("");
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const value = Number(amount);
  const busy = stage === "pushing" || stage === "waiting";
  const valid = isValidTopupAmount(value) && isValidKenyanPhone(phone);

  async function submit() {
    if (!valid || busy) return;
    setError("");
    setStage("pushing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { topup_id } = await startTopup({
        amount: value,
        phone: toDarajaPhone(phone),
      });

      setStage("waiting");
      const outcome = await pollTopupStatus(topup_id, {
        signal: controller.signal,
      });

      if (outcome === "completed") setStage("done");
      else if (outcome === "failed") setStage("failed");
      else setStage("timeout");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reach M-Pesa. Check your connection and try again.",
      );
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
          <b>{formatKes(value)} added</b>
          <p>
            Your Kipita wallet balance is up to date. Use it for fares, or
            withdraw it back to M-Pesa any time.
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
          <b>Top-up didn&apos;t go through</b>
          <p>
            M-Pesa declined or the request was cancelled. Nothing was charged —
            you can try again.
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
            you complete it, your balance updates on its own.
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
              : `Enter your M-Pesa PIN to add ${formatKes(value)}. Keep this page open.`}
          </p>
        </Stage_>
      );
    }

    return (
      <DrawerBody>
        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="topup-amount">Amount</label>
          </FieldHead>
          <TextInput
            id="topup-amount"
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="500"
            inputMode="numeric"
            aria-label="Top-up amount in KES"
          />
        </FieldBlock>

        <Presets>
          {PRESETS.map((preset) => (
            <Preset
              key={preset}
              type="button"
              $active={value === preset}
              onClick={() => setAmount(String(preset))}
            >
              {formatKes(preset)}
            </Preset>
          ))}
        </Presets>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="topup-phone">M-Pesa number</label>
          </FieldHead>
          <TextInput
            id="topup-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            inputMode="tel"
            autoComplete="tel"
            aria-label="M-Pesa number"
          />
        </FieldBlock>

        <Hint>
          Between {formatKes(MIN_TOPUP)} and {formatKes(MAX_TOPUP)}. We&apos;ll
          send a prompt to this number and your balance updates once you confirm.
        </Hint>
      </DrawerBody>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!busy}
      initialFocusRef={amountRef}
      size="sm"
      title="Top up your wallet"
      description="Add money with M-Pesa to pay for fares faster."
      footer={
        stage === "done" ? (
          <DrawerFooter>
            <ButtonEl
              type="button"
              $compact
              style={{ flex: 1 }}
              onClick={onToppedUp}
            >
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
              onClick={submit}
              disabled={!valid}
            >
              <Smartphone size={18} />
              {stage === "form"
                ? `Add ${isValidTopupAmount(value) ? formatKes(value) : "money"}`
                : "Try again"}
            </ButtonEl>
          </DrawerFooter>
        )
      }
    >
      {body()}
    </Drawer>
  );
}
