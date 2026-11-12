"use client";

import { PromotionsManager } from "@/components/admin/PromotionsManager";
import { PageHeader } from "@/components/admin/console/ui";

export function AdminPromotionsView() {
  return (
    <>
      <PageHeader
        title="Promotions"
        description="Gift cards and discounts shown on the home page. Display-only for now: riders see the code, but nothing applies it at checkout yet."
      />
      <PromotionsManager />
    </>
  );
}
