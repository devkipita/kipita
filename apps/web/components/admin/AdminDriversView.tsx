"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { DriverReview } from "@/components/admin/DriverReview";
import { Container, H2, Lead } from "@/components/ui/primitives";

export function AdminDriversView({ name, image }: { name: string; image?: string }) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Driver verification</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Check the licence and ID against the name on the account. Approving
          lets them publish rides and marks the account verified; rejecting asks
          them to resubmit.
        </Lead>
        <DriverReview />
      </Container>
    </>
  );
}
