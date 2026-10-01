"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { SupportInbox } from "@/components/admin/SupportInbox";
import { Container, H2, Lead } from "@/components/ui/primitives";
import type { AdminSupportCase } from "@/lib/support/admin";

export function AdminSupportView({
  name,
  image,
  cases,
}: {
  name: string;
  image?: string;
  cases: AdminSupportCase[];
}) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Support</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Answer open cases. Replies appear in the passenger&apos;s support dock
          straight away, even if they closed it.
        </Lead>
        <SupportInbox cases={cases} />
      </Container>
    </>
  );
}
