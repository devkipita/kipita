import { SITE } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { PrivacyArt } from "@/components/legal/LegalArt";
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
  Eye,
  Lock,
  MapPin,
  ShieldCheck,
  UserCircle,
  Wallet,
} from "@/components/icons";

export const metadata = createPageMetadata(
  "Privacy Policy",
  "What personal data Kipita collects, why we collect it, who we share it with, and the controls you have over your information.",
  "/legal/privacy",
);

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "collect", label: "Information Kipita collects" },
  { id: "why", label: "Why Kipita collects data" },
  { id: "location", label: "Location information" },
  { id: "use", label: "How we use information" },
  { id: "sharing", label: "Sharing your information" },
  { id: "security", label: "Keeping your information secure" },
  { id: "retention", label: "Retaining your information" },
  { id: "rights", label: "Your privacy controls" },
  { id: "exporting", label: "Exporting and deleting" },
  { id: "children", label: "Children" },
  { id: "transfers", label: "Where your data is processed" },
  { id: "compliance", label: "Compliance and regulators" },
  { id: "changes", label: "About this policy" },
  { id: "contact", label: "Contact us" },
] as const;

export default function PrivacyPage() {
  return (
    <LegalDoc eyebrow="Kipita Privacy Policy" sections={SECTIONS} art={<PrivacyArt />}>
      <h1>
        When you travel with {SITE.name}, you trust us with information about
        your journeys. We take that seriously.
      </h1>
      <Lead>
        This policy explains what {SITE.name} collects, why we collect it, how
        we protect it, and the choices you have. It applies to the {SITE.name}{" "}
        mobile app, this website, and the support channels we run.
      </Lead>

      <Callout
        icon={<ShieldCheck size={24} />}
        title="Privacy at a glance"
        href="/legal/faq"
        action="Read the privacy FAQ"
      >
        We collect what a carpool needs to work: who you are, where you are
        going, and whether the fare was paid. We never sell your personal data,
        we never store your M-Pesa PIN, and we only show other members the
        details they need to find you and complete the trip.
      </Callout>

      <Section id="introduction" title="Introduction">
        <p>
          {SITE.name} is a carpooling platform. Drivers publish seats on
          journeys they are already making, and passengers book those seats and
          pay through the app. Making that work means handling personal data:
          names, phone numbers, pick-up points, and payment records.
        </p>
        <p>
          We are the data controller for that information. We process it under
          the Kenya Data Protection Act, 2019, and we apply the same standard to
          members travelling outside Kenya.
        </p>
      </Section>

      <Section id="collect" title="Information Kipita collects">
        <p>
          We collect three kinds of information: what you give us, what is
          created when you use {SITE.name}, and what your device reports.
        </p>

        <h3>Information you give us</h3>
        <DataTable>
          <caption>Collected directly from you, in the app or on the web.</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">What it includes</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Account</th>
              <td>
                Name, phone number, email address, password, profile photo, date
                of birth, and the preferences on your profile such as music,
                pets, or conversation.
              </td>
              <td>Sign-up and profile edits</td>
            </tr>
            <tr>
              <th scope="row">Driver verification</th>
              <td>
                National ID number and photo, driving licence details, vehicle
                registration, make, model, colour, and seat count.
              </td>
              <td>Driver KYC</td>
            </tr>
            <tr>
              <th scope="row">Trips</th>
              <td>
                Origin, destination, stops, departure time, seat count, price
                per seat, and the notes you add to a listing or booking.
              </td>
              <td>Publishing or booking a ride</td>
            </tr>
            <tr>
              <th scope="row">Payments</th>
              <td>
                The M-Pesa number used to pay, transaction references, amounts,
                wallet top-ups and withdrawals, and payout details.
              </td>
              <td>Paying, topping up, withdrawing</td>
            </tr>
            <tr>
              <th scope="row">Content</th>
              <td>
                Messages you send in a trip chat, ratings and reviews, alerts
                you post, and anything you send to support.
              </td>
              <td>While using the service</td>
            </tr>
          </tbody>
        </DataTable>

        <h3>Information created by using {SITE.name}</h3>
        <ul>
          <li>
            <strong>Trip history:</strong> the rides you published, booked,
            completed, or cancelled, and the other member on each one.
          </li>
          <li>
            <strong>Reputation:</strong> ratings you receive, completion rate,
            cancellations, and verification badges.
          </li>
          <li>
            <strong>Support history:</strong> cases you open, refund requests,
            and reports you make about another member.
          </li>
        </ul>

        <h3>Information your device reports</h3>
        <ul>
          <li>
            <strong>Device and app:</strong> device model, operating system, app
            version, language, and time zone.
          </li>
          <li>
            <strong>Connection:</strong> IP address and approximate region,
            used for security and fraud checks.
          </li>
          <li>
            <strong>Notifications:</strong> a push token, so we can tell you a
            booking was accepted or a driver is on the way.
          </li>
          <li>
            <strong>Diagnostics:</strong> crash reports and error logs that help
            us fix failures.
          </li>
        </ul>

        <Note>
          We do not ask for and do not want your M-Pesa PIN. You enter it on
          your own handset, in Safaricom&apos;s prompt. Any message asking for
          your PIN is not from {SITE.name}.
        </Note>
      </Section>

      <Section id="why" title="Why Kipita collects data">
        <CardGrid>
          <Point icon={<Car size={20} />}title="To run trips">
            Match riders and drivers, show pick-up points, and keep both sides
            updated as a journey progresses.
          </Point>
          <Point icon={<Wallet size={20} />}title="To move money safely">
            Take the fare, hold it in escrow, release it to the driver after the
            trip, and process refunds and withdrawals.
          </Point>
          <Point icon={<ShieldCheck size={20} />}title="To keep people safe">
            Verify drivers, detect fraud and abuse, investigate reports, and
            remove members who put others at risk.
          </Point>
          <Point icon={<UserCircle size={20} />}title="To support you">
            Answer support cases, review refunds, and confirm who we are
            speaking to.
          </Point>
        </CardGrid>
        <p>
          We rely on different legal grounds depending on the purpose:
          performing our contract with you (running the trip and the payment),
          complying with the law (tax, anti-fraud, and transport record
          keeping), our legitimate interests (safety, security, and improving
          the service), and your consent where consent is the right basis, such
          as precise location in the background or marketing messages.
        </p>
      </Section>

      <Section id="location" title="Location information">
        <p>
          Carpooling is a location service, so this deserves its own section.
        </p>
        <ul>
          <li>
            <strong>Searching:</strong> with your permission we use your
            approximate location to suggest nearby pick-up points. You can
            always type an address instead.
          </li>
          <li>
            <strong>During a trip:</strong> a driver who starts a trip shares
            live position with the passengers on that trip, so they can see the
            car approaching. Sharing stops when the trip ends.
          </li>
          <li>
            <strong>Safety:</strong> we keep the route and timestamps of a
            completed trip so that a dispute, a lost item, or an incident can be
            investigated.
          </li>
        </ul>
        <Callout icon={<MapPin size={24} />}title="You control location permission">
          Location permission is granted in your phone settings and can be
          revoked there at any time. Revoking it does not close your account;
          some features, such as nearby search and live arrival, stop working.
        </Callout>
      </Section>

      <Section id="use" title="How we use information">
        <ul>
          <li>To create and maintain your account and profile.</li>
          <li>
            To match riders with drivers and show each party the details they
            need: first name, photo, rating, and vehicle.
          </li>
          <li>
            To take payment via M-Pesa, hold the fare in escrow, release it to
            the driver when the trip completes, and handle refunds.
          </li>
          <li>
            To send service messages: booking confirmations, driver arrival,
            cancellations, payment receipts, and security alerts.
          </li>
          <li>
            To verify drivers and vehicles, and to detect fraudulent listings,
            stolen payment instruments, and fake accounts.
          </li>
          <li>
            To analyse demand on routes in aggregate so we can improve matching
            and pricing guidance. These reports do not identify you.
          </li>
          <li>
            To meet legal duties and respond to lawful requests from a court or
            a regulator.
          </li>
        </ul>
        <p>
          We do not use your trip history to build advertising profiles, and we
          do not run third-party ad trackers in the app.
        </p>
      </Section>

      <Section id="sharing" title="Sharing your information">
        <p>We share the minimum necessary, and only in these situations.</p>
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Who</th>
              <th scope="col">What they see</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">The other member on a trip</th>
              <td>
                First name, profile photo, rating, verification badges, and for
                drivers the vehicle details. Phone numbers are exchanged only
                once a booking is confirmed.
              </td>
              <td>So you can find each other and travel</td>
            </tr>
            <tr>
              <th scope="row">Safaricom (M-Pesa)</th>
              <td>The paying number, amount, and transaction reference.</td>
              <td>To take payment and pay out</td>
            </tr>
            <tr>
              <th scope="row">Infrastructure providers</th>
              <td>
                Hosting, database, push notification, and mapping providers
                acting on our instructions under contract.
              </td>
              <td>To run the service</td>
            </tr>
            <tr>
              <th scope="row">Authorities</th>
              <td>
                Only what a valid legal request requires, or what is needed to
                address an urgent risk to someone&apos;s safety.
              </td>
              <td>Legal obligation and safety</td>
            </tr>
            <tr>
              <th scope="row">A successor business</th>
              <td>
                Account and trip records, if {SITE.name} is involved in a merger
                or acquisition. We will tell you before your data moves.
              </td>
              <td>Business transfer</td>
            </tr>
          </tbody>
        </DataTable>
        <p>
          <strong>We do not sell your personal data</strong>, and we do not
          share it with data brokers or advertisers.
        </p>
      </Section>

      <Section id="security" title="Keeping your information secure">
        <CardGrid>
          <Point icon={<Lock size={20} />}title="Encryption">
            Traffic between your device and {SITE.name} is encrypted in transit,
            and data at rest sits on encrypted storage.
          </Point>
          <Point icon={<Eye size={20} />}title="Least access">
            Staff access is role-based and logged. Support agents see what a
            case needs, not your full history.
          </Point>
          <Point icon={<ShieldCheck size={20} />}title="Payment isolation">
            Card and PIN data never touch our systems. M-Pesa handles
            authorisation on Safaricom&apos;s side.
          </Point>
          <Point icon={<UserCircle size={20} />}title="Account protection">
            Sign-in uses one-time links or a password you control, and we alert
            you to password changes and new devices.
          </Point>
        </CardGrid>
        <p>
          No service can promise perfect security. If a breach affects your
          personal data, we will notify you and the Office of the Data
          Protection Commissioner as the law requires.
        </p>
      </Section>

      <Section id="retention" title="Retaining your information">
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Kept for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Account profile</th>
              <td>While your account is open, then deleted on request.</td>
            </tr>
            <tr>
              <th scope="row">Trip and chat history</th>
              <td>
                36 months after the trip, so disputes, refunds, and safety
                reports can be resolved.
              </td>
            </tr>
            <tr>
              <th scope="row">Payment and wallet records</th>
              <td>
                7 years, as required for tax and financial record keeping. These
                survive account deletion.
              </td>
            </tr>
            <tr>
              <th scope="row">Driver verification documents</th>
              <td>
                While you are an active driver, plus 24 months after your last
                trip.
              </td>
            </tr>
            <tr>
              <th scope="row">Diagnostics and logs</th>
              <td>Up to 12 months.</td>
            </tr>
            <tr>
              <th scope="row">Safety and fraud records</th>
              <td>
                As long as needed to protect members, including a record of
                removed accounts so they cannot simply return.
              </td>
            </tr>
          </tbody>
        </DataTable>
      </Section>

      <Section id="rights" title="Your privacy controls">
        <p>Under the Data Protection Act you can:</p>
        <ul>
          <li>Be told what we hold about you and why.</li>
          <li>Get a copy of your personal data.</li>
          <li>Correct anything inaccurate.</li>
          <li>Ask us to delete data we no longer need.</li>
          <li>
            Object to processing based on legitimate interests, and withdraw any
            consent you gave.
          </li>
          <li>
            Ask us not to make a decision about you by automated means alone. In
            practice, account suspensions are reviewed by a person.
          </li>
        </ul>
        <p>
          Most of this is self-service. Your profile, notification settings,
          location permission, and password all live in the app and on this
          website. For anything else, email{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from
          the address on your account.
        </p>
      </Section>

      <Section id="exporting" title="Exporting and deleting your information">
        <p>
          <strong>Export.</strong> Ask us for a copy of your data and we will
          send a machine-readable file covering your profile, trips, messages,
          ratings, and wallet ledger. We respond within 30 days.
        </p>
        <p>
          <strong>Deletion.</strong> You can close your account from the app.
          Deletion removes your profile and hides your content from other
          members. We keep what the law requires us to keep, chiefly payment
          records, and we keep a minimal record if you were removed for a safety
          reason.
        </p>
        <Note>
          Deletion cannot be completed while you have an open booking, a fare
          sitting in escrow, a pending refund, or a wallet balance. Settle or
          withdraw first, then delete.
        </Note>
      </Section>

      <Section id="children" title="Children">
        <p>
          {SITE.name} is for people aged 18 and over. We do not knowingly create
          accounts for children. If we learn that an account belongs to a child,
          we close it and delete the data. A passenger may travel with a minor
          in their care where the driver has agreed in advance.
        </p>
      </Section>

      <Section id="transfers" title="Where your data is processed">
        <p>
          {SITE.name} is operated from Kenya. Some of our infrastructure
          providers process data on servers outside Kenya. Where that happens we
          use providers who commit by contract to protect your data to the
          standard required by the Data Protection Act, and we transfer only
          what the service needs.
        </p>
      </Section>

      <Section id="compliance" title="Compliance and cooperation with regulators">
        <p>
          We review this policy and our handling practices regularly. If you
          believe we have mishandled your data, tell us first so we can fix it.
          You also have the right to complain to the Office of the Data
          Protection Commissioner of Kenya.
        </p>
      </Section>

      <Section id="changes" title="About this policy">
        <p>
          We may update this policy as the service changes. We will not reduce
          your rights under it without telling you. For material changes we give
          notice in the app or by email before the change takes effect, and we
          keep the effective date at the foot of this page current.
        </p>
      </Section>

      <Section id="contact" title="Contact us">
        <p>
          Questions, requests, or complaints about privacy go to{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. Put
          &quot;Privacy&quot; in the subject and we will route it to the right
          person.
        </p>
        <p>
          Related reading: our <a href="/legal/terms">Terms of Service</a>, our{" "}
          <a href="/legal/cookies">Cookie Policy</a>, and our{" "}
          <a href="/legal/refunds">Refund Policy</a>.
        </p>
      </Section>
    </LegalDoc>
  );
}
