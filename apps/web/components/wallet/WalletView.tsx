"use client";

import { Fragment, useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  formatKes,
  movesBalance,
  txnLabel,
  txnSignedAmount,
  type WalletSummary,
  type WalletTransaction,
  type WalletWithdrawal,
} from "@kipita/shared";
import { ArrowDownLeft, ArrowUpRight, Clock, HandCoins, Lock, ShieldCheck, TrendUp, Wallet } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { RollingNumber } from "@/components/ui/Counter";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { AppMode } from "@/lib/home/mode";
import { LedgerArt } from "./LedgerArt";
import { WithdrawDrawer } from "./WithdrawDrawer";

const ROLL_MS = parseInt(dur.max, 10);

type Flow = "in" | "out" | "held";
type Filter = "all" | Flow;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "Money in" },
  { key: "out", label: "Money out" },
  { key: "held", label: "Held" },
];

const Page = styled(ContentWidth)`
  padding-block: 24px 64px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
`;

export const WalletTitle = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: ${nocturne.cream};
`;

const Top = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
    align-items: stretch;
  }
`;

const Hero = styled.section`
  position: relative;
  container-type: inline-size;
  display: grid;
  gap: 24px;
  align-content: space-between;
  min-width: 0;
  overflow: hidden;
  padding: 28px;
  border-radius: 28px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  .road {
    position: absolute;
    right: -24px;
    bottom: -12px;
    width: 64%;
    max-width: 440px;
    pointer-events: none;
  }
  .road path {
    fill: none;
    stroke: ${nocturne.lime};
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 14 12;
    opacity: 0.28;
  }
  > :not(.road) {
    position: relative;
  }

  .cap {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 700;
    color: ${nocturne.onGreenMuted};
  }
  .well {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: color-mix(in oklab, ${nocturne.onGreen} 12%, transparent);
    color: ${nocturne.lime};
  }
  .value {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: 16px;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-variant-numeric: tabular-nums;
  }
  .value .cur {
    font-size: clamp(20px, 5cqi, 28px);
    font-weight: 800;
    color: ${nocturne.lime};
  }
  .value .num {
    font-size: clamp(44px, 14cqi, 76px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.045em;
  }

  @media (min-width: 720px) {
    padding: 32px 36px;
  }
`;

const Split = styled.div`
  display: grid;
  gap: 12px;

  .bar {
    display: flex;
    gap: 4px;
    height: 10px;
  }
  .bar span {
    min-width: 6px;
    border-radius: 999px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: ${nocturne.onGreenMuted};
  }
  .legend b {
    font-weight: 800;
    color: ${nocturne.onGreen};
    font-variant-numeric: tabular-nums;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .avail {
    background: ${nocturne.lime};
  }
  .held {
    background: ${({ theme }) => theme.tone.amber.bg};
  }
  .wait {
    background: ${({ theme }) => theme.tone.blue.bg};
  }
`;

const Seg = styled.span.attrs<{ $grow: number }>(({ $grow }) => ({
  style: { flexGrow: $grow },
}))`
  flex-basis: 0;
`;

const Withdraw = styled.button`
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 8px;
  min-height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition:
    box-shadow ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      box-shadow: inset 0 0 0 100vmax color-mix(in oklab, ${nocturne.ink} 10%, transparent);
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.lime};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Stack = styled.div`
  display: grid;
  gap: 12px;

  @media (min-width: 600px) and (max-width: 959px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
`;

const Stat = styled.div<{ $tone: "amber" | "blue" | "green" }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 4px 16px;
  min-width: 0;
  padding: 20px;
  border-radius: 24px;
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};

  .icon {
    grid-row: span 3;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: color-mix(in oklab, currentColor 12%, transparent);
  }
  .cap {
    font-size: 14px;
    font-weight: 700;
  }
  .value {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 28px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .note {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.82;
  }
`;

const Pending = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  background: ${({ theme }) => theme.tone.blue.bg};
  color: ${({ theme }) => theme.tone.blue.on};

  svg {
    flex: none;
  }
`;

const Section = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 16px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(28px, 3.4vw, 36px);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: ${nocturne.cream};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $on: boolean }>`
  position: relative;
  min-height: 32px;
  padding: 4px 12px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme, $on }) => ($on ? nocturne.greenDeep : theme.color.surfaceContainerHigh)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  @media (pointer: coarse) {
    &::after {
      content: "";
      position: absolute;
      inset: -6px 0;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ theme, $on }) =>
        $on ? nocturne.greenDeep : `color-mix(in oklab, ${theme.color.surfaceContainerHigh} 88%, ${nocturne.cream})`};
    }
  }
  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

