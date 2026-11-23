"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import {
  CircleNotch,
  DeviceMobile,
  ShieldCheck,
  Wallet,
} from "@/components/icons";
import { Collapse } from "@/components/anim/Collapse";
import { FieldError } from "@/components/home/fields";
import {
  EscrowHeldArt,
  PaymentFailedArt,
  PaymentWaitingArt,
  PinPromptArt,
} from "@/components/ui/MoneyArt";
import { PhoneField } from "@/components/ui/PhoneField";
import { nocturne } from "@/lib/nocturne";
import { initiatePayment, pollPaymentStatus } from "@/lib/payments";
import { isValidKeLocal, normalizeKeLocal, toDaraja } from "@/lib/phone";
import { formatCurrency } from "@/lib/trips/format";
import { payWithWalletAction } from "@/lib/trips/journey-actions";
import { PanelBody, PanelFoot } from "./SidePanel";

type Stage = "form" | "pushing" | "waiting" | "done" | "failed" | "timeout";
type Method = "mpesa" | "wallet";
type StatusStage = Exclude<Stage, "form" | "waiting">;

const POLL_MS = 90_000;

const formatPhone = (digits: string) =>
  digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

const heading = css`
  margin: 0;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 800;
  color: ${nocturne.muted};
`;

/* Form */

const Checkout = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.xl};

  h3 {
    ${heading}
    margin-bottom: ${({ theme }) => theme.space.md};
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`;

const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
`;

const Option = styled.div<{ $on: boolean; $off?: boolean }>`
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px solid ${({ $on }) => ($on ? nocturne.green : "transparent")};
  background: ${({ $on }) => ($on ? nocturne.surface : nocturne.surface2)};
  transition:
    border-color ${({ theme }) => theme.motion.duration.short4}
      ${({ theme }) => theme.motion.easing.standard},
    background-color ${({ theme }) => theme.motion.duration.short4},
      ${({ theme }) => theme.motion.easing.standard};

  &:has(input:focus-visible) {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }

  label {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: ${({ theme }) => theme.space.md};
    min-height: 64px;
    padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg}
      ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md};
    cursor: ${({ $off }) => ($off ? "not-allowed" : "pointer")};
  }
  .logo {
    display: grid;
    place-items: center;
    width: 52px;
    height: 40px;
    border-radius: ${({ theme }) => theme.radius.xxs};
    background: ${nocturne.surface3};
    color: ${nocturne.green};
    opacity: ${({ $off }) => ($off ? 0.5 : 1)};
  }
  .logo img {
    width: 42px;
    height: auto;
  }
  .name {
    display: grid;
    gap: ${({ theme }) => theme.space.xxs};
    min-width: 0;
  }
  b {
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 800;
    color: ${({ $off }) => ($off ? nocturne.muted : nocturne.cream)};
  }
  small {
    font-size: ${({ theme }) => theme.type.micro};
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid ${({ $on }) => ($on ? nocturne.green : nocturne.outline)};
    background: ${({ $on }) => ($on ? nocturne.green : "transparent")};
    box-shadow: inset 0 0 0 4px
      ${({ $on }) => ($on ? nocturne.surface : "transparent")};
    opacity: ${({ $off }) => ($off ? 0.5 : 1)};
    transition:
      border-color ${({ theme }) => theme.motion.duration.short4}
        ${({ theme }) => theme.motion.easing.standard},
      background-color ${({ theme }) => theme.motion.duration.short4},
        ${({ theme }) => theme.motion.easing.standard};
  }
  .more {
    display: grid;
    gap: ${({ theme }) => theme.space.sm};
    padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.lg};
  }
`;

const Lines = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
  margin: 0;
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${nocturne.surface2};

  div {
    display: flex;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.md};
    font-size: ${({ theme }) => theme.type.body};
  }
  dt {
    color: ${nocturne.muted};
  }
  dd {
    margin: 0;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${nocturne.cream};
  }
  .total {
    padding-top: ${({ theme }) => theme.space.md};
    border-top: 1px solid ${nocturne.outline};
  }
  .total dt {
    font-weight: 800;
    color: ${nocturne.cream};
  }
`;

const Safe = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  margin: ${({ theme }) => theme.space.md} 0 0;
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${nocturne.surface2};
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 700;
  color: ${nocturne.green};

  svg {
    flex: none;
  }
`;

