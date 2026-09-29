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
  type WalletWithdrawal,
} from "@kipita/shared";
import {
  ArrowDown,
  ArrowUpRight,
  Clock,
  HandCoins,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  TrendUp,
  Wallet,
} from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { ButtonEl } from "@/components/ui/primitives";
import type { AppMode } from "@/lib/home/mode";
import { TopUpDrawer } from "./TopUpDrawer";
import { WithdrawDrawer } from "./WithdrawDrawer";

const Page = styled(ContentWidth)`
  padding-block: 20px 56px;
  display: grid;
  gap: 28px;
`;

const Header = styled.header`
  display: grid;
  gap: 8px;

  h1 {
    margin: 0;
    font-size: clamp(1.7rem, 3.4vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    font-size: 1rem;
    max-width: 56ch;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Balance = styled.section`
  display: grid;
  gap: 20px;
  padding: 26px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};

  .cap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    font-weight: 700;
    opacity: 0.8;
  }
  .value {
    font-size: clamp(2.3rem, 6vw, 3.1rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
`;

const Tile = styled.div`
  display: grid;
  gap: 6px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .cap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .note {
    font-size: 0.85rem;
    line-height: 1.45;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Section = styled.section`
  display: grid;
  gap: 14px;

  > header h2 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.028em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  > header p {
    margin: 2px 0 0;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Ledger = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.surfaceContainerHigh};
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: 0.96rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .meta {
    margin-top: 2px;
    font-size: 0.83rem;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Amount = styled.span<{ $tone: "in" | "out" | "held" }>`
  flex: none;
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: -0.02em;
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
  gap: 10px;
  padding: 52px 20px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  b {
    font-size: 1.05rem;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    max-width: 40ch;
    font-size: 0.92rem;
    line-height: 1.5;
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

const TXN_GLYPH = {
  topup: Plus,
  payout: TrendUp,
  refund: ArrowDown,
  withdrawal: ArrowUpRight,
  escrow_hold: Lock,
  escrow_release: ShieldCheck,
  fee: Receipt,
  credit: ArrowDown,
  debit: ArrowUpRight,
} as const;

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

      <Balance>
        <div>
          <span className="cap">
            <Wallet size={16} weight="bold" />
            Available balance
          </span>
          <div className="value">{formatKes(summary.balance)}</div>
        </div>
        <Actions>
          <ButtonEl type="button" $compact onClick={() => setTopUpOpen(true)}>
            <Plus size={18} />
            Top up
          </ButtonEl>
          <ButtonEl
            type="button"
            $variant="ghost"
            $compact
            onClick={() => setWithdrawOpen(true)}
          >
            <HandCoins size={18} />
            Withdraw
          </ButtonEl>
        </Actions>
      </Balance>

      {openWithdrawals.length > 0 && (
        <Pending>
          <Clock size={18} />
          {formatKes(
            openWithdrawals.reduce((total, w) => total + w.amount, 0),
          )}{" "}
          is on its way to M-Pesa.
        </Pending>
      )}

      <Tiles>
        <Tile>
          <span className="cap">
            <Lock size={15} weight="bold" />
            Held in escrow
          </span>
          <span className="value">{formatKes(summary.in_escrow)}</span>
          <span className="note">
            Fares you&apos;ve paid for rides that haven&apos;t finished. Kipita
            holds this and releases it to your driver when the trip ends.
          </span>
        </Tile>

        {(isDriver || summary.pending_earnings > 0) && (
          <Tile>
            <span className="cap">
              <ShieldCheck size={15} weight="bold" />
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
              <TrendUp size={15} weight="bold" />
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

      <Section>
        <header>
          <h2>Activity</h2>
          <p>Every credit, hold and payout on your account.</p>
        </header>

        {transactions.length === 0 ? (
          <Empty>
            <Receipt size={30} />
            <b>Nothing here yet</b>
            <p>
              Top up your wallet or book a ride — holds, refunds and payouts all
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
                    <Glyph size={18} />
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
