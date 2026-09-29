"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  canWithdraw,
  formatKes,
  MIN_WITHDRAWAL,
  type WalletSummary,
} from "@kipita/shared";
import {
  CheckCircle as CheckCircle2,
  CircleNotch as Loader2,
  HandCoins,
  Warning as TriangleAlert,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import { FieldBlock, FieldHead, TextInput } from "@/components/home/fields";
import { isValidKenyanPhone, toDarajaPhone } from "@/lib/payments";
import { requestWithdrawal } from "@/lib/wallet/api";

type Stage = "form" | "sending" | "done" | "queued";

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

const Stage_ = styled.div<{ $tone: "wait" | "ok" }>`
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
      $tone === "ok" ? theme.tone.mint.bg : theme.color.surface2};
    color: ${({ theme, $tone }) =>
      $tone === "ok" ? theme.tone.mint.on : theme.color.primary};
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

const MaxRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const MaxButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  color: ${({ theme }) => theme.color.primary};

  &:hover {
    text-decoration: underline;
  }
`;

export function WithdrawDrawer({
  open,
  summary,
  defaultPhone,
  onClose,
  onWithdrawn,
}: {
  open: boolean;
  summary: WalletSummary;
  defaultPhone?: string | null;
  onClose: () => void;
  onWithdrawn: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setStage("form");
    setError("");
  }, [open]);

  const value = Number(amount);
  const busy = stage === "sending";
  const valid = canWithdraw(summary, value) && isValidKenyanPhone(phone);
  const belowMinimum = summary.balance < MIN_WITHDRAWAL;

  async function submit() {
    if (!valid || busy) return;
    setError("");
    setStage("sending");

    try {
      const result = await requestWithdrawal({
        amount: value,
        phone: toDarajaPhone(phone),
      });
      setStage(result.status === "paid" ? "done" : "queued");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reach M-Pesa. Your balance is unchanged.",
      );
      setStage("form");
    }
  }

  function body() {
    if (stage === "done" || stage === "queued") {
      return (
        <Stage_ $tone="ok">
          <span className="badge">
            <CheckCircle2 size={34} />
          </span>
          <b>
            {stage === "done"
              ? `${formatKes(value)} on its way`
              : "Withdrawal queued"}
          </b>
          <p>
            {stage === "done"
              ? `M-Pesa is sending ${formatKes(value)} to ${phone}. It usually arrives within a minute.`
              : `We've reserved ${formatKes(value)} from your balance and will send it to ${phone} shortly.`}
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
          <b>Sending to M-Pesa…</b>
          <p>Hold on while we move the money out of your Kipita wallet.</p>
        </Stage_>
      );
    }

    if (belowMinimum) {
      return (
        <DrawerBody>
          <Stage_ $tone="wait">
            <span className="badge">
              <TriangleAlert size={32} />
            </span>
            <b>Not enough to withdraw yet</b>
            <p>
              The smallest withdrawal is {formatKes(MIN_WITHDRAWAL)}. You have{" "}
              {formatKes(summary.balance)} available.
            </p>
          </Stage_>
        </DrawerBody>
      );
    }

    return (
      <DrawerBody>
        <Summary>
          <span className="label">Available to withdraw</span>
          <span className="amount">{formatKes(summary.balance)}</span>
        </Summary>

        {error && <Notice $variant="error">{error}</Notice>}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="withdraw-amount">Amount</label>
          </FieldHead>
          <TextInput
            id="withdraw-amount"
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={String(MIN_WITHDRAWAL)}
            inputMode="numeric"
            aria-label="Withdrawal amount in KES"
          />
          <MaxRow>
            <MaxButton
              type="button"
              onClick={() => setAmount(String(Math.floor(summary.balance)))}
            >
              Withdraw everything
            </MaxButton>
          </MaxRow>
        </FieldBlock>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="withdraw-phone">Send to M-Pesa number</label>
          </FieldHead>
          <TextInput
            id="withdraw-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            inputMode="tel"
            autoComplete="tel"
            aria-label="M-Pesa number"
          />
        </FieldBlock>

        <Hint>
          Minimum {formatKes(MIN_WITHDRAWAL)}. Money held in escrow for rides
          that haven&apos;t finished can&apos;t be withdrawn yet.
        </Hint>
      </DrawerBody>
    );
  }

  const settled = stage === "done" || stage === "queued";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      dismissible={!busy}
      initialFocusRef={amountRef}
      size="sm"
      title="Withdraw to M-Pesa"
      description="Move your Kipita balance to your phone."
      footer={
        settled ? (
          <DrawerFooter>
            <ButtonEl
              type="button"
              $compact
              style={{ flex: 1 }}
              onClick={onWithdrawn}
            >
              Done
            </ButtonEl>
          </DrawerFooter>
        ) : busy ? undefined : belowMinimum ? (
          <DrawerFooter>
            <ButtonEl
              type="button"
              $variant="ghost"
              $compact
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Close
            </ButtonEl>
          </DrawerFooter>
        ) : (
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
              <HandCoins size={18} />
              Withdraw
            </ButtonEl>
          </DrawerFooter>
        )
      }
    >
      {body()}
    </Drawer>
  );
}
