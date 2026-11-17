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
  CircleNotch as Loader2,
  DeviceMobile as Smartphone,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { AmountField } from "@/components/ui/AmountField";
import {
  PaymentFailedArt,
  PaymentWaitingArt,
  PinPromptArt,
  WalletFilledArt,
} from "@/components/ui/MoneyArt";
import { PhoneField } from "@/components/ui/PhoneField";
import { FieldBlock, FieldError, FieldHead } from "@/components/home/fields";
import { isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";
import { dur, ease } from "@/lib/nocturne";
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

const Range = styled.span`
  font-size: ${({ theme }) => theme.type.micro};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.muted};
`;

const Presets = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const Grow = styled(ButtonEl)`
  flex: 1;
`;

const Preset = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 6px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryContainer : theme.color.surfaceContainerLow};
  color: ${({ theme, $active }) =>
    $active ? theme.color.onPrimaryContainer : theme.color.textSoft};
  box-shadow: inset 0 0 0 1px
    ${({ theme, $active }) =>
      $active ? "transparent" : theme.color.outlineVariant};

  @media (hover: hover) {
    &:hover {
      background: ${({ theme, $active }) =>
        $active ? theme.color.primaryContainer : theme.color.surfaceContainer};
      color: ${({ theme }) => theme.color.onSurface};
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Status = styled.div<{ $tone: "wait" | "ok" | "bad" }>`
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
    background: ${({ theme, $tone }) =>
      $tone === "ok"
        ? theme.tone.mint.bg
        : $tone === "bad"
          ? theme.color.dangerBg
          : theme.color.surfaceContainerHigh};
    color: ${({ theme, $tone }) =>
      $tone === "ok"
        ? theme.tone.mint.on
        : $tone === "bad"
          ? theme.color.dangerText
          : theme.color.primary};
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
  const [phone, setPhone] = useState(() => normalizeKeLocal(defaultPhone ?? ""));
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

  useEffect(() => {
    const digits = normalizeKeLocal(defaultPhone ?? "");
    if (digits) setPhone((current) => current || digits);
  }, [defaultPhone]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const value = Number(amount);
  const busy = stage === "pushing" || stage === "waiting";
  const amountOk = isValidTopupAmount(value);
  const phoneOk = isValidKeLocal(phone);
  const valid = amountOk && phoneOk;
  const amountBad = amount.length > 0 && !amountOk;
  const phoneBad = phone.length > 0 && !phoneOk;

  async function submit() {
    if (!valid || busy) return;
    setError("");
    setStage("pushing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { topup_id } = await startTopup({
        amount: value,
        phone: toDaraja(phone),
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
        <Status $tone="ok" role="status">
          <WalletFilledArt />
          <b>{formatKes(value)} added</b>
        </Status>
      );
    }

    if (stage === "failed") {
      return (
        <Status $tone="bad" role="alert">
          <PaymentFailedArt />
          <b>Top-up didn&apos;t go through</b>
          <p>Nothing was charged.</p>
        </Status>
      );
    }

    if (stage === "timeout") {
      return (
        <Status $tone="wait" role="status">
          <PaymentWaitingArt />
          <b>Still waiting on M-Pesa</b>
          <p>If you confirm the prompt, your balance updates on its own.</p>
        </Status>
      );
    }

    if (stage === "pushing") {
      return (
        <Status $tone="wait" role="status">
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>Sending the request…</b>
        </Status>
      );
    }

    if (stage === "waiting") {
      return (
        <Status $tone="wait" role="status">
          <PinPromptArt />
          <b>Check your phone</b>
          <p>Enter your M-Pesa PIN to add {formatKes(value)}.</p>
        </Status>
      );
    }

    return (
      <DrawerBody>
        {error && (
          <Notice $variant="error" role="alert">
            {error}
          </Notice>
        )}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="topup-amount">Amount</label>
            <Range>
              {MIN_TOPUP.toLocaleString("en-KE")} -{" "}
              {MAX_TOPUP.toLocaleString("en-KE")}
            </Range>
          </FieldHead>

          <AmountField
            id="topup-amount"
            ref={amountRef}
            value={amount}
            onChange={setAmount}
            invalid={amountBad}
            label="Top-up amount in KES"
          />

          <Presets>
            {PRESETS.map((preset) => (
              <Preset
                key={preset}
                type="button"
                $active={value === preset}
                aria-pressed={value === preset}
                onClick={() => setAmount(String(preset))}
              >
                {preset.toLocaleString("en-KE")}
              </Preset>
            ))}
          </Presets>

          {amountBad && (
            <FieldError>
              Enter an amount between {formatKes(MIN_TOPUP)} and{" "}
              {formatKes(MAX_TOPUP)}.
            </FieldError>
          )}
        </FieldBlock>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="topup-phone">M-Pesa number</label>
          </FieldHead>

          <PhoneField
            id="topup-phone"
            value={phone}
            onChange={setPhone}
            invalid={phoneBad}
            describedBy="topup-phone-hint"
          />

          {phoneBad ? (
            <FieldError role="alert">
              Nine digits, starting with 7 or 1.
            </FieldError>
          ) : (
            <Hint id="topup-phone-hint">M-Pesa sends the prompt here.</Hint>
          )}
        </FieldBlock>
      </DrawerBody>
    );
  }

  const settled = stage === "done" || stage === "timeout";

  return (
    <Drawer
      open={open}
      onClose={settled ? onToppedUp : onClose}
      dismissible={!busy}
      initialFocusRef={amountRef}
      size="sm"
      title="Top up your wallet"
      footer={
        settled ? (
          <DrawerFooter>
            <Grow type="button" $compact onClick={onToppedUp}>
              Back to wallet
            </Grow>
          </DrawerFooter>
        ) : busy ? undefined : (
          <DrawerFooter>
            <ButtonEl type="button" $variant="ghost" $compact onClick={onClose}>
              Cancel top-up
            </ButtonEl>
            <Grow
              type="button"
              $compact
              onClick={submit}
              disabled={!valid}
            >
              <Smartphone size={18} />
              {stage === "form"
                ? `Add ${amountOk ? formatKes(value) : "money"}`
                : "Try again"}
            </Grow>
          </DrawerFooter>
        )
      }
    >
      {body()}
    </Drawer>
  );
}
