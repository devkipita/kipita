import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: 1 August 2026</p>

      <p>
        This policy explains what {SITE.name} collects, why, and the choices you
        have. It applies to the {SITE.name} mobile app and this website.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account:</strong> name, phone number, email, and profile photo.</li>
        <li><strong>Verification:</strong> for drivers, national ID and licence details submitted for KYC.</li>
        <li><strong>Trips &amp; payments:</strong> routes, bookings, and M-Pesa payment records (we never store your M-Pesa PIN).</li>
        <li><strong>Usage:</strong> device information and in-app activity used to keep the service secure and reliable.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To match riders and drivers and operate trips.</li>
        <li>To process payments and hold ride fares in escrow until a trip completes.</li>
        <li>To keep the community safe — verification, ratings, and fraud prevention.</li>
        <li>To provide support and send you trip and account notifications.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share the minimum necessary with the other party on a trip (e.g. name,
        rating, and vehicle details) and with payment providers such as Safaricom
        (M-Pesa) to process transactions. We do not sell your personal data.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, correct, or delete your account data at any time from the
        app, or by emailing{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. We retain
        transaction records where required by law.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach us at{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </>
  );
}
