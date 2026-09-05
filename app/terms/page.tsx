import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | EstateFinderHub",
  description: "Terms and conditions for using EstateFinderHub.",
};

const LAST_UPDATED = "4 September 2026";
const SUPPORT_EMAIL = "ngetichjustine1@gmail.com";

// Public, unauthenticated page -- required for Play Store listing
// configuration (App content -> policies), and linked from AppFooter.
export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold">Terms &amp; Conditions</h1>
        <p className="mt-1 text-zinc-500">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of EstateFinderHub (the
        &quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;), a website and app for listing and
        finding land, property, and rental units in Kenya. By creating an account or using the
        Platform, you agree to these Terms. If you do not agree, do not use the Platform.
      </p>

      <Section title="1. What EstateFinderHub is">
        <p>
          EstateFinderHub is a listings marketplace that connects property owners/agents with buyers,
          tenants, and renters. We are <strong>not</strong> a real estate agency, broker, surveyor,
          or legal advisor, and we are not a party to any sale, purchase, or tenancy agreement made
          between users. We do not hold, transfer, or guarantee title to any land or property listed
          on the Platform.
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          You sign in with a Google account. You&apos;re responsible for keeping your account
          secure and for all activity under it, and for keeping your contact details (phone,
          business name) accurate so other users and the Platform can reach you.
        </p>
      </Section>

      <Section title="3. Listings">
        <ul className="list-disc space-y-1 pl-5">
          <li>Posting a listing is free and it goes live immediately — no administrator approval is required first. An administrator may still reject or remove it afterward for inaccurate, misleading, duplicate, or prohibited content. (Ads — paid banner promotions — are reviewed by an administrator before they start running; see Section 4.)</li>
          <li>You must own the property/land you list, or have the legal right/authority to list and transact on it. Listing property you don&apos;t have rights to is prohibited and may be reported.</li>
          <li>You are solely responsible for the accuracy of your listing (price, location, images, description, ownership status).</li>
          <li>To keep a listing visible, owners must reconfirm (&quot;activate&quot;) it periodically via an emailed link or the in-app button; listings that lapse are hidden (not deleted) until reactivated.</li>
        </ul>
      </Section>

      <Section title="4. Verification badge, ads, and payments">
        <p>
          Account verification badges and advertising slots are optional, self-serve, paid
          features billed in Kenyan Shillings (KES) via M-Pesa. Payments are processed through
          Safaricom&apos;s M-Pesa (Daraja) platform; we only apply the paid feature once M-Pesa
          confirms a successful transaction. Paid fees are for platform services rendered
          (visibility/verification/advertising) and are non-refundable once the corresponding
          feature has been activated, except where required by law. A verification badge is a
          self-declared status indicator only — it is <strong>not</strong> a guarantee of identity,
          creditworthiness, or that any listing owned by that account is legitimate.
        </p>
      </Section>

      <Section title="5. Do your own due diligence">
        <p className="font-medium">
          EstateFinderHub does not verify land titles, ownership, or property condition. Before paying
          any deposit or money to another user:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Physically visit the property/land in person.</li>
          <li>Independently verify the title deed/ownership documents (e.g. a land registry / Ministry of Lands search).</li>
          <li>Get independent legal advice before signing any agreement or transferring funds.</li>
          <li>Never send money to an owner, agent, or anyone claiming to be EstateFinderHub support/staff before completing the above. EstateFinderHub will never ask you to pay support staff directly.</li>
        </ul>
        <p className="mt-2">
          We are not responsible for losses arising from transactions, misrepresentations, or
          fraud between users conducted on or off the Platform.
        </p>
      </Section>

      <Section title="6. Site visit / tour scheduling">
        <p>
          The Platform may let you request a site visit for a listing. This is a scheduling
          convenience between you and the listing owner only — EstateFinderHub is not present at and
          not responsible for what happens during a visit. Take normal safety precautions (visit
          in daylight, bring a companion, share your location with someone) when meeting a stranger
          or visiting an unfamiliar site.
        </p>
      </Section>

      <Section title="7. Customer support and communications">
        <p>
          Support is offered via WhatsApp, phone, email, and in-app live chat. Some initial
          live-chat replies may be generated automatically or with AI assistance to help with
          common questions and app navigation; these are provided on a best-effort basis and are
          not a substitute for professional legal, financial, or valuation advice. Response times
          are targets, not guaranteed service levels.
        </p>
      </Section>

      <Section title="8. Prohibited conduct">
        <ul className="list-disc space-y-1 pl-5">
          <li>Posting false, fraudulent, or misleading listings or reviews.</li>
          <li>Harassing, threatening, or defrauding other users.</li>
          <li>Scraping, reverse-engineering, or bulk-downloading Platform data without permission.</li>
          <li>Circumventing fees, security measures, or account/role restrictions.</li>
          <li>Impersonating EstateFinderHub staff/support, or any other person or business.</li>
        </ul>
      </Section>

      <Section title="9. Suspension and termination">
        <p>
          We may suspend, restrict, or remove any account, listing, ad, or content that violates
          these Terms or applicable law, with or without notice, at our discretion.
        </p>
      </Section>

      <Section title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, EstateFinderHub and its administrators are not liable
          for indirect, incidental, or consequential damages arising from your use of the Platform,
          including losses from transactions between users, inaccurate listings, or service
          interruptions. The Platform is provided &quot;as is&quot; without warranties of any kind.
        </p>
      </Section>

      <Section title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time; continued use of the Platform after a
          change means you accept the updated Terms. Material changes will update the
          &quot;Last updated&quot; date above.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>These Terms are governed by the laws of the Republic of Kenya.</p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these Terms can be sent to{" "}
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
