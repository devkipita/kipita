"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { PromotionsManager } from "@/components/admin/PromotionsManager";
import { Container, H2, Lead } from "@/components/ui/primitives";

export function AdminPromotionsView({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Offers</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Gift cards and discounts shown on the{" "}
          <a href="/home" style={{ fontWeight: 700 }}>
            home page
          </a>
          . Offers are display-only for now — riders see the code, but nothing
          applies it at checkout yet.
        </Lead>
        <PromotionsManager />
      </Container>
    </>
  );
}
