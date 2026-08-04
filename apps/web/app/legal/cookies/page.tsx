import { SITE } from "@/lib/site";

export const metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p className="updated">Last updated: 1 August 2026</p>

      <p>
        This site uses a small number of cookies to work correctly. We keep them to
        the essentials.
      </p>

      <h2>What we use</h2>
      <ul>
        <li><strong>Essential:</strong> session cookies that keep you signed in to the admin panel and keep it secure.</li>
        <li><strong>Preferences:</strong> remembering basic choices such as theme.</li>
      </ul>

      <h2>What we don't do</h2>
      <p>
        We do not use advertising or cross-site tracking cookies on this website.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. Blocking essential
        cookies may stop the admin panel from working.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </>
  );
}
