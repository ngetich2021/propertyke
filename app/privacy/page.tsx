import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | EstateFinderHub",
  description: "How EstateFinderHub collects, uses, and protects your data.",
};

const LAST_UPDATED = "6 September 2026";
const SUPPORT_EMAIL = "ngetichjustine1@gmail.com";

// Public, unauthenticated page -- required for Play Store listing
// configuration (App content -> Privacy policy) and linked from AppFooter.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-zinc-500">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        This Privacy Policy explains what information EstateFinderHub (&quot;we&quot;, &quot;us&quot;)
        collects when you use our website and app, why we collect it, and who we share it with. By
        using EstateFinderHub you agree to this Policy. See also our{" "}
        <Link href="/terms" className="underline">
          Terms &amp; Conditions
        </Link>
        .
      </p>

      <Section title="1. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> when you sign in with Google, we receive your
            name, email address, and profile photo from Google.
          </li>
          <li>
            <strong>Profile details you add:</strong> phone number and business name, shown on your
            listings/ads so buyers and renters can reach you.
          </li>
          <li>
            <strong>Listing and ad content:</strong> anything you submit to create a listing or ad —
            title, description, price, address, map coordinates, and photos (photos are hosted by
            our image provider, Cloudinary).
          </li>
          <li>
            <strong>Inquiries/orders:</strong> when you contact a listing owner, we store the
            contact phone number and message you provide for that inquiry.
          </li>
          <li>
            <strong>Location:</strong> if you allow it, we use your device&apos;s precise location
            (via your browser/device location permission) to find listings near you. This is used
            only to run that search and is not stored linked to your account.
          </li>
          <li>
            <strong>Payment information:</strong> to pay for a verification badge or an ad, we send
            an M-Pesa STK push to the phone number you provide and record the amount, status, and
            M-Pesa transaction receipt code once Safaricom confirms payment. We never see or store
            your M-Pesa PIN, and we do not process card payments.
          </li>
          <li>
            <strong>Support messages:</strong> messages you send our in-app support chat, live chat
            with a team member, WhatsApp, phone, or email.
          </li>
          <li>
            <strong>Technical data:</strong> standard server/security logs (e.g. IP address, browser
            type) collected by our hosting and network providers.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use your information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account, and let you sign in.</li>
          <li>To publish and display your listings/ads, and let buyers or renters contact you.</li>
          <li>To process M-Pesa payments and activate the paid feature you purchased.</li>
          <li>To search for and show listings near a location you choose.</li>
          <li>To respond to support requests and send account/listing-related notifications (e.g. a listing is about to expire) by email.</li>
          <li>To keep the Platform secure and prevent fraud or abuse.</li>
        </ul>
      </Section>

      <Section title="3. Who we share information with">
        <p>We don&apos;t sell your data. We share it only with the service providers that make the Platform work, and with other users where the sharing is the point of the feature:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Other users:</strong> the phone number/business name on your listings, and the contact details you submit with an inquiry, are visible to the other party to that listing/inquiry.</li>
          <li><strong>Google</strong> — for sign-in.</li>
          <li><strong>Safaricom M-Pesa (Daraja API)</strong> — to process payments.</li>
          <li><strong>Cloudinary</strong> — to host listing/ad images.</li>
          <li><strong>Google Gemini and Groq</strong> — our in-app support chat sends your message to one of these AI providers to generate a first-line automated reply. Chats that are fully resolved by the automated reply are periodically deleted; chats escalated to a human team member are kept so we can follow up.</li>
          <li><strong>Our email provider</strong> — to send transactional emails (listing reactivation links, expiry reminders, invites).</li>
          <li><strong>Vercel and Cloudflare</strong> — our hosting/CDN providers, who process standard request logs.</li>
        </ul>
        <p className="mt-2">We may also disclose information if required by law, or to investigate fraud or protect the safety of users.</p>
      </Section>

      <Section title="4. Cookies">
        <p>
          We use one strictly-necessary cookie to keep you signed in (set by our authentication
          system). We don&apos;t use third-party advertising or analytics cookies.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          We keep account, listing, order, and payment records for as long as your account is
          active. Resolved support chats are periodically deleted (see Section 3). If you delete
          your account (Section 6), everything tied to it is permanently deleted from our
          database immediately — we don&apos;t keep a copy. Note that Safaricom, as the payment
          processor, retains its own independent record of any M-Pesa transaction under its own
          regulatory obligations; deleting your EstateFinderHub account does not delete Safaricom&apos;s
          record of the transaction.
        </p>
      </Section>

      <Section title="6. Your choices and rights">
        <ul className="list-disc space-y-1 pl-5">
          <li>You can edit or remove your phone number, business name, and listings at any time from your account.</li>
          <li>You can revoke EstateFinderHub&apos;s access to your Google account at any time from your Google account settings.</li>
          <li>You can deny or revoke location permission in your browser/device settings — nearby search simply won&apos;t work without it.</li>
          <li>
            <strong>Delete your account:</strong> go to Account &gt; Settings &gt; Danger zone &gt;
            &quot;Delete my account&quot; to permanently and immediately delete your account,
            listings, ads, orders, payment records, and support history. This cannot be undone. You
            can also request this by emailing{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
          </li>
        </ul>
      </Section>

      <Section title="7. Children">
        <p>
          EstateFinderHub is not directed at children and is not intended for use by anyone under 18.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use industry-standard measures (encrypted connections, hashed/secure session tokens) to
          protect your information, but no online service can guarantee absolute security.
        </p>
      </Section>

      <Section title="9. Changes to this Policy">
        <p>
          We may update this Policy from time to time; continued use of the Platform after a change
          means you accept the update. Material changes will update the &quot;Last updated&quot;
          date above.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about this Policy, or requests about your data, can be sent to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          or via the in-app support button.
        </p>
      </Section>

      <p className="pt-4 text-xs text-zinc-500">
        <Link href="/" className="underline">
          Back to EstateFinderHub
        </Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
