import { SITE } from "@/lib/site";
import { KIPITA_FEE_PERCENT } from "@kipita/shared";

export const metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="updated">Last updated: 1 August 2026</p>

      <p>
        {SITE.name} holds your ride fare in escrow — we keep it safe and only pay
        the driver once your trip is complete. This makes refunds simple and fair.
      </p>

      <h2>How your money is held</h2>
      <p>
        When you pay for a ride via M-Pesa, the fare is held by {SITE.name} (not the
        driver). When the ride ends, we release the fare to the driver, minus a{" "}
        {KIPITA_FEE_PERCENT}% platform fee.
      </p>

      <h2>Cancelling a paid trip</h2>
      <ul>
        <li>If you cancel a paid trip before it ends, a refund request is opened automatically.</li>
        <li>Our team reviews each request to keep things fair to both riders and drivers.</li>
        <li><strong>Approved:</strong> the full fare is returned to your {SITE.name} wallet.</li>
        <li><strong>Declined:</strong> where a driver has honoured their commitment (for example a genuine no-show), the fare may be released to the driver instead.</li>
      </ul>

      <h2>How long it takes</h2>
      <p>
        Most refund requests are reviewed within a few business days. You'll get a
        notification as soon as a decision is made.
      </p>

      <h2>Need help?</h2>
      <p>
        Contact us at{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> and include
        your booking reference.
      </p>
    </>
  );
}
