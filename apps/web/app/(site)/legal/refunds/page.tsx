import { SITE } from "@/lib/site";
import { KIPITA_FEE_PERCENT } from "@kipita/shared";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { RefundsArt } from "@/components/legal/LegalArt";
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
  ArrowUUpLeft,
  Clock,
  HandCoins,
  Lifebuoy,
  ShieldCheck,
  Wallet,
} from "@/components/icons";

export const metadata = createPageMetadata(
  "Refund Policy",
  "How Kipita holds ride fares in escrow, what happens when a trip is cancelled, and how refunds are reviewed and paid.",
  "/legal/refunds",
);

const SECTIONS = [
  { id: "escrow", label: "How your money is held" },
  { id: "lifecycle", label: "The life of a fare" },
  { id: "cancelling", label: "Cancelling a paid trip" },
  { id: "driver-cancels", label: "If the driver cancels" },
  { id: "no-show", label: "No-shows" },
  { id: "review", label: "How a request is reviewed" },
  { id: "timing", label: "How long it takes" },
  { id: "payouts", label: "Wallet, top-ups, and withdrawals" },
  { id: "fees", label: "Fees and charges" },
  { id: "abuse", label: "Abuse of refunds" },
  { id: "help", label: "Need help?" },
] as const;

export default function RefundsPage() {
  return (
    <LegalDoc eyebrow="Kipita Refund Policy" sections={SECTIONS} art={<RefundsArt />}>
      <h1>
        Your fare sits with {SITE.name}, not with the driver, until the trip is
        done. That is what makes a refund simple.
      </h1>
      <Lead>
        This policy explains where your money is at every stage, what happens
        when a trip falls through, and how we decide a refund request.
      </Lead>

      <Callout
        icon={<ShieldCheck size={24} />}
        title="Escrow, in one line"
        href="/legal/terms"
        action="Read the Terms of Service"
      >
        We take the fare when a driver accepts your booking and hold it. The
        driver is paid after the ride ends, minus a {KIPITA_FEE_PERCENT}%
        platform fee. If the ride does not happen as agreed, the money is still
        with us and can be returned.
      </Callout>

      <Section id="escrow" title="How your money is held">
        <p>
          When you pay for a ride through M-Pesa or your {SITE.name} wallet, the
          fare is held by {SITE.name}. The driver can see that the seat is paid,
          but cannot touch the money. When the ride is completed we release it
          to the driver&apos;s wallet, less the platform fee.
        </p>
        <CardGrid>
          <Point icon={<Wallet size={20} />} title="Held, not spent">
            An escrowed fare is ring-fenced. It is not used for anything else
            while the trip is open.
          </Point>
          <Point icon={<ArrowUUpLeft size={20} />}title="Reversible">
            Because the driver has not been paid, a cancellation is a reversal,
            not a chase.
          </Point>
          <Point icon={<HandCoins size={20} />}title="Paid on completion">
            Drivers are paid once the trip ends, which is also what protects
            them from a passenger disappearing.
          </Point>
        </CardGrid>
      </Section>

      <Section id="lifecycle" title="The life of a fare">
        <DataTable>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Where the money is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Request sent</th>
              <td>With you. Nothing is charged until the driver accepts.</td>
            </tr>
            <tr>
              <th scope="row">Driver accepts</th>
              <td>
                Charged and held in escrow by {SITE.name}. You get a receipt.
              </td>
            </tr>
            <tr>
              <th scope="row">Trip completes</th>
              <td>
                Released to the driver&apos;s wallet, minus {KIPITA_FEE_PERCENT}
                %.
              </td>
            </tr>
            <tr>
              <th scope="row">Cancelled</th>
              <td>
                Stays in escrow and a refund request opens automatically.
              </td>
            </tr>
            <tr>
              <th scope="row">Refund approved</th>
              <td>Returned in full to your {SITE.name} wallet.</td>
            </tr>
            <tr>
              <th scope="row">Refund declined</th>
              <td>
                Released to the driver, where they honoured the commitment and
                you did not.
              </td>
            </tr>
          </tbody>
        </DataTable>
      </Section>

      <Section id="cancelling" title="Cancelling a paid trip">
        <ul>
          <li>
            Cancel from the trip screen. A refund request is opened for you; you
            do not have to email anyone.
          </li>
          <li>
            Cancel early and the outcome is nearly always a full refund. The
            driver has time to re-sell the seat.
          </li>
          <li>
            Cancel minutes before departure, or after the driver has set off to
            collect you, and the driver&apos;s loss is weighed against yours.
          </li>
          <li>
            Plans that change for a reason outside your control, such as
            illness, an accident, or a closed road, are taken into account.
            Tell us in the request.
          </li>
        </ul>
      </Section>

      <Section id="driver-cancels" title="If the driver cancels">
        <p>
          You get the full fare back. There is no judgement call to make: the
          ride you paid for did not happen. We also help you find a replacement
          seat on the same route where one exists, and repeated cancellation
          affects the driver&apos;s standing on {SITE.name}.
        </p>
      </Section>

      <Section id="no-show" title="No-shows">
        <DataTable>
          <thead>
            <tr>
              <th scope="col">What happened</th>
              <th scope="col">Usual outcome</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Driver never arrived</th>
              <td>Full refund to your wallet.</td>
            </tr>
            <tr>
              <th scope="row">
                Driver waited at the agreed point and you did not come
              </th>
              <td>
                The fare may be released to the driver, who gave up the seat and
                the time.
              </td>
            </tr>
            <tr>
              <th scope="row">Vehicle did not match the listing</th>
              <td>
                Full refund if you declined to travel and reported it at the
                time.
              </td>
            </tr>
            <tr>
              <th scope="row">Trip ended early, far from the destination</th>
              <td>Partial or full refund, depending on the distance covered.</td>
            </tr>
          </tbody>
        </DataTable>
        <Note>
          Report a problem while it is happening, from the trip screen. Live
          reports carry far more weight than an account given days later.
        </Note>
      </Section>

      <Section id="review" title="How a request is reviewed">
        <p>
          A person reviews every request. They look at the trip record: the
          booking time, the cancellation time, the chat between you and the
          driver, location evidence where it exists, and the history of both
          accounts. Both sides can add a comment before a decision is made.
        </p>
        <p>
          If you disagree with the outcome, reply to the decision notice within
          14 days and a second reviewer will look at it.
        </p>
      </Section>

      <Section id="timing" title="How long it takes">
        <CardGrid>
          <Point icon={<Clock size={20} />}title="Driver cancellations">
            Automatic. The refund lands in your wallet within minutes.
          </Point>
          <Point icon={<Lifebuoy size={20} />}title="Reviewed requests">
            Most are decided within 3 business days. Complex disputes can take
            longer, and we tell you if so.
          </Point>
          <Point icon={<Wallet size={20} />} title="Out to M-Pesa">
            Withdrawing from your wallet to M-Pesa settles the same day, subject
            to Safaricom.
          </Point>
        </CardGrid>
      </Section>

      <Section id="payouts" title="Wallet, top-ups, and withdrawals">
        <p>
          Refunds are returned to your {SITE.name} wallet so you can book again
          immediately. You can withdraw a wallet balance to the M-Pesa number on
          your account at any time, except while a dispute involving that
          balance is open.
        </p>
        <p>
          Wallet balances are not an investment, earn no interest, and are not a
          deposit-taking product.
        </p>
      </Section>

      <Section id="fees" title="Fees and charges">
        <ul>
          <li>
            A full refund returns the full fare you paid. We do not keep the
            platform fee on a refunded trip.
          </li>
          <li>
            The {KIPITA_FEE_PERCENT}% platform fee applies only to completed
            trips and is taken from the driver&apos;s release.
          </li>
          <li>
            Safaricom&apos;s own mobile money charges are set by Safaricom and
            are outside our control.
          </li>
        </ul>
      </Section>

      <Section id="abuse" title="Abuse of refunds">
        <p>
          Refund protection exists for genuine problems. Repeated late
          cancellation, false no-show claims, or arrangements to cancel and pay
          a driver directly may lead to refunds being declined, withdrawals
          being held, or the account being closed under our{" "}
          <a href="/legal/terms">Terms of Service</a>.
        </p>
      </Section>

      <Section id="help" title="Need help?">
        <p>
          Open the trip and tap support, or email{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> with
          your booking reference. Include what happened and when; that is
          usually all we need.
        </p>
      </Section>
    </LegalDoc>
  );
}
