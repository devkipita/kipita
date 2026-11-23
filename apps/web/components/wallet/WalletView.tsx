"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  formatKes,
  movesBalance,
  txnLabel,
  txnSignedAmount,
  type WalletSummary,
  type WalletTransaction,
  type WalletTxnType,
  type WalletWithdrawal,
} from "@kipita/shared";
import {
  ArrowDown,
  ArrowUpRight,
  Clock,
  Gift,
  HandCoins,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  TrendUp,
  Wallet,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { RollingNumber } from "@/components/ui/Counter";
import { pressable } from "@/components/ui/interactions";
import { dur, nocturne } from "@/lib/nocturne";
import type { AppMode } from "@/lib/home/mode";
import { LedgerArt } from "./LedgerArt";
import { TopUpDrawer } from "./TopUpDrawer";
import { WithdrawDrawer } from "./WithdrawDrawer";

const ROLL_MS = parseInt(dur.max, 10);

const Page = styled(ContentWidth)`
  padding-block: 20px 56px;
  display: grid;
  gap: 28px;
`;

export const WalletTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.3rem, 6vw, 3.4rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.042em;
  color: ${({ theme }) => theme.color.onSurface};
`;

export const Band = styled.div`
  display: grid;
  gap: 14px;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
    align-items: stretch;
  }
`;

const Balance = styled.section`
  container-type: inline-size;
  display: grid;
  gap: 22px;
  align-content: space-between;
  min-width: 0;
  padding: 26px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};

  .cap {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 12px;
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .value {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.28em;
    min-width: 0;
    font-size: clamp(2.2rem, 13cqi, 4.2rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 1.04;
    font-variant-numeric: tabular-nums;
  }

  @media (min-width: 720px) {
    padding: 32px 34px;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const actionBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
`;

const TopUp = styled.button`
  ${actionBase}
  background: ${nocturne.ctaBg};
  color: ${nocturne.ctaFg};
  ${pressable()}
`;

const Withdraw = styled.button`
  ${actionBase}
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  ${pressable()}
`;

export const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
`;

const Tile = styled.div`
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .cap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .value {
    font-size: clamp(1.8rem, 3vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.038em;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .note {
    font-size: 0.88rem;
    line-height: 1.45;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Section = styled.section`
  display: grid;
  gap: 14px;

  > h2 {
    margin: 0;
    font-size: clamp(1.7rem, 3.4vw, 2.3rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Ledger = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .meta {
    margin-top: 3px;
    font-size: 0.88rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Amount = styled.span<{ $tone: "in" | "out" | "held" }>`
  flex: none;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === "in"
      ? theme.color.primary
      : $tone === "out"
        ? theme.color.onSurface
        : theme.color.onSurfaceVariant};
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 44px 20px 48px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  b {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: clamp(1.5rem, 3.2vw, 2rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.035em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  span {
    font-size: 1rem;
  }
`;

const Pending = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.9rem;
  font-weight: 600;
  background: ${({ theme }) => theme.color.tertiaryContainer};
  color: ${({ theme }) => theme.color.onTertiaryContainer};

  svg {
    flex: none;
  }
`;

const TXN_GLYPH: Record<WalletTxnType, KipitaIcon> = {
  topup: Plus,
  payout: TrendUp,
  refund: ArrowDown,
  withdrawal: ArrowUpRight,
  escrow_hold: Lock,
  escrow_release: ShieldCheck,
  fee: Receipt,
  credit: ArrowDown,
  debit: ArrowUpRight,
  referral: Gift,
};

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

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WalletView({
  summary,
  transactions,
  withdrawals,
  mode,
  phone,
  payoutPhone,
}: {
  summary: WalletSummary;
  transactions: WalletTransaction[];
  withdrawals: WalletWithdrawal[];
  mode: AppMode;
  phone?: string | null;
  payoutPhone: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const refresh = useCallback(() => {
    setTopUpOpen(false);
    setWithdrawOpen(false);
    startTransition(() => router.refresh());
  }, [router]);

  const openWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (w) => w.status === "pending" || w.status === "processing",
      ),
    [withdrawals],
  );

  const isDriver = mode === "driver";
  const balance = Math.round(summary.balance);

  return (
    <Page>
      <WalletTitle>Wallet</WalletTitle>

      <Band>
        <Balance aria-labelledby="wallet-balance-cap">
          <div>
            <span className="cap" id="wallet-balance-cap">
              <Wallet size={20} weight="bold" />
              Available balance
            </span>
            <div className="value">
              <span aria-hidden="true">KES</span>
              <BalanceFigure value={balance} />
            </div>
          </div>
          <Actions>
            <TopUp type="button" onClick={() => setTopUpOpen(true)}>
              <Plus size={20} weight="bold" />
              Top up
            </TopUp>
            <Withdraw type="button" onClick={() => setWithdrawOpen(true)}>
              <HandCoins size={20} />
              Withdraw
            </Withdraw>
          </Actions>
        </Balance>

        <Tiles>
          <Tile>
            <span className="cap">
              <Lock size={18} weight="bold" />
              Held in escrow
            </span>
            <span className="value">{formatKes(summary.in_escrow)}</span>
            <span className="note">Held until the ride ends.</span>
          </Tile>
        </Tiles>
      </Band>

      {openWithdrawals.length > 0 && (
        <Pending role="status">
          <Clock size={20} />
          {formatKes(
            openWithdrawals.reduce((total, w) => total + w.amount, 0),
          )}{" "}
          is on its way to M-Pesa.
        </Pending>
      )}

      {(isDriver ||
        summary.pending_earnings > 0 ||
        summary.lifetime_earnings > 0) && (
        <Tiles>
          {(isDriver || summary.pending_earnings > 0) && (
            <Tile>
              <span className="cap">
                <ShieldCheck size={18} weight="bold" />
                Waiting to be released
              </span>
              <span className="value">
                {formatKes(summary.pending_earnings)}
              </span>
              <span className="note">Lands in your balance when you end the ride.</span>
            </Tile>
          )}

          {(isDriver || summary.lifetime_earnings > 0) && (
            <Tile>
              <span className="cap">
                <TrendUp size={18} weight="bold" />
                Earned all time
              </span>
              <span className="value">
                {formatKes(summary.lifetime_earnings)}
              </span>
              <span className="note">After the platform fee.</span>
            </Tile>
          )}
        </Tiles>
      )}

      <Section>
        <h2>Activity</h2>

        {transactions.length === 0 ? (
          <Empty>
            <LedgerArt />
            <b>Nothing here yet</b>
            <span>Top-ups, holds and payouts show up here.</span>
          </Empty>
        ) : (
          <Ledger>
            {transactions.map((txn) => {
              const Glyph = TXN_GLYPH[txn.type] ?? Receipt;
              const tone = !movesBalance(txn.type)
                ? "held"
                : txn.amount < 0
                  ? "out"
                  : "in";
              return (
                <Row key={txn.id}>
                  <span className="glyph">
                    <Glyph size={21} />
                  </span>
                  <span className="copy">
                    <div className="title">{txnLabel(txn.type)}</div>
                    <div className="meta">
                      {formatWhen(txn.created_at)}
                      {txn.description ? ` · ${txn.description}` : ""}
                    </div>
                  </span>
                  <Amount $tone={tone}>{txnSignedAmount(txn)}</Amount>
                </Row>
              );
            })}
          </Ledger>
        )}
      </Section>

      <TopUpDrawer
        open={topUpOpen}
        defaultPhone={phone}
        onClose={() => setTopUpOpen(false)}
        onToppedUp={refresh}
      />
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