const Ledger = styled.div`
  display: grid;
  overflow: hidden;
  border-radius: 24px;
  background: ${nocturne.surface};
`;

const Day = styled.h3`
  margin: 0;
  padding: 16px 20px 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${nocturne.muted};

  &:not(:first-child) {
    box-shadow: inset 0 1px 0 ${nocturne.line};
  }
`;

const Rows = styled.ul`
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;
`;

const Row = styled.li<{ $flow: Flow }>`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  transition: background-color ${dur.state} ${ease.standard};

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainerLow};
    }
  }

  .arrow {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme, $flow }) =>
      $flow === "in" ? theme.color.successContainer : $flow === "out" ? theme.tone.amber.bg : theme.color.surfaceContainerHigh};
    color: ${({ theme, $flow }) =>
      $flow === "in" ? theme.color.onSuccessContainer : $flow === "out" ? theme.tone.amber.on : nocturne.muted};
  }
  .copy {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-size: 16px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  .meta {
    overflow: hidden;
    font-size: 14px;
    color: ${nocturne.muted};
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .amount {
    flex: none;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme, $flow }) =>
      $flow === "in" ? theme.color.success : $flow === "out" ? nocturne.cream : nocturne.muted};
  }
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 48px 20px;
  text-align: center;
  border-radius: 24px;
  background: ${nocturne.surface};
  color: ${nocturne.muted};

  b {
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(24px, 3.2vw, 32px);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.035em;
    color: ${nocturne.cream};
  }
  span {
    font-size: 16px;
  }
`;

const Figure = styled.span`
  display: inline-grid;
  min-width: 0;

  > * {
    grid-area: 1 / 1;
    align-self: center;
  }
  > [data-hidden="true"] {
    visibility: hidden;
  }
`;

function BalanceFigure({ value }: { value: number }) {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);
  if (!changed && value !== initial) setChanged(true);

  return (
    <Figure>
      <span data-hidden={changed} aria-hidden={changed}>
        {initial.toLocaleString("en-KE")}
      </span>
      <span data-hidden={!changed} aria-hidden={!changed}>
        <RollingNumber value={value} duration={ROLL_MS} ariaLabel={formatKes(value)} />
      </span>
    </Figure>
  );
}

function flowOf(txn: WalletTransaction): Flow {
  if (!movesBalance(txn.type)) return "held";
  return txn.amount < 0 ? "out" : "in";
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === new Date(today.getTime() - 86_400_000).toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

function clock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
}

