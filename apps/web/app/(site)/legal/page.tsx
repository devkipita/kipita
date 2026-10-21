import { SITE } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { OverviewArt } from "@/components/legal/LegalArt";
import {
  Callout,
  CardGrid,
  Lead,
  Note,
  Point,
  Section,
} from "@/components/legal/LegalPieces";
import {
  Cookie,
  HandCoins,
  Lock,
  MapPin,
  Scroll,
  ShieldCheck,
  UserCircle,
  Wallet,
} from "@/components/icons";

export const metadata = createPageMetadata(
  "Privacy & Terms",
  "An overview of how Kipita handles your data, your money, and the rules of the road, with links to every policy.",
  "/legal",
);

const SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "principles", label: "Our principles" },
  { id: "policies", label: "The policies" },
  { id: "data", label: "Data, in short" },
  { id: "money", label: "Money, in short" },
  { id: "controls", label: "Controls you have" },
  { id: "contact", label: "Contact us" },
] as const;

export default function LegalOverviewPage() {
  return (
    <LegalDoc eyebrow="Overview" sections={SECTIONS} art={<OverviewArt />}>
      <h1>
        When you ride or drive with {SITE.name}, you trust us with your
        journeys and your money. Here is how we handle both.
      </h1>
      <Lead>
        These pages are the agreement between you and {SITE.name}, written to be
        read rather than skimmed past. Start here for the shape of it, then open
        the policy you need.
      </Lead>

      <Callout
        icon={<ShieldCheck size={24} />}
        title="The promises behind every page"
        href="/legal/privacy"
        action="Read the Privacy Policy"
      >
        We collect what a carpool needs and nothing more, we never sell personal
        data, we never see your M-Pesa PIN, and your fare stays with us until
        the trip is complete.
      </Callout>

      <Section id="intro" title="Introduction">
        <p>
          {SITE.name} connects drivers who have empty seats with passengers
          going the same way. We are the platform: matching, messaging,
          payments, and support. The journey itself belongs to the driver and
          the passengers in the car.
        </p>
        <p>
          That split is why these documents exist. They set out what we do, what
          you agree to, and what happens when something goes wrong.
        </p>
      </Section>

      <Section id="principles" title="Our principles">
        <CardGrid>
          <Point icon={<Lock size={20} />}title="Minimum collection">
            If a feature does not need a piece of data, we do not ask for it.
          </Point>
          <Point icon={<UserCircle size={20} />}title="No selling, no ads">
            Your trips are not an advertising product. There are no ad trackers
            in the app.
          </Point>
          <Point icon={<Wallet size={20} />}title="Money held, not held hostage">
            Fares sit in escrow with us and are released to the driver when the
            trip ends.
          </Point>
          <Point icon={<MapPin size={20} />}title="Location on purpose">
            Live location is shared during a trip and stops when it ends.
          </Point>
        </CardGrid>
      </Section>

      <Section id="policies" title="The policies">
        <Callout
          icon={<ShieldCheck size={24} />}
          title="Privacy Policy"
          href="/legal/privacy"
          action="Open"
        >
          What we collect, why, who we share it with, how long we keep it, and
          how to export or delete it.
        </Callout>
        <Callout
          icon={<Scroll size={24} />}
          title="Terms of Service"
          href="/legal/terms"
          action="Open"
        >
          Accounts, driver and passenger duties, bookings and payments, conduct,
          suspension, and liability.
        </Callout>
        <Callout
          icon={<HandCoins size={24} />}
          title="Refund Policy"
          href="/legal/refunds"
          action="Open"
        >
          How escrow works, what happens when a trip is cancelled, and how a
          refund request is reviewed.
        </Callout>
        <Callout
          icon={<Cookie size={24} />}
          title="Cookie Policy"
          href="/legal/cookies"
          action="Open"
        >
          Every cookie we set, what it does, how long it lasts, and how to turn
          off the optional ones.
        </Callout>
      </Section>

      <Section id="data" title="Data, in short">
        <ul>
          <li>
            <strong>Who you are:</strong> name, phone, email, photo, and for
            drivers the verification documents.
          </li>
          <li>
            <strong>Where you are going:</strong> routes, pick-up points, and
            live position during a trip.
          </li>
          <li>
            <strong>What happened:</strong> bookings, messages, ratings, and
            payment records.
          </li>
        </ul>
        <p>
          Other members see your first name, photo, rating, and vehicle. Phone
          numbers are exchanged only after a booking is confirmed.
        </p>
      </Section>

      <Section id="money" title="Money, in short">
        <p>
          You pay through M-Pesa. {SITE.name} holds the fare, the driver is paid
          after the ride, and a cancelled or disputed trip keeps the money with
          us until a refund decision is made. Our fee is taken from the
          driver&apos;s release, not added on top of your fare.
        </p>
      </Section>

      <Section id="controls" title="Controls you have">
        <ul>
          <li>Edit your profile and what it shows at any time.</li>
          <li>Turn location permission on or off in your phone settings.</li>
          <li>Choose which notifications you receive.</li>
          <li>Export a copy of your data, or close your account.</li>
        </ul>
        <Note>
          Account deletion cannot complete while a booking is open, a fare is in
          escrow, or a wallet balance is waiting. Settle those first.
        </Note>
      </Section>

      <Section id="contact" title="Contact us">
        <p>
          Anything on these pages can be asked about directly:{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
          Common questions are answered on the <a href="/legal/faq">FAQ</a>.
        </p>
      </Section>
    </LegalDoc>
  );
}
