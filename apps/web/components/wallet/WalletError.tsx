"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPage } from "@/components/ui/StatusPage";
import { BreakArt } from "@/components/ui/StatusArt";

export function WalletError() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <StatusPage
      title="We couldn't load your wallet."
      lead="Your balance didn't reach us. Try again in a moment."
      art={<BreakArt />}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
}
