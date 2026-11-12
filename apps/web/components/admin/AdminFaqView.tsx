"use client";

import { FaqManager } from "@/components/admin/FaqManager";
import { PageHeader } from "@/components/admin/console/ui";

export function AdminFaqView() {
  return (
    <>
      <PageHeader
        title="Help centre"
        description="Add, edit and publish the questions shown on the help page. Changes go live immediately."
      />
      <FaqManager />
    </>
  );
}