const Err = styled.p`
  margin: 0;
  font-weight: 700;
  color: ${nocturne.danger};
`;

const Consent = styled.p`
  margin: ${({ theme }) => theme.space.md} 0 0;
  font-size: ${({ theme }) => theme.type.label};
  color: ${nocturne.muted};
`;

const Terms = styled.div`
  margin-top: ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.type.label};
  color: ${nocturne.muted};

  b {
    display: block;
    margin-bottom: 4px;
    font-weight: 800;
    color: ${nocturne.cream};
  }
  ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 2px;
  }
`;

/* Status screens */

const spin = keyframes`to { transform: rotate(360deg); }`;

const drain = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

const Art = styled.div<{ $compact?: boolean }>`
  display: grid;
  place-items: center;
  margin: ${({ theme }) => theme.space.xs} 0 ${({ theme }) => theme.space.sm};

  svg {
    width: 100%;
    max-width: ${({ $compact }) => ($compact ? "120px" : "200px")};
    height: auto;
  }
  .spin {
    animation: ${spin} 0.9s linear infinite;
    color: ${nocturne.green};
  }
  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
`;

const Wait = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: ${({ theme }) => theme.space.sm} 0;
  text-align: center;
`;

const Title = styled.h3`
  ${heading}
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${({ theme }) => theme.type.heading};
  letter-spacing: -0.02em;
  text-align: center;
  color: ${nocturne.cream};
`;

const Sub = styled.p`
  margin: ${({ theme }) => theme.space.sm} 0 0;
  font-size: ${({ theme }) => theme.type.body};
  text-align: center;
  color: ${nocturne.muted};
  font-variant-numeric: tabular-nums;
`;

const Facts = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: ${({ theme }) => theme.space.md};

  span {
    padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${nocturne.surface2};
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 700;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: ${({ theme }) => theme.space.md};
  width: min(300px, 100%);
  margin: ${({ theme }) => theme.space.xxl} 0 0;
  padding: 0;
  list-style: none;
  text-align: left;

  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.md};
    font-size: ${({ theme }) => theme.type.body};
    font-weight: 600;
    color: ${nocturne.cream};
  }
  i {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${nocturne.green};
    color: ${nocturne.onGreen};
    font-size: ${({ theme }) => theme.type.micro};
    font-style: normal;
    font-weight: 800;
  }
`;

const Clock = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space.sm};
  width: min(300px, 100%);
  margin-top: ${({ theme }) => theme.space.xxl};

  span {
    font-size: ${({ theme }) => theme.type.micro};
    font-weight: 700;
    color: ${nocturne.muted};
    font-variant-numeric: tabular-nums;
  }
`;

const Track = styled.div`
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
  background: ${nocturne.surface2};
`;

const Fill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${nocturne.green};
  transform-origin: left center;
  animation: ${drain} ${POLL_MS}ms linear forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Footer */

const Note = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding: ${({ theme }) => theme.space.sm} 0;
  font-size: ${({ theme }) => theme.type.label};
  font-weight: 600;
  text-align: center;
  color: ${nocturne.muted};
`;

const Btn = styled.button<{ $main?: boolean; $full?: boolean }>`
  grid-column: ${({ $full }) => ($full ? "1 / -1" : "auto")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 52px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 2px solid ${({ $main }) => ($main ? "transparent" : nocturne.green)};
  background: ${({ $main }) => ($main ? nocturne.ctaBg : nocturne.surface)};
  color: ${({ $main }) => ($main ? nocturne.ctaFg : nocturne.green)};
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: ${({ theme }) => theme.type.body};
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: transform ${({ theme }) => theme.motion.duration.short2},
    ${({ theme }) => theme.motion.easing.standard};

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
`;

