"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  canWithdraw,
  formatKes,
  MIN_WITHDRAWAL,
  type WalletSummary,
} from "@kipita/shared";
import { CircleNotch as Loader2, HandCoins } from "@/components/icons";
import { Drawer, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { ButtonEl, Notice } from "@/components/ui/primitives";
import {
  WalletShortArt,
  WalletToPhoneArt,
} from "@/components/ui/MoneyArt";
import { AmountField } from "@/components/ui/AmountField";
import { PhoneField } from "@/components/ui/PhoneField";
import { FieldBlock, FieldError, FieldHead } from "@/components/home/fields";
import { isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";
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

const MaxButton = styled.button`
  justify-self: end;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: ${({ theme }) => theme.type.micro};
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
  const [phone, setPhone] = useState(() =>
    normalizeKeLocal(defaultPhone ?? ""),
  );
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setStage("form");
    setError("");
  }, [open]);

  useEffect(() => {
    const digits = normalizeKeLocal(defaultPhone ?? "");
    if (digits) setPhone((current) => current || digits);
  }, [defaultPhone]);

  const value = Number(amount);
  const busy = stage === "sending";
  const phoneOk = isValidKeLocal(phone);
  const phoneBad = phone.length > 0 && !phoneOk;
  const amountOk = canWithdraw(summary, value);
  const amountBad = amount.length > 0 && !amountOk;
  const valid = amountOk && phoneOk;
  const belowMinimum = summary.balance < MIN_WITHDRAWAL;

  async function submit() {
    if (!valid || busy) return;
    setError("");
    setStage("sending");

    try {
      const result = await requestWithdrawal({
        amount: value,
        phone: toDaraja(phone),
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
        <Status>
          <WalletToPhoneArt />
          <b>
            {stage === "done"
              ? `${formatKes(value)} on its way`
              : "Withdrawal queued"}
          </b>
          <p>
            {stage === "done"
              ? `M-Pesa is sending ${formatKes(value)} to +254 ${phone}. It usually arrives within a minute.`
              : `We've reserved ${formatKes(value)} from your balance and will send it to +254 ${phone} shortly.`}
          </p>
        </Status>
      );
    }

    if (busy) {
      return (
        <Status>
          <span className="badge">
            <Spinner size={32} />
          </span>
          <b>Sending to M-Pesa…</b>
          <p>Hold on while we move the money out of your Kipita wallet.</p>
        </Status>
      );
    }

    if (belowMinimum) {
      return (
        <Status>
          <WalletShortArt />
          <b>Not enough to withdraw yet</b>
          <p>
            The smallest withdrawal is {formatKes(MIN_WITHDRAWAL)}, and you have{" "}
            {formatKes(summary.balance)} available. Finish a ride or top up to
            build your balance.
          </p>
        </Status>
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
            <FieldError>
              Enter between {formatKes(MIN_WITHDRAWAL)} and{" "}
              {formatKes(Math.floor(summary.balance))}.
            </FieldError>
          )}
        </FieldBlock>

        <FieldBlock>
          <FieldHead>
            <label htmlFor="withdraw-phone">Send to M-Pesa number</label>
          </FieldHead>
          <PhoneField
            id="withdraw-phone"
            value={phone}
            onChange={setPhone}
            invalid={phoneBad}
          />
          {phoneBad && (
            <FieldError>
              That isn&apos;t a Kenyan mobile number. It should be nine digits
              starting with 7 or 1.
            </FieldError>
          )}
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
