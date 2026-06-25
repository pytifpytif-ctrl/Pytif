import LegalLayout, { Section } from './LegalLayout.jsx'

const UPDATED = 'June 25, 2026'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service ("Terms") govern your access to and use of Jiokoe (the "Service"), a
        commitment wallet that lets you lock funds and have them paid back to your own Mpesa number
        on a schedule you choose. By creating an account or using the Service, you agree to these
        Terms.
      </p>

      <Section heading="1. What Jiokoe does">
        <p>
          Jiokoe lets you commit a sum of money up front and then disburses it back to your own
          registered Mpesa number in scheduled installments. Jiokoe is a self-payment scheduling
          tool. It is not a bank, deposit-taking institution, investment product, or lender, and it
          does not pay interest on funds you commit.
        </p>
      </Section>

      <Section heading="2. Eligibility">
        <p>
          You must be at least 18 years old and capable of entering into a binding contract. You
          must use a Safaricom Mpesa number that you own and control. You are responsible for the
          accuracy of the Mpesa number you verify during onboarding.
        </p>
      </Section>

      <Section heading="3. Your account">
        <p>
          You must provide a valid email address and confirm it before your account becomes active.
          You are responsible for keeping your login credentials secure and for all activity under
          your account. Notify us immediately if you suspect unauthorized access.
        </p>
      </Section>

      <Section heading="4. Deposits, schedules and disbursements">
        <p>
          When you create a schedule, you authorize a deposit (via Mpesa STK push) for the committed
          amount. Once committed, funds are held for the purpose of being disbursed back to you on
          the schedule you selected. Disbursements are sent to your verified Mpesa number on each
          scheduled date.
        </p>
        <p>
          Disbursement timing depends on Safaricom and other third-party systems and may be delayed
          by factors outside our control. We are not liable for delays caused by network outages,
          Mpesa downtime, insufficient float, or incorrect recipient details you provided.
        </p>
      </Section>

      <Section heading="5. Fees">
        <p>
          Jiokoe charges a small fee per scheduled send. The applicable fee is shown to you before
          you confirm a schedule. Mpesa transaction charges, where applicable, may also apply and
          are determined by Safaricom.
        </p>
      </Section>

      <Section heading="6. Cancellation and refunds">
        <p>
          You may pause or cancel a schedule subject to the options shown in the app. Where funds
          remain, they will be returned to your verified Mpesa number, less any fees already
          incurred. Fees for sends already processed are non-refundable.
        </p>
      </Section>

      <Section heading="7. Acceptable use">
        <p>
          You agree not to use the Service for any unlawful purpose, including money laundering,
          fraud, or financing illegal activity, and not to attempt to disrupt, reverse engineer, or
          gain unauthorized access to the Service.
        </p>
      </Section>

      <Section heading="8. Disclaimers and limitation of liability">
        <p>
          The Service is provided "as is" without warranties of any kind. To the maximum extent
          permitted by law, Jiokoe is not liable for any indirect, incidental, or consequential
          damages, or for any loss arising from third-party payment systems. Our total liability for
          any claim is limited to the fees you paid to Jiokoe in the three months preceding the
          claim.
        </p>
      </Section>

      <Section heading="9. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Material changes will be communicated through
          the app or by email. Continued use of the Service after changes take effect constitutes
          acceptance of the updated Terms.
        </p>
      </Section>

      <Section heading="10. Contact">
        <p>
          Questions about these Terms? Reach us at{' '}
          <a className="font-semibold text-brand-600" href="mailto:support@jiokoe.com">
            support@jiokoe.com
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
