import LegalLayout, { Section, SummaryBox, RetentionTable, COMPANY } from './LegalLayout.jsx'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" docLabel="Privacy Policy">
      <SummaryBox>
        <p>
          We built Jiokoe to help you take control of your money. This policy explains what we collect, why we
          collect it, how we protect it, and your rights. <strong>We do not sell your data.</strong> We do not
          share it with advertisers. Your financial information is yours.
        </p>
      </SummaryBox>

      <Section heading="1. Who we are">
        <p>
          {COMPANY.name} is a financial technology company incorporated in Kenya under the Companies Act (Cap 486).
          We operate Jiokoe — a commitment wallet that lets you lock funds and receive scheduled disbursements to
          your M-Pesa number.
        </p>
        <ul className="space-y-1">
          <li>
            <strong>Registered address:</strong> {COMPANY.address}
          </li>
          <li>
            <strong>Contact:</strong>{' '}
            <a href={`mailto:${COMPANY.privacy}`} className="font-semibold text-brand-600 dark:text-brand-300">
              {COMPANY.privacy}
            </a>
          </li>
          <li>
            <strong>Data Protection Officer:</strong> {COMPANY.dpo}
          </li>
        </ul>
      </Section>

      <Section heading="2. Information we collect">
        <p>
          <strong>2.1 Information you provide</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Name and email</strong> — to create and identify your account
          </li>
          <li>
            <strong>M-Pesa payout number</strong> — verified in Profile (entered twice) for scheduled disbursements
          </li>
          <li>
            <strong>Password</strong> — stored as a one-way hash by our auth provider; we cannot read it
          </li>
          <li>
            <strong>Schedule details</strong> — amounts, times, patterns, and labels you define
          </li>
          <li>
            <strong>Support messages</strong> — if you contact us
          </li>
        </ul>

        <p>
          <strong>2.2 Information collected automatically</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Device and browser type</li>
          <li>IP address — for security and fraud prevention</li>
          <li>Login timestamps, session activity, and inactivity logout events</li>
          <li>Feature usage and error logs</li>
        </ul>

        <p>
          <strong>2.3 Information from third parties</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Safaricom M-Pesa</strong> — transaction confirmations (receipt number, amount, timestamp). We
            never receive your M-Pesa PIN
          </li>
          <li>
            <strong>Africa&apos;s Talking</strong> — SMS delivery status for verification and notifications
          </li>
          <li>
            <strong>Google</strong> — basic profile (name, email) if you use Google sign-in
          </li>
        </ul>

        <p>
          <strong>2.4 Information we do NOT collect</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your M-Pesa PIN — ever</li>
          <li>Government ID numbers (unless we explicitly request them for AML verification)</li>
          <li>Bank account details</li>
          <li>Biometric data</li>
          <li>Precise GPS location</li>
        </ul>

        <p>
          <strong>2.5 Optional app passcode.</strong> If enabled, your 4-digit passcode is hashed and stored{' '}
          <strong>only on your device</strong> (browser local storage). It is never sent to our servers.
        </p>
      </Section>

      <Section heading="3. How we use your information">
        <p>We use your information only to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and manage your account</li>
          <li>Verify your email and M-Pesa payout number</li>
          <li>Process STK push deposits and scheduled B2C disbursements</li>
          <li>Send SMS and in-app notifications about your activity</li>
          <li>Detect fraud and unauthorised access</li>
          <li>Comply with Kenyan law (Data Protection Act 2019, AML, and applicable CBK expectations)</li>
          <li>Improve the platform and respond to support requests</li>
        </ul>
        <p>
          We will <strong>never</strong> use your data for advertising, sell it to third parties, or share financial
          data with employers or family without your explicit consent.
        </p>
      </Section>

      <Section heading="4. Legal basis for processing">
        <p>Under the Kenya Data Protection Act 2019, we rely on:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Contract</strong> — to provide the Jiokoe service you signed up for
          </li>
          <li>
            <strong>Legal obligation</strong> — AML, tax, and regulatory requirements
          </li>
          <li>
            <strong>Legitimate interests</strong> — fraud prevention and platform security
          </li>
          <li>
            <strong>Consent</strong> — for optional marketing (you may withdraw at any time)
          </li>
        </ul>
      </Section>

      <Section heading="5. How we store and protect your data">
        <p>
          <strong>5.1 Storage.</strong> Data is stored in Supabase (PostgreSQL) in certified data centres. Some
          processing may occur outside Kenya; we use appropriate safeguards with our processors.
        </p>
        <p>
          <strong>5.2 Security measures.</strong>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>TLS encryption in transit</li>
          <li>Hashed passwords and hashed OTP verification codes</li>
          <li>Row Level Security — your data is accessible only when you are authenticated</li>
          <li>Rate limiting on sensitive endpoints</li>
          <li>Masked phone display in the app UI</li>
          <li>Audit logging for security-sensitive events</li>
          <li>Inactivity logout on the client</li>
        </ul>

        <p>
          <strong>5.3 Data retention.</strong>
        </p>
        <RetentionTable
          rows={[
            ['Account information', 'Duration of account + 7 years after closure'],
            ['Transaction records', '7 years from transaction date (legal requirement)'],
            ['Schedule and disbursement history', '7 years from completion date'],
            ['Login and security logs', '90 days'],
            ['Support communications', '3 years from last contact'],
            ['Marketing consent records', 'Until withdrawn + 3 years'],
          ]}
        />
      </Section>

      <Section heading="6. How we share your data">
        <p>We share data only as needed to operate Jiokoe:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Safaricom Limited</strong> — to process deposits and disbursements
          </li>
          <li>
            <strong>Africa&apos;s Talking</strong> — to deliver SMS to your number
          </li>
          <li>
            <strong>Supabase Inc</strong> — database and auth infrastructure under a data processing agreement
          </li>
          <li>
            <strong>Email providers (e.g. Resend)</strong> — account confirmation, password reset, and passcode reset
            emails
          </li>
          <li>
            <strong>Legal authorities</strong> — when required by valid court order or Kenyan law (we notify you
            where permitted)
          </li>
        </ul>
        <p>
          We never share with advertisers, data brokers, or unrelated third parties without your consent.
        </p>
      </Section>

      <Section heading="7. Your rights (Kenya Data Protection Act 2019)">
        <p>You have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Access</strong> — request a copy of your personal data (we respond within 21 days)
          </li>
          <li>
            <strong>Rectification</strong> — correct inaccurate data
          </li>
          <li>
            <strong>Erasure</strong> — request deletion, subject to legal retention of financial records
          </li>
          <li>
            <strong>Data portability</strong> — receive your data in JSON or CSV
          </li>
          <li>
            <strong>Object</strong> — to direct marketing or certain legitimate-interest processing
          </li>
          <li>
            <strong>Withdraw consent</strong> — where processing is consent-based
          </li>
          <li>
            <strong>Complain</strong> — to the Office of the Data Protection Commissioner at{' '}
            <a
              href="https://odpc.go.ke"
              className="font-semibold text-brand-600 dark:text-brand-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              odpc.go.ke
            </a>
          </li>
        </ul>
        <p>
          Contact{' '}
          <a href={`mailto:${COMPANY.privacy}`} className="font-semibold text-brand-600 dark:text-brand-300">
            {COMPANY.privacy}
          </a>{' '}
          to exercise your rights. We do not charge for reasonable requests.
        </p>
      </Section>

      <Section heading="8. Cookies and local storage">
        <p>Jiokoe uses essential storage only:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Session and auth tokens — to keep you signed in</li>
          <li>Theme preference</li>
          <li>Optional app passcode hash — on your device only</li>
          <li>Security-related storage for fraud prevention</li>
        </ul>
        <p>
          We do not use advertising cookies, Google Analytics, Facebook Pixel, or third-party tracking that shares
          your data externally.
        </p>
      </Section>

      <Section heading="9. Children's privacy">
        <p>
          Jiokoe is not for anyone under 18. We do not knowingly collect children&apos;s data. Contact{' '}
          {COMPANY.privacy} if you believe a child has registered and we will delete it.
        </p>
      </Section>

      <Section heading="10. Changes to this policy">
        <p>
          We may update this Privacy Policy. Material changes will be notified by SMS to your registered M-Pesa
          number and/or a prominent in-app notice at least 30 days before they take effect. You may close your
          account before the effective date if you do not accept the update.
        </p>
      </Section>

      <Section heading="11. Contact us">
        <ul className="space-y-1">
          <li>
            <strong>{COMPANY.name} — Data Protection Officer</strong>
          </li>
          <li>
            Email:{' '}
            <a href={`mailto:${COMPANY.privacy}`} className="font-semibold text-brand-600 dark:text-brand-300">
              {COMPANY.privacy}
            </a>
          </li>
          <li>Address: {COMPANY.address}</li>
          <li>Phone: {COMPANY.phone}</li>
        </ul>
      </Section>
    </LegalLayout>
  )
}
