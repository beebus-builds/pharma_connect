import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - PharmaConnect",
  description: "Privacy Policy for PharmaConnect.",
};

const EFFECTIVE_DATE = "September 2, 2026";
const SUPPORT_EMAIL = "support@pharmaconnect.com.np"; // TODO: replace with your real support inbox
const BUSINESS_NAME = "PharmaConnect"; // TODO: replace with your registered business/entity name

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-12">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. What we collect">
        <ul className="list-disc pl-6 space-y-1">
          <li>Account data: name, email, password (stored as a salted hash), and role (patient or pharmacy).</li>
          <li>Pharmacy data: business name, address, phone number, geographic coordinates, and license number.</li>
          <li>Usage data: medicine search queries, availability requests, and chat messages you send through the Service.</li>
          <li>Payment metadata: transaction ID, amount, and status for any payments you make. We never see or store your card, bank, or wallet credentials — those are collected and processed directly by our payment gateway, Khalti.</li>
          <li>Technical data: IP address and basic request logs, used for security, rate limiting, and abuse prevention.</li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <ul className="list-disc pl-6 space-y-1">
          <li>To operate the core Service: matching patients with pharmacies, showing map results, and enabling chat.</li>
          <li>To authenticate you and protect accounts against unauthorized access.</li>
          <li>To send transactional email (e.g. email verification) and, if you opt in, product updates.</li>
          <li>To detect abuse, enforce rate limits, and maintain the security and reliability of the Service.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section title="3. Who we share it with">
        <p>We share data only with the third-party services needed to run PharmaConnect:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Neon</strong> — hosts our PostgreSQL database.</li>
          <li><strong>Vercel</strong> — hosts the web application.</li>
          <li><strong>Render</strong> — hosts the realtime chat service.</li>
          <li><strong>Khalti</strong> — processes payments; receives only the information needed to complete a transaction.</li>
          <li>Our email provider — used to send verification and transactional email.</li>
        </ul>
        <p>We do not share your data with advertisers or data brokers.</p>
      </Section>

      <Section title="4. Data retention">
        <p>
          We retain account, request, and message data for as long as your account is active. If you delete your
          account, we delete or anonymize your personal data within a reasonable period, except where retention
          is required for legal, tax, or fraud-prevention purposes (for example, payment transaction records).
        </p>
      </Section>

      <Section title="5. Your rights">
        <p>
          You may request a copy of the personal data we hold about you, ask us to correct inaccurate data, or
          request deletion of your account and associated data, by emailing{" "}
          <a className="text-primary-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="6. Cookies and local storage">
        <p>
          We use essential cookies/local storage to keep you signed in (session tokens) and to remember basic
          preferences (such as dark mode). We do not use third-party advertising trackers.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Passwords are hashed, not stored in plain text. Traffic to the Service is encrypted in transit (HTTPS).
          No system is perfectly secure, so we cannot guarantee absolute security, but we take reasonable
          technical and organizational measures to protect your data.
        </p>
      </Section>

      <Section title="8. Children's privacy">
        <p>The Service is not directed at children under 16, and we do not knowingly collect data from them.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by updating
          the effective date above.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about this policy or your data can be sent to{" "}
          <a className="text-primary-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <p className="text-sm text-slate-400">
        See also our <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>.
      </p>
    </div>
  );
}
