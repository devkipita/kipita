import { requireAdmin } from "@/lib/auth";
import { AdminBar } from "@/components/admin/AdminBar";
import { RefundReview } from "@/components/admin/RefundReview";
import { Container, H2, Lead } from "@/components/ui/primitives";

export const metadata = { title: "Refund review" };

export default async function AdminRefundsPage() {
  const admin = await requireAdmin();

  return (
    <>
      <AdminBar name={admin.full_name} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Refund requests</H2>
        <Lead style={{ marginBottom: 32, maxWidth: "56ch" }}>
          Approve to refund the passenger&apos;s Kipita wallet, or reject to release
          the fare to the driver.
        </Lead>
        <RefundReview />
      </Container>
    </>
  );
}