export function PayPanel({
  open,
  bookingId,
  amount,
  subtotal,
  fee,
  feePct,
  seatsLine,
  defaultPhone,
  walletBalance,
  ruleLines,
  onBusy,
  onClose,
  onPaid,
}: {
  open: boolean;
  bookingId: string;
  amount: number;
  subtotal: number;
  fee: number | null;
  feePct: number | null;
  seatsLine: string;
  defaultPhone?: string | null;
  walletBalance: number | null;
  /** The cancellation rule in plain words, shown before the passenger pays. */
  ruleLines?: string[];
  onBusy: (busy: boolean) => void;
  onClose: () => void;
  onPaid: () => void;
}) {
  const walletCovers = walletBalance != null && walletBalance >= amount;

  const [method, setMethod] = useState<Method>(
    walletCovers ? "wallet" : "mpesa",
  );
  const [phone, setPhone] = useState(() =>
    normalizeKeLocal(defaultPhone ?? ""),
  );
  const [touched, setTouched] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const busy = stage === "pushing" || stage === "waiting";
  const valid = isValidKeLocal(phone);
  const phoneBad =
    method === "mpesa" && (touched || phone.length >= 9) && !valid;
  const shownPhone = formatPhone(phone);

  const secsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const left = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")} left`;

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);

  useEffect(() => {
    if (stage !== "waiting") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    setStage("form");
    setError("");
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function choose(next: Method) {
    setMethod(next);
    setError("");
    if (next === "mpesa" && !valid)
      setTimeout(() => phoneRef.current?.focus({ preventScroll: true }), 200);
  }

  async function payFromWallet() {
    setError("");
    setStage("pushing");
    try {
      const result = await payWithWalletAction(bookingId);
      if (result.ok) {
        setStage("done");
        return;
      }
      setError(result.error);
    } catch {
      setError(
        "We couldn't reach your wallet. Check your connection and try again.",
      );
    }
    setStage("form");
  }

  async function payWithMpesa() {
    if (!valid) {
      setTouched(true);
      phoneRef.current?.focus();
      return;
    }
    setError("");
    setStage("pushing");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { payment_id } = await initiatePayment({
        booking_id: bookingId,
        method: "mpesa",
        phone: toDaraja(phone),
      });
      const start = Date.now();
      setNow(start);
      setDeadline(start + POLL_MS);
      setStage("waiting");
      const outcome = await pollPaymentStatus(payment_id, {
        signal: controller.signal,
        timeoutMs: POLL_MS,
      });
      setStage(
        outcome === "completed"
          ? "done"
          : outcome === "failed"
            ? "failed"
            : "timeout",
      );
    } catch {
      if (controller.signal.aborted) return;
      setError(
        "We couldn't reach M-Pesa. Check your connection and try again.",
      );
      setStage("form");
    }
  }

  function pay() {
    if (busy) return;
    if (method === "wallet") void payFromWallet();
    else void payWithMpesa();
  }

  const status: Record<
    StatusStage,
    { art: React.ReactNode; title: string; sub: string }
  > = {
    pushing: {
      art: <CircleNotch size={44} className="spin" />,
      title:
        method === "wallet" ? "Paying from your wallet" : "Sending the request",
      sub:
        method === "wallet"
          ? `Holding ${formatCurrency(amount)} in escrow`
          : `Prompting +254 ${shownPhone}`,
    },
    done: {
      art: <EscrowHeldArt />,
      title: "Paid. Your seat is confirmed",
      sub: `Kipita holds ${formatCurrency(amount)} until you arrive`,
    },
    failed: {
      art: <PaymentFailedArt />,
      title: "Payment didn't go through",
      sub: "Your seat is still held",
    },
    timeout: {
      art: <PaymentWaitingArt />,
      title: "Still waiting on M-Pesa",
      sub: "If you finish on your phone, this updates by itself",
    },
  };

  const walletNote =
    walletBalance == null
      ? "Balance unavailable"
      : walletCovers
        ? `${formatCurrency(walletBalance)} available`
        : `${formatCurrency(walletBalance)} · not enough`;

  // The number lives in the field while M-Pesa is selected, so the row only echoes it when collapsed.
  const mpesaNote =
    method !== "mpesa" && valid ? `+254 ${shownPhone}` : "Prompt to your phone";

  return (
    <>
      <PanelBody>
        {stage === "form" ? (
          <Checkout>
            <Art $compact>
              <PinPromptArt />
            </Art>

            <section aria-labelledby="co-method">
              <h3 id="co-method">Pay with</h3>
              <Options role="radiogroup" aria-labelledby="co-method">
                <Option $on={method === "mpesa"}>
                  <label>
                    <input
                      className="sr"
                      type="radio"
                      name="pay-method"
                      value="mpesa"
                      checked={method === "mpesa"}
                      onChange={() => choose("mpesa")}
                    />
                    <span className="logo">
                      <Image
                        src="/landing/mpesa.png"
                        alt=""
                        width={471}
                        height={174}
                      />
                    </span>
                    <span className="name">
                      <b>M-Pesa</b>
                      <small>{mpesaNote}</small>
                    </span>
                    <span className="dot" aria-hidden />
                  </label>
                  <Collapse open={method === "mpesa"}>
                    <div className="more">
                      <label htmlFor="pay-phone" className="sr">
                        M-Pesa number
                      </label>
                      <PhoneField
                        id="pay-phone"
                        ref={phoneRef}
                        value={phone}
                        onChange={setPhone}
                        invalid={phoneBad}
                      />
                      {phoneBad && (
                        <FieldError>
                          {phone.length === 0
                            ? "Enter your M-Pesa number to pay"
                            : "Nine digits, starting with 7 or 1"}
                        </FieldError>
                      )}
                    </div>
                  </Collapse>
                </Option>

                <Option $on={method === "wallet"} $off={!walletCovers}>
                  <label>
                    <input
                      className="sr"
                      type="radio"
                      name="pay-method"
                      value="wallet"
                      checked={method === "wallet"}
                      disabled={!walletCovers}
                      onChange={() => choose("wallet")}
                    />
                    <span className="logo">
                      <Wallet size={22} />
                    </span>
                    <span className="name">
                      <b>Kipita wallet</b>
                      <small>{walletNote}</small>
                    </span>
                    <span className="dot" aria-hidden />
                  </label>
                </Option>
              </Options>
            </section>

            <section aria-labelledby="co-summary">
              <h3 id="co-summary">Summary</h3>
              <Lines>
                <div>
                  <dt>{seatsLine}</dt>
                  <dd>{formatCurrency(subtotal)}</dd>
                </div>
                {fee != null && (
                  <>
                    <div>
                      <dt>
                        Kipita service fee
                        {feePct != null ? ` (${feePct}%)` : ""}
                      </dt>
                      <dd>{formatCurrency(fee)}</dd>
                    </div>
                    <div className="total">
                      <dt>Total</dt>
                      <dd>{formatCurrency(amount)}</dd>
                    </div>
                  </>
                )}
              </Lines>
              <Safe>
                <ShieldCheck size={18} /> Held in escrow by Kipita until you
                arrive
              </Safe>
              <Consent>Paying opens chat and calls with your driver, and shares your number with them for this ride.</Consent>
              {ruleLines && ruleLines.length > 0 && (
                <Terms aria-label="Cancellation rules">
                  <b>If plans change</b>
                  <ul>
                    {ruleLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </Terms>
              )}
            </section>

            {error && <Err role="alert">{error}</Err>}
          </Checkout>
        ) : stage === "waiting" ? (
          <Wait>
            <Art>
              <PinPromptArt />
            </Art>
            <Title role="status">Check your phone</Title>
            <Facts>
              <span>{formatCurrency(amount)}</span>
              <span>+254 {shownPhone}</span>
            </Facts>
            <Steps>
              <li>
                <i>1</i> Open the M-Pesa pop-up
              </li>
              <li>
                <i>2</i> Enter your M-Pesa PIN
              </li>
              <li>
                <i>3</i> Tap Send
              </li>
            </Steps>
            <Clock aria-live="off">
              <Track>
                <Fill />
              </Track>
              <span>Waiting for M-Pesa · {left}</span>
            </Clock>
          </Wait>
        ) : (
          <Wait>
            <Art>{status[stage].art}</Art>
            <Title role="status">{status[stage].title}</Title>
            <Sub>{status[stage].sub}</Sub>
          </Wait>
        )}
      </PanelBody>

      <PanelFoot>
        {busy ? (
          <Note>
            {method === "wallet"
              ? "Keep this open while we confirm your seat."
              : "Keep this open. Your seat updates the moment M-Pesa confirms."}
          </Note>
        ) : stage === "done" ? (
          <Btn type="button" onClick={onPaid}>
            Back to trip
          </Btn>
        ) : stage === "form" ? (
          <Btn type="button" $main $full onClick={pay}>
            {method === "wallet"
              ? `Pay ${formatCurrency(amount)} from wallet`
              : `Send M-Pesa request · ${formatCurrency(amount)}`}
          </Btn>
        ) : (
          <>
            <Btn type="button" onClick={onClose}>
              Not now
            </Btn>
            <Btn type="button" $main onClick={pay}>
              <DeviceMobile size={18} />
              Resend prompt
            </Btn>
          </>
        )}
      </PanelFoot>
    </>
  );
}
