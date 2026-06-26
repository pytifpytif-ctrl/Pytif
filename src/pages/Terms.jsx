import LegalLayout, { Section, Callout, DefList, COMPANY } from './LegalLayout.jsx'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" docLabel="Terms of Service">
      <Callout title="Please read carefully">
        <p>
          These Terms of Service constitute a legally binding agreement between you and {COMPANY.name}. By
          creating an account or using Jiokoe, you agree to be bound by these Terms and our{' '}
          <a href="/privacy" className="font-semibold text-brand-600 dark:text-brand-300">
            Privacy Policy
          </a>
          . If you do not agree, do not use the platform.
        </p>
      </Callout>

      <Section heading="1. Definitions">
        <DefList
          items={[
            {
              term: '"Jiokoe", "we", "us", "our"',
              def: `${COMPANY.name}, a company incorporated in Kenya.`,
            },
            {
              term: '"Platform"',
              def: `The Jiokoe web application at ${COMPANY.site} and any associated mobile experiences.`,
            },
            { term: '"User", "you", "your"', def: 'Any individual who creates a Jiokoe account.' },
            {
              term: '"Commitment Wallet"',
              def: 'Your personal locked balance within Jiokoe, recorded on our ledger against pooled M-Pesa float.',
            },
            {
              term: '"Schedule"',
              def: 'Instructions you define specifying amounts, times, and patterns for disbursements back to you.',
            },
            {
              term: '"Disbursement"',
              def: 'An automated transfer from your Commitment Wallet to your verified M-Pesa number.',
            },
            {
              term: '"Float Account"',
              def: "Jiokoe's company M-Pesa account where user deposits are held in aggregate.",
            },
            { term: '"M-Pesa"', def: "Safaricom's mobile money service." },
            { term: '"Services"', def: 'All features and functions provided through the Platform.' },
          ]}
        />
      </Section>

      <Section heading="2. Eligibility">
        <p>To use Jiokoe, you must:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Be at least 18 years of age</li>
          <li>Be a resident of Kenya or an authorised user of a Kenyan Safaricom M-Pesa account</li>
          <li>Have a valid M-Pesa number registered in your name for payouts</li>
          <li>Have the legal capacity to enter into binding contracts</li>
          <li>Not be prohibited from receiving financial services under applicable law</li>
        </ul>
        <p>
          By registering, you represent that you meet these requirements. If you do not, you must not use the
          Platform.
        </p>
      </Section>

      <Section heading="3. Account registration and security">
        <p>
          <strong>3.1 Registration.</strong> You create an account with your name, email, and password (or Google
          sign-in where enabled). Before locking money, you must verify a Safaricom M-Pesa payout number in
          Profile by entering it twice and completing SMS verification where required.
        </p>
        <p>
          <strong>3.2 Security.</strong> You are responsible for your login credentials and all activity under
          your account. You may optionally enable a 4-digit app passcode stored locally on your device. You agree
          to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Choose a strong password and keep it confidential</li>
          <li>
            Notify us immediately at{' '}
            <a href={`mailto:${COMPANY.support}`} className="font-semibold text-brand-600 dark:text-brand-300">
              {COMPANY.support}
            </a>{' '}
            if you suspect unauthorised access
          </li>
          <li>Log out on shared devices</li>
        </ul>
        <p>
          Jiokoe will <strong>never</strong> ask for your M-Pesa PIN, password, or OTP by phone call, email, or
          SMS. Any such request is fraudulent.
        </p>
        <p>
          <strong>3.3 One account per person.</strong> You may register only one Jiokoe account. Multiple accounts
          to evade limits or policies may result in termination of all associated accounts.
        </p>
      </Section>

      <Section heading="4. The Jiokoe service">
        <p>
          <strong>4.1 What Jiokoe does.</strong> Jiokoe lets you deposit funds via M-Pesa STK Push, define a
          Schedule, and receive automated Disbursements back to your verified M-Pesa number on the dates and times
          you chose.
        </p>

        <Callout title="4.2 The commitment mechanic — read this carefully">
          <p>The lock mechanic is the core of Jiokoe. By depositing funds, you make a binding commitment.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Once deposited and your Schedule is active, funds are <strong>not</strong> a freely withdrawable wallet
              balance
            </li>
            <li>Funds are released only according to the Schedule you confirmed at deposit</li>
            <li>
              You cannot redirect payouts to another person&apos;s M-Pesa number — only your verified payout line
            </li>
            <li>Jiokoe is not a savings account and pays no interest</li>
            <li>When your locked balance reaches zero, disbursements stop automatically</li>
          </ul>
        </Callout>

        <p>
          <strong>4.3 How your money is held.</strong> Deposits are held in Jiokoe&apos;s Float Account. We
          maintain a ledger of your individual balance. Your funds are not invested, lent, or used except to execute
          your scheduled disbursements. Jiokoe is not a bank; balances are not KDIC-insured.
        </p>

        <p>
          <strong>4.4 Service fees.</strong> Fees are calculated upfront and shown before you confirm any deposit:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>M-Pesa B2C fee</strong> — Safaricom&apos;s standard fee per disbursement, passed through at
            cost
          </li>
          <li>
            <strong>Jiokoe service fee</strong> — <strong>Ksh 5 per scheduled send</strong>, disclosed in your
            review step before payment
          </li>
        </ul>
        <p>There are no hidden fees. Fees for sends already executed are non-refundable.</p>

        <p>
          <strong>4.5 Failed disbursements.</strong> A disbursement may fail if your M-Pesa line is inactive,
          blocked, or Safaricom is unavailable. We notify you in the app (and by SMS where configured). The amount
          remains in your Commitment Wallet. We are not liable for Safaricom network failures or outages beyond our
          reasonable control.
        </p>

        <p>
          <strong>4.6 Unpaid schedules.</strong> If you start creating a schedule but do not complete the deposit,
          the draft may be removed automatically and will not appear in your history.
        </p>
      </Section>

      <Section heading="5. Prohibited conduct">
        <p>You agree not to use Jiokoe to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Conduct money laundering, terrorist financing, fraud, or other illegal activity</li>
          <li>Deposit funds from illegal sources</li>
          <li>Circumvent, hack, or manipulate the Platform or its security</li>
          <li>Create multiple accounts or false identities</li>
          <li>Access another user&apos;s account or data</li>
          <li>Use bots or unauthorised automation on the Platform</li>
          <li>Impersonate Jiokoe staff</li>
          <li>Deposit on behalf of another person without our prior written consent</li>
        </ul>
        <p>Violations may result in suspension, forfeiture of pending disbursements, and referral to authorities.</p>
      </Section>

      <Section heading="6. Anti-money laundering and KYC">
        <p>
          Jiokoe complies with Kenyan AML laws including POCAMLA. You agree to provide truthful information and
          cooperate with verification requests. We may suspend accounts, report suspicious activity to the Financial
          Reporting Centre (FRC), and impose transaction limits based on verification status.
        </p>
      </Section>

      <Section heading="7. Intellectual property">
        <p>
          Platform content, design, code, trademarks, and logos belong to {COMPANY.name}. You may not copy,
          reverse-engineer, or use our brand without written consent. You retain ownership of data you provide; you
          grant us a limited licence to use it solely to provide the Services.
        </p>
      </Section>

      <Section heading="8. Disclaimers and limitation of liability">
        <p>
          <strong>8.1 Availability.</strong> The Platform is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. We do not guarantee uninterrupted service.
        </p>
        <p>
          <strong>8.2 Not financial advice.</strong> Jiokoe is a payment scheduling tool, not a financial adviser.
        </p>
        <p>
          <strong>8.3 Liability cap.</strong> To the maximum extent permitted by Kenyan law, our total liability
          for any claim shall not exceed the Jiokoe service fees you paid in the <strong>3 months</strong> before
          the claim. We are not liable for indirect damages or Safaricom/M-Pesa failures outside our control.
        </p>
        <p>
          <strong>8.4 Indemnification.</strong> You agree to indemnify {COMPANY.name} against claims arising from
          your use of the Platform or breach of these Terms.
        </p>
      </Section>

      <Section heading="9. Account termination">
        <p>
          <strong>9.1 By you.</strong> Contact{' '}
          <a href={`mailto:${COMPANY.support}`} className="font-semibold text-brand-600 dark:text-brand-300">
            {COMPANY.support}
          </a>{' '}
          to close your account. Active schedules are cancelled; remaining balances are returned to your verified
          M-Pesa number within a reasonable period, subject to legal retention requirements.
        </p>
        <p>
          <strong>9.2 By Jiokoe.</strong> We may suspend or terminate accounts for Terms violations, suspected
          fraud, or legal requirement. Balances may be withheld pending investigation where permitted by law.
        </p>
        <p>
          <strong>9.3 Platform discontinuation.</strong> We may discontinue the Platform with at least 60 days
          notice, returning remaining balances within 30 business days where possible.
        </p>
      </Section>

      <Section heading="10. Dispute resolution">
        <p>
          Contact us first at {COMPANY.support} — we aim to resolve disputes informally within 21 business days.
          Unresolved disputes may be referred to binding arbitration in Nairobi under the Arbitration Act (Cap 49).
          You may always lodge complaints with the Central Bank of Kenya, ODPC, or other regulators.
        </p>
      </Section>

      <Section heading="11. Governing law">
        <p>
          These Terms are governed by the laws of Kenya. Courts of Kenya have jurisdiction except where arbitration
          applies.
        </p>
      </Section>

      <Section heading="12. Changes to these Terms">
        <p>
          We may update these Terms. Material changes will be notified via SMS to your registered M-Pesa number
          and/or in-app notice at least 30 days before they take effect. Continued use after the effective date
          means acceptance. If you disagree, close your account before the effective date.
        </p>
      </Section>

      <Section heading="13. General provisions">
        <p>
          These Terms and our Privacy Policy are the entire agreement between you and Jiokoe. If any provision is
          unenforceable, the rest remains in effect. We may assign our rights to a successor; you may not assign
          without consent. English is the controlling language.
        </p>
      </Section>

      <Section heading="14. Contact">
        <ul className="space-y-1">
          <li>
            <strong>{COMPANY.name}</strong>
          </li>
          <li>
            Email:{' '}
            <a href={`mailto:${COMPANY.support}`} className="font-semibold text-brand-600 dark:text-brand-300">
              {COMPANY.support}
            </a>
          </li>
          <li>
            Legal:{' '}
            <a href={`mailto:${COMPANY.legal}`} className="font-semibold text-brand-600 dark:text-brand-300">
              {COMPANY.legal}
            </a>
          </li>
          <li>Address: {COMPANY.address}</li>
          <li>Phone: {COMPANY.phone}</li>
        </ul>
      </Section>

      <Callout title="Acceptance">
        <p>
          By creating an account or using Jiokoe in any way, you confirm that you have read, understood, and agree
          to these Terms of Service and our Privacy Policy.
        </p>
      </Callout>
    </LegalLayout>
  )
}
