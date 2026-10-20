"use client";

import { useCallback, useMemo, useState } from "react";
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
import { ButtonEl } from "@/components/ui/primitives";
import { nocturne } from "@/lib/nocturne";
import { dur, ease } from "@/lib/motion";
import type { AppMode } from "@/lib/home/mode";
import { LedgerArt } from "./LedgerArt";
import { TopUpDrawer } from "./TopUpDrawer";
import { WithdrawDrawer } from "./WithdrawDrawer";

const Page = styled(ContentWidth)`
  padding-block: 20px 56px;
  display: grid;
  gap: 28px;
`;

const Header = styled.header`
  display: grid;
  gap: 10px;

  h1 {
    margin: 0;
    font-size: clamp(2.3rem, 6vw, 3.4rem);
    font-weight: 800;
    line-height: 1.02;
    letter-spacing: -0.042em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    font-size: clamp(1rem, 1.6vw, 1.12rem);
    line-height: 1.6;
    max-width: 52ch;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Band = styled.div`
  display: grid;
  gap: 14px;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
    align-items: stretch;
  }
`;

const Balance = styled.section`
  display: grid;
  gap: 22px;
  align-items: center;
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
    opacity: 0.82;
  }
  .value {
    font-size: clamp(2.9rem, 7vw, 4.2rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 0.96;
    font-variant-numeric: tabular-nums;
  }

  @media (min-width: 720px) {
    grid-template-columns: 1fr auto;
    padding: 32px 34px;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  > button {
    padding-inline: 20px;
    font-size: 1rem;
    transition:
      background ${dur.short4}ms ${ease.standard},
      border-color ${dur.short4}ms ${ease.standard},
      transform ${dur.short3}ms ${ease.emphasized},
      box-shadow ${dur.medium2}ms ${ease.emphasizedDecelerate};
  }

  @media (hover: hover) {
    > button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -12px rgba(0, 33, 19, 0.6);
    }
  }
  > button:active:not(:disabled) {
    transform: scale(0.97);
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition:
        background ${dur.short4}ms ${ease.standard},
        color ${dur.short4}ms ${ease.standard},
        border-color ${dur.short4}ms ${ease.standard};
    }
    > button:hover:not(:disabled),
    > button:active:not(:disabled) {
      transform: none;
    }
  }
`;

const TopUp = styled(ButtonEl)`
  @media (hover: hover) {
    &&:hover:not(:disabled) {
      background: ${nocturne.lime};
      color: ${nocturne.greenDeep};
    }
    &&:hover:not(:disabled) svg {
      color: ${nocturne.greenDeep};
    }
  }
  &&:active:not(:disabled) {
    background: ${nocturne.greenDeep};
    color: ${nocturne.lime};
  }
`;

const Withdraw = styled(ButtonEl)`
  @media (hover: hover) {
    &&:hover:not(:disabled) {
      background: ${nocturne.greenDeep};
      border-color: ${nocturne.greenDeep};
      color: ${nocturne.lime};
    }
  }
  &&:active:not(:disabled) {
    background: ${nocturne.green};
    border-color: ${nocturne.green};
    color: ${nocturne.lime};
  }
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
`;

const Tile = styled.div`
  display: grid;
  align-content: start;
  gap: 8px;
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
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .note {
    max-width: 40ch;
    font-size: 0.88rem;
    line-height: 1.55;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Section = styled.section`
  display: grid;
  gap: 14px;

  > header h2 {
    margin: 0;
    font-size: clamp(1.7rem, 3.4vw, 2.3rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  > header p {
    margin: 4px 0 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
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
  p {
    margin: 0;
    max-width: 42ch;
    font-size: 1rem;
    line-height: 1.6;
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
}: {
  summary: WalletSummary;
  transactions: WalletTransaction[];
  withdrawals: WalletWithdrawal[];
  mode: AppMode;
  phone?: string | null;
}) {
  const router = useRouter();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const refresh = useCallback(() => {
    setTopUpOpen(false);
    setWithdrawOpen(false);
    router.refresh();
  }, [router]);

  const openWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (w) => w.status === "pending" || w.status === "processing",
      ),
    [withdrawals],
  );

  const isDriver = mode === "driver";

  return (
    <Page>
      <Header>
        <h1>Wallet</h1>
        <p>
          {isDriver
            ? "What you've earned, what's still held in escrow, and every payout Kipita has made to you."
            : "Your Kipita balance, the fares we're holding in escrow for you, and every movement in between."}
        </p>
      </Header>

      <Band>
      <Balance>
        <div>
          <span className="cap">
            <Wallet size={20} weight="bold" />
            Available balance
          </span>
          <div className="value">{formatKes(summary.balance)}</div>
        </div>
        <Actions>
          <TopUp type="button" $compact onClick={() => setTopUpOpen(true)}>
            <Plus size={20} />
            Top up
          </TopUp>
          <Withdraw
            type="button"
            $variant="onContainer"
            $compact
            onClick={() => setWithdrawOpen(true)}
          >
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
          <span className="note">
            Fares you&apos;ve paid for rides that haven&apos;t finished. Kipita
            holds this and releases it to your driver when the trip ends.
          </span>
        </Tile>
      </Tiles>
      </Band>

      {openWithdrawals.length > 0 && (
        <Pending>
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
            <span className="note">
              Your share of fares passengers have already paid. It lands in your
              balance once you end each ride.
            </span>
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
            <span className="note">
              Everything Kipita has released to you, after the platform fee.
            </span>
          </Tile>
        )}
      </Tiles>
      )}

      <Section>
        <header>
          <h2>Activity</h2>
          <p>Every credit, hold and payout on your account.</p>
        </header>

        {transactions.length === 0 ? (
          <Empty>
            <LedgerArt />
            <b>Nothing here yet</b>
            <p>
              Top up your wallet or book a ride. Holds, refunds and payouts all
              show up here.
            </p>
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
        defaultPhone={phone}
        onClose={() => setWithdrawOpen(false)}
        onWithdrawn={refresh}
      />
    </Page>
  );
}
