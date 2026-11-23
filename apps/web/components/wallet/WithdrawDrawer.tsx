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
  CircleNotch as Loader2,
  DeviceMobile,
  HandCoins,
} from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, ButtonLink, Notice } from "@/components/ui/primitives";
import {
  WalletShortArt,
  WalletToPhoneArt,
} from "@/components/ui/MoneyArt";
import { AmountField } from "@/components/ui/AmountField";
import { FieldBlock, FieldError, FieldHead } from "@/components/home/fields";
import { dur, ease } from "@/lib/nocturne";
import { requestWithdrawal } from "@/lib/wallet/api";

type Stage = "form" | "sending" | "done" | "queued";

export function maskKePhone(local: string): string {
  return `0${local.slice(0, 1)}XX XXX ${local.slice(6, 9)}`;
}

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
  flex-wrap: wrap;
  gap: 4px 12px;
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
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.primary};
  }
`;

const PaidTo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1.5px solid ${({ theme }) => theme.color.outlineVariant};

  svg {
    flex: none;
    color: ${({ theme }) => theme.color.primary};
  }
  span {
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Status = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

const MaxButton = styled.button`
  justify-self: start;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surfaceContainerHigh};
  color: ${({ theme }) => theme.color.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerHighest};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Grow = styled(ButtonEl)`
  flex: 1;
`;

const GrowLink = styled(ButtonLink)`
  flex: 1;
`;

export function WithdrawDrawer({
  open,
  summary,
  payoutPhone,
  onClose,
  onWithdrawn,
}: {
  open: boolean;
  summary: WalletSummary;
  payoutPhone: string | null;
  onClose: () => void;
  onWithdrawn: () => void;
}) {
  const [amount, setAmount] = useState("");
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
  const settled = stage === "done" || stage === "queued";
  const amountOk = canWithdraw(summary, value);
  const amountBad = amount.length > 0 && !amountOk;
  const valid = amountOk && payoutPhone !== null;
  const belowMinimum = summary.balance < MIN_WITHDRAWAL;
  const masked = payoutPhone ? maskKePhone(payoutPhone) : "";

  async function submit() {
    if (!valid || busy) return;
    setError("");
    setStage("sending");

    try {
      const result = await requestWithdrawal({ amount: value });
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
    if (settled) {
      return (
        <Status>
          <WalletToPhoneArt />
          <b>
            {stage === "done"
              ? `${formatKes(value)} on its way`
              : "Withdrawal queued"}
          </b>
          <p>
            {stage === "done"
              ? `Sent to ${masked}. It usually lands within a minute.`
              : `${formatKes(value)} is reserved for ${masked}.`}
          </p>
        </Status>
      );
    }

    if (busy) {
      return (
        <Status role="status">
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>Sending to M-Pesa…</b>
        </Status>
      );
    }

    if (belowMinimum) {
      return (
        <Status>
          <WalletShortArt />
          <b>Not enough to withdraw yet</b>
          <p>
            The minimum is {formatKes(MIN_WITHDRAWAL)}. You have{" "}
            {formatKes(summary.balance)}.
          </p>
        </Status>
      );
    }

    if (!payoutPhone) {
      return (
        <Status>
          <WalletToPhoneArt />
          <b>Verify your phone to withdraw</b>
          <p>Payouts only go to a verified M-Pesa number.</p>
        </Status>
      );
    }

    return (
      <DrawerBody>
        <Summary>
          <span className="label">Available to withdraw</span>
          <span className="amount">{formatKes(summary.balance)}</span>
        </Summary>

        {error && (
          <Notice $variant="error" role="alert">
            {error}
          </Notice>
        )}

        <FieldBlock>
          <FieldHead>
            <label htmlFor="withdraw-amount">Amount</label>
          </FieldHead>
          <AmountField
            id="withdraw-amount"
            ref={amountRef}
            value={amount}
            onChange={setAmount}
            invalid={amountBad}
            label="Withdrawal amount in KES"
          />
          <MaxButton
            type="button"
            onClick={() => setAmount(String(Math.floor(summary.balance)))}
          >
            Withdraw everything
          </MaxButton>
          {amountBad && (
            <FieldError role="alert">
              Enter between {formatKes(MIN_WITHDRAWAL)} and{" "}
              {formatKes(Math.floor(summary.balance))}.
            </FieldError>
          )}
        </FieldBlock>

        <PaidTo aria-label={`Paid to your verified number ending ${payoutPhone.slice(6, 9)}`}>
          <DeviceMobile size={22} />
          <span>
            Paid to <b>{masked}</b>
          </span>
        </PaidTo>

        <Hint>
          Minimum {formatKes(MIN_WITHDRAWAL)}. Escrow can&apos;t be withdrawn.
        </Hint>
      </DrawerBody>
    );
  }

  function footer() {
    if (busy) return undefined;
    if (settled) {
      return (
        <DrawerFooter>
          <Grow type="button" $compact onClick={onWithdrawn}>
            Back to wallet
          </Grow>
        </DrawerFooter>
      );
    }
    if (belowMinimum) {
      return (
        <DrawerFooter>
          <Grow type="button" $variant="ghost" $compact onClick={onClose}>
            Close withdrawal
          </Grow>
        </DrawerFooter>
      );
    }
    if (!payoutPhone) {
      return (
        <DrawerFooter>
          <ButtonEl type="button" $variant="ghost" $compact onClick={onClose}>
            Close withdrawal
          </ButtonEl>
          <GrowLink href="/profile" $compact>
            Open your profile
          </GrowLink>
        </DrawerFooter>
      );
    }
    return (
      <DrawerFooter>
        <ButtonEl type="button" $variant="ghost" $compact onClick={onClose}>
          Cancel withdrawal
        </ButtonEl>
        <Grow type="button" $compact onClick={submit} disabled={!valid}>
          <HandCoins size={18} />
          {amountOk ? `Withdraw ${formatKes(value)}` : "Withdraw"}
        </Grow>
      </DrawerFooter>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={settled ? onWithdrawn : onClose}
      dismissible={!busy}
      initialFocusRef={payoutPhone && !belowMinimum ? amountRef : undefined}
      size="sm"
      side
      title="Withdraw to M-Pesa"
      footer={footer()}
    >
      {body()}
    </Drawer>
  );
}
