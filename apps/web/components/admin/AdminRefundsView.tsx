"use client";

import { RefundReview } from "@/components/admin/RefundReview";
import { PageHeader } from "@/components/admin/console/ui";

export function AdminRefundsView() {
  return (
    <>
      <PageHeader
        title="Refund requests"
        description="Approve to refund the passenger's Kipita wallet, or reject to release the fare to the driver."
      />
      <RefundReview />
    </>
  );
}
