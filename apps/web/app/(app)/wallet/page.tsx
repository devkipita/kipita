import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WalletView } from "@/components/wallet/WalletView";
import { getProfile } from "@/lib/auth/session";
import { readMode } from "@/lib/home/mode.server";
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  fetchWithdrawals,
} from "@/lib/wallet/server";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false, follow: false },
};

export default async function WalletPage() {
  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in?next=/wallet");

  const [summary, transactions, withdrawals, mode] = await Promise.all([
    fetchWalletSummary(),
    fetchWalletTransactions(),
    fetchWithdrawals(),
    readMode(),
  ]);

  return (
    <WalletView
      summary={summary}
      transactions={transactions}
      withdrawals={withdrawals}
      mode={mode}
      phone={profile.phone ?? null}
    />
  );
}
