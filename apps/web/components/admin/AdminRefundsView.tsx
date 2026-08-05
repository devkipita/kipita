"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { RefundReview } from "@/components/admin/RefundReview";
import { Container, H2, Lead } from "@/components/ui/primitives";

export function AdminRefundsView({ name, image }: { name: string, image?: string }) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Refund requests</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Approve to refund the passenger&apos;s Kipita wallet, or reject to
          release the fare to the driver.
        </Lead>
        <RefundReview />
      </Container>
    </>
  );
}