export function WalletView({
  summary,
  transactions,
  withdrawals,
  mode,
  payoutPhone,
}: {
  summary: WalletSummary;
  transactions: WalletTransaction[];
  withdrawals: WalletWithdrawal[];
  mode: AppMode;
  payoutPhone: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(() => {
    setWithdrawOpen(false);
    startTransition(() => router.refresh());
  }, [router]);

  const openWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.status === "pending" || w.status === "processing"),
    [withdrawals],
  );

  const isDriver = mode === "driver";
  const balance = Math.round(summary.balance);
  const held = Math.round(summary.in_escrow);
  const waiting = Math.round(summary.pending_earnings);
  const total = balance + held + waiting;
  const showWaiting = isDriver || waiting > 0;
  const showEarned = isDriver || summary.lifetime_earnings > 0;

  const days = useMemo(() => {
    const shown = filter === "all" ? transactions : transactions.filter((t) => flowOf(t) === filter);
    const groups: { key: string; label: string; items: WalletTransaction[] }[] = [];
    for (const t of shown) {
      const key = dayKey(t.created_at);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(t);
      else groups.push({ key, label: dayLabel(t.created_at), items: [t] });
    }
    return groups;
  }, [transactions, filter]);

  return (
    <Page>
      <WalletTitle data-bar-title="">Wallet</WalletTitle>

      <Top>
        <Hero aria-labelledby="wallet-balance-cap">
          <svg className="road" viewBox="0 0 440 200" aria-hidden="true" focusable="false">
            <path d="M8 196 C 120 150, 150 60, 260 72 S 400 30, 436 6" />
          </svg>
          <div>
            <span className="cap" id="wallet-balance-cap">
              <span className="well" aria-hidden>
                <Wallet size={20} weight="fill" />
              </span>
              Available balance
            </span>
            <div className="value">
              <span className="cur" aria-hidden="true">
                KES
              </span>
              <span className="num">
                <BalanceFigure value={balance} />
              </span>
            </div>
          </div>

          {total > 0 ? (
            <Split>
              <div className="bar" aria-hidden>
                {balance > 0 ? <Seg className="avail" $grow={balance} /> : null}
                {held > 0 ? <Seg className="held" $grow={held} /> : null}
                {waiting > 0 ? <Seg className="wait" $grow={waiting} /> : null}
              </div>
              <ul className="legend">
                <li>
                  <span className="dot avail" aria-hidden />
                  Available <b>{formatKes(balance)}</b>
                </li>
                <li>
                  <span className="dot held" aria-hidden />
                  Held <b>{formatKes(held)}</b>
                </li>
                {showWaiting ? (
                  <li>
                    <span className="dot wait" aria-hidden />
                    Waiting <b>{formatKes(waiting)}</b>
                  </li>
                ) : null}
              </ul>
            </Split>
          ) : null}

          <Withdraw type="button" onClick={() => setWithdrawOpen(true)}>
            <HandCoins size={20} />
            Withdraw to M-Pesa
          </Withdraw>
        </Hero>

        <Stack>
          <Stat $tone="amber">
            <span className="icon" aria-hidden>
              <Lock size={24} weight="fill" />
            </span>
            <span className="cap">Held in escrow</span>
            <span className="value">{formatKes(held)}</span>
            <span className="note">Held until the ride ends</span>
          </Stat>
          {showWaiting ? (
            <Stat $tone="blue">
              <span className="icon" aria-hidden>
                <ShieldCheck size={24} weight="fill" />
              </span>
              <span className="cap">Waiting to be released</span>
              <span className="value">{formatKes(waiting)}</span>
              <span className="note">Paid in when the ride ends</span>
            </Stat>
          ) : null}
          {showEarned ? (
            <Stat $tone="green">
              <span className="icon" aria-hidden>
                <TrendUp size={24} />
              </span>
              <span className="cap">Earned all time</span>
              <span className="value">{formatKes(summary.lifetime_earnings)}</span>
              <span className="note">After the Kipita fee</span>
            </Stat>
          ) : null}
        </Stack>
      </Top>

      {openWithdrawals.length > 0 && (
        <Pending role="status">
          <Clock size={20} />
          {formatKes(openWithdrawals.reduce((sum, w) => sum + w.amount, 0))} is on its way to M-Pesa.
        </Pending>
      )}

      <Section aria-labelledby="wallet-activity">
        <div className="head">
          <h2 id="wallet-activity">Activity</h2>
          {transactions.length > 0 ? (
            <Chips role="radiogroup" aria-label="Show activity">
              {FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={filter === f.key}
                  $on={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Chip>
              ))}
            </Chips>
          ) : null}
        </div>

        {transactions.length === 0 ? (
          <Empty>
            <LedgerArt />
            <b>Nothing here yet</b>
            <span>Holds, refunds and payouts show up here.</span>
          </Empty>
        ) : days.length === 0 ? (
          <Empty>
            <b>Nothing to show</b>
            <span>No activity matches this filter.</span>
          </Empty>
        ) : (
          <Ledger>
            {days.map((group) => (
              <Fragment key={group.key}>
                <Day>{group.label}</Day>
                <Rows>
                  {group.items.map((txn) => {
                    const flow = flowOf(txn);
                    return (
                      <Row key={txn.id} $flow={flow}>
                        <span className="arrow" aria-hidden>
                          {flow === "in" ? (
                            <ArrowDownLeft size={20} weight="bold" />
                          ) : flow === "out" ? (
                            <ArrowUpRight size={20} weight="bold" />
                          ) : (
                            <Lock size={20} />
                          )}
                        </span>
                        <span className="copy">
                          <span className="title">{txnLabel(txn.type)}</span>
                          <span className="meta">
                            {clock(txn.created_at)}
                            {txn.description ? ` · ${txn.description}` : ""}
                          </span>
                        </span>
                        <span className="amount">{txnSignedAmount(txn)}</span>
                      </Row>
                    );
                  })}
                </Rows>
              </Fragment>
            ))}
          </Ledger>
        )}
      </Section>

      <WithdrawDrawer
        open={withdrawOpen}
        summary={summary}
        payoutPhone={payoutPhone}
        onClose={() => setWithdrawOpen(false)}
        onWithdrawn={refresh}
      />
    </Page>
  );
}
