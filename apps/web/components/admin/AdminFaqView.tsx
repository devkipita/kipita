"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { FaqManager } from "@/components/admin/FaqManager";
import { Container, H2, Lead } from "@/components/ui/primitives";

export function AdminFaqView({ name, image }: { name: string; image?: string }) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Help FAQ</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Add, edit, and publish the questions shown on the{" "}
          <a href="/help#faq" style={{ fontWeight: 700 }}>
            help page
          </a>
          . Changes go live immediately.
        </Lead>
        <FaqManager />
      </Container>
    </>
  );
}
