import { SITE } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { CookiesArt } from "@/components/legal/LegalArt";
import {
  Callout,
  CardGrid,
  DataTable,
  Lead,
  Note,
  Point,
  Section,
} from "@/components/legal/LegalPieces";
import { Cookie, Eye, Lock, SlidersHorizontal } from "@/components/icons";

export const metadata = createPageMetadata(
  "Cookie Policy",
  "The cookies and local storage Kipita uses on the web and in the app, what each one does, and how to control them.",
  "/legal/cookies",
);

const SECTIONS = [
  { id: "intro", label: "Why this page exists" },
  { id: "what", label: "What cookies are" },
  { id: "use", label: "Cookies we use" },
  { id: "storage", label: "Storage in your browser" },
  { id: "app", label: "Inside the mobile app" },
  { id: "third-party", label: "Third parties" },
  { id: "managing", label: "Managing cookies" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact us" },
] as const;

export default function CookiesPage() {
  return (
    <LegalDoc eyebrow="Kipita Cookie Policy" sections={SECTIONS} art={<CookiesArt />}>
      <h1>
        {SITE.name} uses a small number of cookies, and none of them follow you
        around the internet.
      </h1>
      <Lead>
        This page lists every category of cookie and local storage we rely on,
        what each one is for, and how to switch off the ones that are optional.
      </Lead>

      <Callout
        icon={<Cookie size={24} />}
        title="No advertising, no cross-site tracking"
        href="/legal/privacy"
        action="Read the Privacy Policy"
      >
        We do not run advertising cookies, we do not embed third-party ad
        pixels, and we do not sell browsing data. The cookies below keep you
        signed in, remember your preferences, and protect your account.
      </Callout>

      <Section id="intro" title="Why this page exists">
        <p>
          The Data Protection Act and the Kenya Information and Communications
          regulations expect us to tell you what we store on your device and to
          let you choose where the storage is not strictly necessary. This page
          is that disclosure.
        </p>
      </Section>

      <Section id="what" title="What cookies are">
        <p>
          A cookie is a small text file a site stores on your device and reads
          back on later visits. Related technologies do the same job by
          different means: <strong>local storage</strong> keeps values in the
          browser until cleared, and <strong>session storage</strong> clears
          when you close the tab.
        </p>
        <CardGrid>
          <Point icon={<Lock size={20} />}title="Strictly necessary">
            Without these the site cannot keep you signed in or protect your
            session. They cannot be switched off from within {SITE.name}.
          </Point>
          <Point icon={<SlidersHorizontal size={20} />}title="Preference">
            Small conveniences: theme, language, a dismissed banner. Clearing
            them only resets a setting.
          </Point>
          <Point icon={<Eye size={20} />}title="What we do not use">
            Advertising identifiers, cross-site trackers, social media pixels,
            or profiling cookies.
          </Point>
        </CardGrid>
      </Section>

      <Section id="use" title="Cookies we use">
        <DataTable>
          <caption>Set by {SITE.name} on this website.</caption>
          <thead>
            <tr>
              <th scope="col">Purpose</th>
              <th scope="col">What it does</th>
              <th scope="col">Type</th>
              <th scope="col">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Session</th>
              <td>
                Keeps you signed in across pages and refreshes your session
                securely.
              </td>
              <td>Strictly necessary</td>
              <td>Until sign-out or expiry</td>
            </tr>
            <tr>
              <th scope="row">Authentication state</th>
              <td>
                Completes sign-in, magic links, and password resets, and guards
                against request forgery.
              </td>
              <td>Strictly necessary</td>
              <td>Minutes to hours</td>
            </tr>
            <tr>
              <th scope="row">Security</th>
              <td>
                Rate limiting and abuse detection, so one bad actor cannot lock
                others out.
              </td>
              <td>Strictly necessary</td>
              <td>Up to 24 hours</td>
            </tr>
            <tr>
              <th scope="row">Theme</th>
              <td>Remembers light or dark so the page does not flash on load.</td>
              <td>Preference</td>
              <td>Up to 12 months</td>
            </tr>
            <tr>
              <th scope="row">Recent searches</th>
              <td>
                Remembers the routes you looked at, so the search form is useful
                on your next visit.
              </td>
              <td>Preference</td>
              <td>Until cleared</td>
            </tr>
          </tbody>
        </DataTable>
      </Section>

      <Section id="storage" title="Storage in your browser">
        <p>
          Some of the preference items above live in local storage rather than
          in a cookie. They are not sent to our servers with every request; the
          page reads them in your browser. Clearing site data removes them.
        </p>
      </Section>

      <Section id="app" title="Inside the mobile app">
        <p>
          The {SITE.name} app does not use browser cookies. It stores a secure
          session token on the device so you stay signed in, plus local
          preferences such as theme and notification settings. Signing out
          removes the token.
        </p>
      </Section>

      <Section id="third-party" title="Third parties">
        <p>
          Where a page embeds a map or a payment prompt, the provider may set
          its own cookies under its own policy. We keep these to what a feature
          needs, and we do not allow advertising cookies on {SITE.name}.
        </p>
      </Section>

      <Section id="managing" title="Managing cookies">
        <ul>
          <li>
            Every major browser lets you view, block, or clear cookies for a
            single site in its settings, usually under Privacy.
          </li>
          <li>
            Clearing preference cookies resets your theme and recent searches.
          </li>
          <li>
            Blocking strictly necessary cookies will sign you out and stop
            booking, publishing, and the admin panel from working.
          </li>
        </ul>
        <Note>
          A private or incognito window clears everything when you close it, so
          you will be signed out and your preferences will reset each time.
        </Note>
      </Section>

      <Section id="changes" title="Changes">
        <p>
          If we add a cookie, this page changes before the cookie ships, and the
          effective date below is updated.
        </p>
      </Section>

      <Section id="contact" title="Contact us">
        <p>
          Questions about cookies? Email{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
        </p>
      </Section>
    </LegalDoc>
  );
}
