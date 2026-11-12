"use client";

import { SupportInbox } from "@/components/admin/SupportInbox";
import { PageHeader } from "@/components/admin/console/ui";
import type { AdminSupportCase } from "@/lib/support/admin";

export function AdminSupportView({ cases }: { cases: AdminSupportCase[] }) {
  return (
    <>
      <PageHeader
        title="Support"
        description="Answer open cases. Replies appear in the passenger's support dock straight away, even if they closed it."
      />
      <SupportInbox cases={cases} />
    </>
  );
}
