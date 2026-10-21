import { SITE } from "@/lib/site";
import { KIPITA_FEE_PERCENT } from "@kipita/shared";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { FaqArt } from "@/components/legal/LegalArt";
import { Callout, Faq, Lead, Section } from "@/components/legal/LegalPieces";
import { Lifebuoy } from "@/components/icons";

export const metadata = createPageMetadata(
  "Privacy & Terms FAQ",
  "Plain answers about Kipita data, location sharing, escrow payments, refunds, account deletion, and safety.",
  "/legal/faq",
);

const SECTIONS = [
  { id: "data", label: "Your data" },
  { id: "location", label: "Location" },
  { id: "money", label: "Payments and refunds" },
  { id: "account", label: "Accounts and deletion" },
  { id: "safety", label: "Safety" },
  { id: "help", label: "Still stuck?" },
] as const;

export default function LegalFaqPage() {
  return (
    <LegalDoc eyebrow="Privacy & Terms FAQ" sections={SECTIONS} art={<FaqArt />}>
      <h1>Short answers to the questions people actually ask.</h1>
      <Lead>
        Each answer links to the policy it comes from, so you can read the
        detail when you want it.
      </Lead>

      <Section id="data" title="Your data">
        <Faq question={`Does ${SITE.name} sell my personal data?`}>
          <p>
            No. We do not sell personal data and we do not share it with
            advertisers or data brokers. See{" "}
            <a href="/legal/privacy#sharing">Sharing your information</a>.
          </p>
        </Faq>
        <Faq question="What can other members see about me?">
          <p>
            Your first name, profile photo, rating, verification badges, and for
            drivers the vehicle details. Your phone number is shared only after
            a booking is confirmed, so you can coordinate the pick-up.
          </p>
        </Faq>
        <Faq question={`Does ${SITE.name} read my trip messages?`}>
          <p>
            Not routinely. Messages are stored so a trip can be reconstructed if
            there is a dispute, a refund request, or a safety report, and a
            reviewer reads them only in those cases.
          </p>
        </Faq>
        <Faq question="Can I get a copy of everything you hold?">
          <p>
            Yes. Email{" "}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from
            your account address and we send a machine-readable export within 30
            days. See{" "}
            <a href="/legal/privacy#exporting">Exporting and deleting</a>.
          </p>
        </Faq>
      </Section>

      <Section id="location" title="Location">
        <Faq question={`Does ${SITE.name} track me when I am not using it?`}>
          <p>
            No. Live location is shared during a trip you are on, and stops when
            that trip ends. Outside a trip we use approximate location only to
            suggest nearby pick-up points, and only with permission.
          </p>
        </Faq>
        <Faq question="Can I use the app with location turned off?">
          <p>
            Yes. Type the road, town, or landmark instead. Nearby search and
            live arrival will not work, but booking and publishing do.
          </p>
        </Faq>
      </Section>

      <Section id="money" title="Payments and refunds">
        <Faq question="Where is my money between paying and travelling?">
          <p>
            With {SITE.name}, in escrow. The driver cannot touch it until the
            trip is complete. See the{" "}
            <a href="/legal/refunds#escrow">Refund Policy</a>.
          </p>
        </Faq>
        <Faq question={`What does ${SITE.name} charge?`}>
          <p>
            A {KIPITA_FEE_PERCENT}% platform fee, taken from the driver&apos;s
            release when a trip completes. Safaricom&apos;s own mobile money
            charges are separate and set by Safaricom.
          </p>
        </Faq>
        <Faq question="The driver never showed up. What now?">
          <p>
            You get the full fare back. Cancel from the trip screen and the
            refund request opens automatically. See{" "}
            <a href="/legal/refunds#no-show">No-shows</a>.
          </p>
        </Faq>
        <Faq question="Can a driver ask me to pay in cash instead?">
          <p>
            No, and you should decline. Paying outside the app removes escrow
            protection and your refund rights, and it breaches our{" "}
            <a href="/legal/terms#drivers">Terms of Service</a>.
          </p>
        </Faq>
        <Faq question="Do you store my M-Pesa PIN?">
          <p>
            Never. You enter it in Safaricom&apos;s own prompt on your handset.
            Anyone asking you for that PIN is not {SITE.name}.
          </p>
        </Faq>
      </Section>

      <Section id="account" title="Accounts and deletion">
        <Faq question="How do I delete my account?">
          <p>
            From your profile in the app. Deletion removes your profile and
            hides your content. Payment records are kept where the law requires.
          </p>
        </Faq>
        <Faq question="Why was my deletion blocked?">
          <p>
            Something is still open: a booking, a fare in escrow, a pending
            refund, or a wallet balance. Settle or withdraw, then delete.
          </p>
        </Faq>
        <Faq question="Can I have two accounts?">
          <p>
            No. One person, one account. A second account can be closed under
            the <a href="/legal/terms#accounts">Terms of Service</a>.
          </p>
        </Faq>
      </Section>

      <Section id="safety" title="Safety">
        <Faq question={`Does ${SITE.name} insure my trip?`}>
          <p>
            No. Drivers hold their own cover and are responsible for it being
            valid for the journey and the passengers. See{" "}
            <a href="/legal/terms#safety">Safety, insurance, and the law</a>.
          </p>
        </Faq>
        <Faq question="The car does not match the listing. What should I do?">
          <p>
            Do not travel. Report it from the trip screen at the time, and a
            full refund follows.
          </p>
        </Faq>
        <Faq question="How do I report a member?">
          <p>
            Every trip has a report option, and you can email{" "}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. In
            an emergency contact the police first, then tell us.
          </p>
        </Faq>
      </Section>

      <Section id="help" title="Still stuck?">
        <Callout
          icon={<Lifebuoy size={24} />}
          title="Talk to a person"
          href="/help"
          action="Go to Help"
        >
          Support answers account, trip, and payment questions, and can look up
          the record of any trip on your account.
        </Callout>
      </Section>
    </LegalDoc>
  );
}
