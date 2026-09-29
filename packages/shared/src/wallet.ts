import { formatKes } from "./escrow";

export type WalletTxnType =
  | "credit"
  | "debit"
  | "refund"
  | "payout"
  | "topup"
  | "fee"
  | "escrow_hold"
  | "escrow_release"
  | "withdrawal";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export interface WalletSummary {
  balance: number;
  currency: string;
  in_escrow: number;
  pending_earnings: number;
  lifetime_earnings: number;
  lifetime_topups: number;
  pending_withdrawals: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: WalletTxnType;
  reference: string | null;
  description: string | null;
  balance_after: number | null;
  booking_id: string | null;
  created_at: string;
}

export interface WalletWithdrawal {
  id: string;
  amount: number;
  phone: string;
  status: WithdrawalStatus;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export const EMPTY_WALLET_SUMMARY: WalletSummary = {
  balance: 0,
  currency: "KES",
  in_escrow: 0,
  pending_earnings: 0,
  lifetime_earnings: 0,
  lifetime_topups: 0,
  pending_withdrawals: 0,
};

export const MIN_TOPUP = 10;
export const MAX_TOPUP = 150_000;
export const MIN_WITHDRAWAL = 100;

const HELD_TYPES: WalletTxnType[] = ["escrow_hold", "escrow_release"];

export function movesBalance(type: WalletTxnType): boolean {
  return !HELD_TYPES.includes(type);
}

export function txnLabel(type: WalletTxnType): string {
  switch (type) {
    case "topup":
      return "Top-up";
    case "payout":
      return "Ride earning";
    case "refund":
      return "Refund";
    case "withdrawal":
      return "Withdrawal";
    case "escrow_hold":
      return "Held in escrow";
    case "escrow_release":
      return "Released to driver";
    case "fee":
      return "Kipita fee";
    case "debit":
      return "Payment";
    default:
      return "Credit";
  }
}

export function txnSignedAmount(txn: WalletTransaction): string {
  if (!movesBalance(txn.type)) return formatKes(Math.abs(txn.amount));
  const sign = txn.amount < 0 ? "−" : "+";
  return `${sign}${formatKes(Math.abs(txn.amount))}`;
}

export function isValidTopupAmount(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_TOPUP && value <= MAX_TOPUP;
}

export function canWithdraw(summary: WalletSummary, amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    amount >= MIN_WITHDRAWAL &&
    amount <= summary.balance
  );
}
