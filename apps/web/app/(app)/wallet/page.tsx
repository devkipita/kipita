import type { Metadata } from "next";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { WalletView } from "@/components/wallet/WalletView";
import { WalletError } from "@/components/wallet/WalletError";
import { getProfile } from "@/lib/auth/session";
import { readMode } from "@/lib/home/mode.server";
import { isValidKeLocal, normalizeKeLocal } from "@/lib/phone";
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  fetchWithdrawals,
} from "@/lib/wallet/server";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false, follow: false },
};

function verifiedPayoutPhone(
  phone: string | null | undefined,
  verified: boolean,
): string | null {
  if (!verified || !phone) return null;
  const local = normalizeKeLocal(phone);
  return isValidKeLocal(local) ? local : null;
}

async function loadWallet() {
  try {
    const [summary, transactions, withdrawals] = await Promise.all([
      fetchWalletSummary(),
      fetchWalletTransactions(),
      fetchWithdrawals(),
    ]);
    return { ok: true as const, summary, transactions, withdrawals };
  } catch (error) {
    Sentry.captureException(error, { tags: { surface: "wallet" } });
    return { ok: false as const };
  }
}

export default async function WalletPage() {
  const [profile, wallet, mode] = await Promise.all([getProfile(), loadWallet(), readMode()]);
  if (!profile) redirect("/auth/sign-in?next=/wallet");

  if (!wallet.ok) return <WalletError />;

  return (
    <WalletView
      summary={wallet.summary}
      transactions={wallet.transactions}
      withdrawals={wallet.withdrawals}
      mode={mode}
      payoutPhone={verifiedPayoutPhone(profile.phone, profile.phone_verified)}
    />
  );
}
