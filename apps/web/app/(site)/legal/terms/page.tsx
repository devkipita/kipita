import { SITE } from "@/lib/site";
import { KIPITA_FEE_PERCENT } from "@kipita/shared";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { TermsArt } from "@/components/legal/LegalArt";
import {
  Callout,
  CardGrid,
  DataTable,
  Lead,
  Note,
  Point,
  Section,
} from "@/components/legal/LegalPieces";
import {
  Car,
  HandCoins,
  Scroll,
  SealCheck,
  ShieldCheck,
  Star,
  Users,
} from "@/components/icons";

export const metadata = createPageMetadata(
  "Terms of Service",
  "The agreement between you and Kipita: accounts, driver and passenger duties, bookings, M-Pesa payments, conduct, and liability.",
  "/legal/terms",
);

const SECTIONS = [
  { id: "agreement", label: "Your agreement with us" },
  { id: "what-we-are", label: "What Kipita is" },
  { id: "accounts", label: "Accounts and eligibility" },
  { id: "drivers", label: "If you drive" },
  { id: "passengers", label: "If you ride" },
  { id: "bookings", label: "Bookings and payments" },
  { id: "cancellations", label: "Cancellations and refunds" },
  { id: "conduct", label: "Community conduct" },
  { id: "content", label: "Your content and ratings" },
  { id: "safety", label: "Safety, insurance, and the law" },
  { id: "suspension", label: "Suspension and removal" },
  { id: "liability", label: "Liability" },
  { id: "disputes", label: "Disputes and governing law" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact us" },
] as const;

export default function TermsPage() {
  return (
    <LegalDoc eyebrow="Kipita Terms of Service" sections={SECTIONS} art={<TermsArt />}>
      <h1>
        {SITE.name} connects people already making a journey with people who
        need a seat on it. These terms are the rules of that exchange.
      </h1>
      <Lead>
        By creating an account, publishing a ride, or booking a seat, you agree
        to these terms. Read them with our{" "}
        <a href="/legal/privacy">Privacy Policy</a> and{" "}
        <a href="/legal/refunds">Refund Policy</a>, which form part of the same
        agreement.
      </Lead>

      <Callout
        icon={<Scroll size={24} />}
        title="The short version"
        href="/legal/faq"
        action="See common questions"
      >
        {SITE.name} is a marketplace, not a taxi company. Drivers are
        independent and share the cost of a trip they were making anyway.
        Passengers pay through the app, {SITE.name} holds the fare until the
        trip ends, and both sides are expected to show up, be honest, and
        behave.
      </Callout>

      <Section id="agreement" title="Your agreement with us">
        <p>
          These terms are a contract between you and {SITE.name}. If you use the
          service on behalf of someone else, you confirm you may bind them. If
          you do not accept these terms, do not use {SITE.name}.
        </p>
      </Section>

      <Section id="what-we-are" title="What Kipita is, and what it is not">
        <p>
          {SITE.name} provides the platform: listings, matching, messaging,
          payment handling, and support. The journey itself is provided by the
          driver, who is an independent individual sharing a trip, not our
          employee, agent, or subcontractor.
        </p>
        <ul>
          <li>
            We are not a transport operator, carrier, or public service vehicle
            business.
          </li>
          <li>
            We do not set the fare. Drivers price a seat to share costs, and we
            display guidance so prices stay reasonable.
          </li>
          <li>
            A ride is not a commercial taxi service. Profit-making operation of
            a passenger service requires the licensing that ordinary carpooling
            does not.
          </li>
        </ul>
      </Section>

      <Section id="accounts" title="Accounts and eligibility">
        <ul>
          <li>You must be 18 or older and legally able to enter a contract.</li>
          <li>
            Your details must be accurate and current. One person, one account.
          </li>
          <li>
            Keep your sign-in and your phone secure. Activity from your account
            is treated as yours.
          </li>
          <li>
            Tell us immediately at{" "}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> if
            you think someone else has access.
          </li>
          <li>
            Drivers must complete verification (KYC) before publishing a ride.
            We may re-verify at any time.
          </li>
        </ul>
      </Section>

      <Section id="drivers" title="If you drive">
        <CardGrid>
          <Point icon={<SealCheck size={20} />}title="Be licensed and legal">
            Hold a valid driving licence, keep your vehicle roadworthy and
            insured, and carry whatever your insurer requires for carrying
            passengers.
          </Point>
          <Point icon={<Car size={20} />}title="Publish honestly">
            The route, timing, vehicle, and seat count you publish must be the
            ones you intend to drive.
          </Point>
          <Point icon={<HandCoins size={20} />}title="Share costs, not profit">
            Price a seat to contribute to fuel, tolls, and wear. Do not run a
            commercial passenger service on {SITE.name}.
          </Point>
          <Point icon={<Users size={20} />}title="Turn up">
            Arrive at the agreed point and time, or cancel early enough for your
            passenger to find another ride.
          </Point>
        </CardGrid>
        <p>You also agree that you will not:</p>
        <ul>
          <li>Let anyone else drive a trip booked with you.</li>
          <li>
            Ask a passenger for money outside the app, or ask them to cancel and
            pay you directly.
          </li>
          <li>
            Drive while impaired by alcohol, drugs, medication, or fatigue, or
            use a phone in your hand while driving.
          </li>
          <li>
            Carry more passengers than the vehicle is licensed and belted for.
          </li>
        </ul>
      </Section>

      <Section id="passengers" title="If you ride">
        <ul>
          <li>Book only seats you intend to use, and be at the pick-up point on time.</li>
          <li>
            Pay through {SITE.name}. Paying the driver directly removes your
            escrow protection and your refund rights.
          </li>
          <li>
            Respect the driver&apos;s vehicle and stated preferences on
            luggage, pets, smoking, and music.
          </li>
          <li>Wear a seatbelt and follow reasonable safety instructions.</li>
          <li>
            Tell the driver in advance if someone is travelling with you,
            including a child in your care.
          </li>
        </ul>
      </Section>

      <Section id="bookings" title="Bookings and payments">
        <p>
          A booking is formed when the driver accepts your request and payment
          is confirmed. Payment runs through M-Pesa, and {SITE.name} holds the
          fare in escrow.
        </p>
        <DataTable>
          <caption>How a fare moves through {SITE.name}.</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">What happens to the money</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Request</th>
              <td>Nothing is taken until the driver accepts.</td>
            </tr>
            <tr>
              <th scope="row">Accepted</th>
              <td>
                The fare is charged to your M-Pesa number or wallet and held by{" "}
                {SITE.name}, not by the driver.
              </td>
            </tr>
            <tr>
              <th scope="row">Trip completed</th>
              <td>
                We release the fare to the driver&apos;s wallet, minus a{" "}
                {KIPITA_FEE_PERCENT}% platform fee.
              </td>
            </tr>
            <tr>
              <th scope="row">Cancelled or disputed</th>
              <td>
                The fare stays in escrow until a refund decision is made under
                the <a href="/legal/refunds">Refund Policy</a>.
              </td>
            </tr>
            <tr>
              <th scope="row">Withdrawal</th>
              <td>
                Drivers withdraw their wallet balance to M-Pesa. Withdrawals may
                be paused while a dispute is open.
              </td>
            </tr>
          </tbody>
        </DataTable>
        <p>
          The platform fee pays for matching, payment handling, support, and
          safety work. We will tell you before the fee changes, and the fee that
          applies to a trip is the one shown when the booking is made.
        </p>
        <Note>
          Mobile money charges levied by Safaricom are separate from our fee and
          are set by Safaricom.
        </Note>
      </Section>

      <Section id="cancellations" title="Cancellations and refunds">
        <p>
          Either side can cancel before a trip starts. Cancelling a paid trip
          opens a refund request automatically, and our team reviews it. Full
          detail, including what happens after a no-show, is in the{" "}
          <a href="/legal/refunds">Refund Policy</a>.
        </p>
        <p>
          Repeated late cancellation or failure to appear affects your
          reputation on {SITE.name} and can lead to suspension.
        </p>
      </Section>

      <Section id="conduct" title="Community conduct">
        <p>Everyone on {SITE.name} agrees not to:</p>
        <ul>
          <li>
            Harass, threaten, discriminate against, or endanger another member.
          </li>
          <li>
            Misrepresent who they are, including using another person&apos;s
            identity documents or vehicle.
          </li>
          <li>
            Use {SITE.name} to move goods for hire, or to carry anything illegal.
          </li>
          <li>
            Manipulate ratings, create fake bookings, or abuse referrals and
            promotions.
          </li>
          <li>
            Scrape, reverse engineer, overload, or interfere with the service,
            or access accounts that are not theirs.
          </li>
        </ul>
        <Callout icon={<ShieldCheck size={24} />}title="Report anything that feels wrong">
          Every trip has a report option, and support can be reached at{" "}
          {SITE.supportEmail}. In an emergency, contact the police first, then
          tell us.
        </Callout>
      </Section>

      <Section id="content" title="Your content and ratings">
        <p>
          You keep ownership of what you post: listing notes, messages, photos,
          and reviews. You grant {SITE.name} a licence to host, display, and
          distribute it as needed to operate the service.
        </p>
        <ul>
          <li>Ratings and reviews must be honest and based on a real trip.</li>
          <li>
            We may remove content that breaks these terms or the law, and we may
            keep a copy where safety or a legal duty requires it.
          </li>
          <li>
            {SITE.name}&apos;s name, logo, and software remain ours. Nothing here
            transfers them to you.
          </li>
        </ul>
      </Section>

      <Section id="safety" title="Safety, insurance, and the law">
        <p>
          {SITE.name} does not supply insurance. Drivers are responsible for
          holding cover that is valid for the journey and the passengers in the
          vehicle, and for complying with Kenyan traffic law, including NTSA
          requirements that apply to them.
        </p>
        <p>
          We verify the documents a driver submits, but we are not able to
          guarantee the ongoing accuracy of a licence, an insurance policy, or a
          vehicle&apos;s condition. Use your judgment, check the vehicle matches
          the listing, and do not travel if something is wrong.
        </p>
      </Section>

      <Section id="suspension" title="Suspension and removal">
        <p>
          We may limit, suspend, or close an account where we reasonably believe
          there has been a breach of these terms, fraud, a risk to member
          safety, or a legal requirement to act. Where it is appropriate and
          lawful we will tell you why and give you a chance to respond, and
          account closures for safety reasons are reviewed by a person.
        </p>
        <p>
          Money properly owed to you is still paid out after closure, less
          amounts covering refunds or chargebacks you caused. You can stop using{" "}
          {SITE.name} at any time and delete your account from the app.
        </p>
      </Section>

      <Section id="liability" title="Liability">
        <p>
          {SITE.name} provides the platform on an &quot;as is&quot; basis. We do
          not promise uninterrupted service, and we are not a party to the
          journey between a driver and a passenger.
        </p>
        <ul>
          <li>
            To the extent permitted by law, we are not liable for the conduct of
            a driver or passenger, the condition of a vehicle, or loss, injury,
            or delay arising from a trip.
          </li>
          <li>
            We are not liable for indirect or consequential loss, lost profit,
            or missed onward connections.
          </li>
          <li>
            Where we are found liable despite the above, our total liability for
            a trip is limited to the fare paid for that trip.
          </li>
          <li>
            Nothing here excludes liability that cannot lawfully be excluded,
            including liability for fraud, or for death or personal injury
            caused by our negligence.
          </li>
        </ul>
        <Callout icon={<Star size={24} />}title="Our responsibility, kept honestly">
          If the platform itself fails, for example we take a fare twice or
          release escrow in error, that is ours to fix. Write to{" "}
          {SITE.supportEmail} and we will correct it.
        </Callout>
      </Section>

      <Section id="disputes" title="Disputes and governing law">
        <p>
          Talk to us first. Most problems, including refunds and ratings, are
          resolved by support faster than by any formal process.
        </p>
        <p>
          These terms are governed by the laws of Kenya, and the courts of Kenya
          have jurisdiction over any dispute arising from them. Disputes between
          a driver and a passenger are between those two people; we help with
          evidence from the trip record where we can.
        </p>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>
          We may update these terms as the service evolves. Material changes are
          announced in the app or by email before they take effect. Continued
          use after that date means you accept the updated terms. If you do not,
          close your account.
        </p>
      </Section>

      <Section id="contact" title="Contact us">
        <p>
          Questions about these terms go to{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
        </p>
      </Section>
    </LegalDoc>
  );
}
