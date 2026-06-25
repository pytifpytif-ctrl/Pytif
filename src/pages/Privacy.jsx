import LegalLayout, { Section } from './LegalLayout.jsx'

const UPDATED = 'June 25, 2026'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how Pytif ("we", "us") collects, uses, and protects your
        personal information when you use our commitment wallet service. By using Pytif, you agree
        to the practices described here.
      </p>

      <Section heading="1. Information we collect">
        <p>We collect the following information so the Service can work:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account details</strong> — your name and email address, which you confirm at
            sign-up.
          </li>
          <li>
            <strong>Mpesa number</strong> — the phone number you verify via a one-time code, used to
            send your scheduled payouts.
          </li>
          <li>
            <strong>Transaction data</strong> — the schedules you create, deposit and disbursement
            records, amounts, dates, and fees.
          </li>
          <li>
            <strong>Technical data</strong> — basic device and log information used to keep the
            Service secure and reliable.
          </li>
        </ul>
      </Section>

      <Section heading="2. How we use your information">
        <p>We use your information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>create and secure your account and confirm your email and Mpesa number;</li>
          <li>process deposits and send scheduled disbursements to your Mpesa number;</li>
          <li>calculate and apply fees, and provide transaction history;</li>
          <li>communicate service updates, confirmations, and support responses;</li>
          <li>detect, prevent, and investigate fraud or misuse.</li>
        </ul>
      </Section>

      <Section heading="3. Sharing with third parties">
        <p>
          We share data only as needed to operate the Service: with Safaricom (Daraja/Mpesa) to
          process payments, with our authentication and database provider (Supabase) to store your
          account securely, and with our SMS/email providers to deliver verification codes and
          confirmations. We do not sell your personal information.
        </p>
      </Section>

      <Section heading="4. Data retention">
        <p>
          We keep your information for as long as your account is active and as required to comply
          with legal, accounting, and regulatory obligations. You may request deletion of your
          account, after which we will remove or anonymize your data except where retention is
          legally required.
        </p>
      </Section>

      <Section heading="5. Security">
        <p>
          We protect your data using industry-standard measures, including encryption in transit,
          hashed one-time verification codes, and access controls. No system is perfectly secure, so
          we cannot guarantee absolute security, but we work to safeguard your information.
        </p>
      </Section>

      <Section heading="6. Your rights">
        <p>
          Subject to applicable law, you may access, correct, or delete your personal information,
          and object to or restrict certain processing. To exercise these rights, contact us using
          the details below.
        </p>
      </Section>

      <Section heading="7. Children">
        <p>
          Pytif is not intended for anyone under 18. We do not knowingly collect personal
          information from children.
        </p>
      </Section>

      <Section heading="8. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes through the app or by email. The "Last updated" date above reflects the latest
          revision.
        </p>
      </Section>

      <Section heading="9. Contact">
        <p>
          For privacy questions or requests, email{' '}
          <a className="font-semibold text-brand-600" href="mailto:privacy@pytif.com">
            privacy@pytif.com
          </a>
          .
        </p>
      </Section>

      <p className="text-xs">
        This document is a general template and not legal advice. Please have it reviewed by a
        qualified lawyer before relying on it in production.
      </p>
    </LegalLayout>
  )
}
