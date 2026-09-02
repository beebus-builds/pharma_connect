import Link from "next/link";

export const metadata = {
  title: "Terms of Service - PharmaConnect",
  description: "Terms of Service for using PharmaConnect.",
};

const EFFECTIVE_DATE = "September 2, 2026";
const SUPPORT_EMAIL = "support@pharmaconnect.com.np"; // TODO: replace with your real support inbox
const BUSINESS_NAME = "PharmaConnect"; // TODO: replace with your registered business/entity name
const REGISTERED_ADDRESS = "[Registered business address, Nepal]"; // TODO

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-12">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Acceptance of terms">
        <p>
          By creating an account or otherwise using {BUSINESS_NAME} (the &ldquo;Service&rdquo;), you agree to be
          bound by these Terms of Service. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. What the Service does">
        <p>
          {BUSINESS_NAME} lets patients search for medicine availability at nearby pharmacies in Nepal, contact
          pharmacies about that availability, and message with a pharmacy about a specific request. Pharmacy
          accounts are responsible for keeping their own stock listings accurate and up to date.
        </p>
        <p>
          {BUSINESS_NAME} is an information and communication platform only. It does not sell, dispense, or
          deliver medicine, and it does not verify in real time that a pharmacy&apos;s listed stock is accurate.
          Always confirm availability, dosage, and suitability directly with a licensed pharmacist before
          purchasing or taking any medicine.
        </p>
      </Section>

      <Section title="3. Accounts and eligibility">
        <p>
          You must provide accurate registration information and keep your credentials secure. You are
          responsible for all activity under your account. Pharmacy accounts must hold a valid pharmacy license
          in Nepal and may be asked to provide proof of licensing.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Post false, misleading, or fraudulent stock or availability information;</li>
          <li>Use the Service to harass, abuse, or send unsolicited commercial messages to other users;</li>
          <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or its data;</li>
          <li>Use automated means (scraping, bots) to extract data from the Service without permission.</li>
        </ul>
      </Section>

      <Section title="5. Payments">
        <p>
          Certain features (for example, pharmacy subscription/listing plans) may require payment, processed
          through a third-party payment gateway (currently Khalti). {BUSINESS_NAME} does not store your card,
          bank, or wallet credentials — those are handled entirely by the payment gateway. Fees are
          disclosed before you confirm a payment and are non-refundable except where required by law or stated
          otherwise at the time of purchase.
        </p>
      </Section>

      <Section title="6. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. {BUSINESS_NAME} does not
          guarantee the accuracy of medicine availability, pricing, or pharmacy information at any given moment,
          and is not a substitute for professional medical or pharmaceutical advice.
        </p>
      </Section>

      <Section title="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {BUSINESS_NAME} and its operators are not liable for any
          indirect, incidental, or consequential damages arising from your use of the Service, including harm
          resulting from inaccurate stock information or a missed or delayed purchase of medicine.
        </p>
      </Section>

      <Section title="8. Termination">
        <p>
          We may suspend or terminate accounts that violate these Terms, provide false information, or misuse
          the Service. You may stop using the Service and request account deletion at any time by contacting us.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after an update constitutes
          acceptance of the revised Terms. Material changes will be reflected by updating the effective date
          above.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These Terms are governed by the laws of Nepal, without regard to conflict-of-law principles. Any
          dispute arising from these Terms or the Service will be subject to the exclusive jurisdiction of the
          courts of Nepal.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          {BUSINESS_NAME}
          <br />
          {REGISTERED_ADDRESS}
          <br />
          Email: <a className="text-primary-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </Section>

      <p className="text-sm text-slate-400">
        See also our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
