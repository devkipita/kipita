import { SITE } from "@/lib/site";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: 1 August 2026</p>

      <p>
        By using {SITE.name}, you agree to these terms. {SITE.name} is a platform
        that connects drivers offering seats with passengers travelling the same
        way. We are not a transport carrier; drivers are independent.
      </p>

      <h2>Accounts</h2>
      <p>
        You must provide accurate information and keep your account secure. Drivers
        must complete verification (KYC) before offering rides.
      </p>

      <h2>Bookings &amp; payments</h2>
      <ul>
        <li>Passengers pay the fare through {SITE.name} via M-Pesa.</li>
        <li>{SITE.name} holds the fare in escrow and releases it to the driver once the ride ends, minus a platform fee.</li>
        <li>Cancellations of paid trips are handled under our <a href="/legal/refunds">Refund Policy</a>.</li>
      </ul>

      <h2>Conduct</h2>
      <p>
        Treat other members with respect. Unsafe driving, harassment, fraud, or
        misuse of the platform may lead to suspension or removal.
      </p>

      <h2>Liability</h2>
      <p>
        {SITE.name} provides the platform "as is" and facilitates connections and
        payments. To the extent permitted by law, {SITE.name} is not liable for the
        conduct of drivers or passengers during a trip.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after changes means you accept the
        updated terms. Questions?{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </>
  );
}
