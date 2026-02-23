import { getCopy } from '@/lib/copy';
import { PRIVACY_EMAIL } from '@/lib/brand';

export default async function PrivacyPage() {
  const c = await getCopy();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="border-b-2 border-foreground/70 pb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            {c.legal.privacy.label}
          </p>
          <h1 className="mt-3 font-sans text-3xl uppercase tracking-tight">
            {c.legal.privacy.title}
          </h1>
          <p className="mt-2 text-xs text-muted">Last updated: 12 February 2026</p>
        </header>

        {/* 1. Introduction */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            1. Introduction
          </h2>
          <p className="text-sm text-muted">
            This Privacy Policy explains how THE PIT (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;), operated at thepit.cloud,
            collects, uses, stores, and shares your personal data when you use
            our AI debate arena platform (&quot;the Platform&quot;). We are
            committed to protecting your privacy in accordance with the UK
            General Data Protection Regulation (UK GDPR), the Data Protection
            Act 2018, and applicable data protection legislation.
          </p>
          <p className="text-sm text-muted">
            Please read this policy carefully. By using the Platform, you
            acknowledge that you have read and understood this Privacy Policy. If
            you do not agree with our practices, please do not use the Platform.
          </p>
        </section>

        {/* 2. Data Controller */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            2. Data Controller
          </h2>
          <p className="text-sm text-muted">
            THE PIT is the data controller responsible for your personal data.
            For any questions about this Privacy Policy or your data rights,
            contact us at:{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="text-accent underline"
            >
              {PRIVACY_EMAIL}
            </a>
          </p>
        </section>

        {/* 3. Personal Data We Collect */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            3. Personal Data We Collect
          </h2>
          <p className="text-sm text-muted">
            We collect the following categories of personal data:
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.1 Account and Authentication Data
          </h3>
          <p className="text-sm text-muted">
            When you create an account via Clerk (our authentication provider),
            we receive and store your Clerk user ID, email address, display name,
            and profile image URL. We also generate and store a unique referral
            code for your account.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.2 Subscription and Payment Data
          </h3>
          <p className="text-sm text-muted">
            When you purchase credits or subscribe to a paid tier, Stripe
            processes your payment. We store your Stripe customer ID,
            subscription ID, subscription status, subscription tier (free, pass,
            or lab), and the current billing period end date. We do not store
            your full card number, CVV, or bank details&mdash;these are held
            solely by Stripe.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.3 Credit and Transaction Data
          </h3>
          <p className="text-sm text-muted">
            We maintain a credit ledger recording your credit balance (in
            micro-credits), transaction history including the source of each
            transaction (signup bonus, purchase, referral, bout cost), reference
            IDs linking to Stripe sessions, and associated metadata.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.4 Bout and Agent Content
          </h3>
          <p className="text-sm text-muted">
            When you create agents or initiate bouts, we store agent
            configurations (name, system prompt, archetype, tone, quirks, speech
            patterns, goals, fears, custom instructions), bout transcripts
            (AI-generated debate content), bout metadata (topic, response format,
            agent lineup), and your ownership relationship to agents and bouts.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.5 Engagement Data
          </h3>
          <p className="text-sm text-muted">
            We record your reactions to bout turns (reaction type and turn
            index), winner votes (which agent you voted for in a bout), feature
            request submissions (title, description, category), feature request
            votes, paper submissions (arXiv references, justifications), and
            agent flags (reports of problematic agents).
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.6 Newsletter Data
          </h3>
          <p className="text-sm text-muted">
            If you sign up for our newsletter, we store your email address and
            the date of signup.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.7 Analytics and Session Data
          </h3>
          <p className="text-sm text-muted">
            For each page view, we collect and store: the page path, a session
            ID (generated by our middleware), your user agent string, a
            one-way hash of your IP address (we never store raw IP addresses),
            HTTP referrer, country code (derived from Vercel geo-headers), and
            UTM campaign parameters (source, medium, campaign). We also record
            short link click analytics including referral codes, UTM data,
            referrer, user agent, and IP hash.
          </p>

          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
            3.8 Referral Data
          </h3>
          <p className="text-sm text-muted">
            When you are referred to the Platform or refer others, we store
            referral relationships (referrer ID, referred user ID, referral
            code, and whether a credit bonus was applied). We also track remix
            events when agents are cloned, recording the source and remix agent
            IDs, the users involved, and any credit rewards paid.
          </p>
        </section>

        {/* 4. How We Use Your Data (Purposes and Lawful Bases) */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            4. How We Use Your Data
          </h2>
          <p className="text-sm text-muted">
            Under the UK GDPR, we must have a lawful basis for each processing
            activity. The table below sets out our purposes and the
            corresponding legal basis:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted">
              <thead>
                <tr className="border-b border-foreground/20 text-left">
                  <th className="pb-2 pr-4 font-bold text-foreground/80">
                    Purpose
                  </th>
                  <th className="pb-2 font-bold text-foreground/80">
                    Lawful Basis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                <tr>
                  <td className="py-2 pr-4">
                    Account creation, authentication, and session management
                  </td>
                  <td className="py-2">
                    Performance of a contract (Terms of Service)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Processing payments, managing subscriptions, and maintaining
                    the credit ledger
                  </td>
                  <td className="py-2">
                    Performance of a contract; legal obligation (financial
                    records)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Running bouts, storing transcripts, and delivering the
                    debate experience
                  </td>
                  <td className="py-2">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Referral programme, signup bonuses, and remix credit rewards
                  </td>
                  <td className="py-2">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Page view analytics, session tracking, and UTM campaign
                    attribution
                  </td>
                  <td className="py-2">
                    Legitimate interest (understanding usage patterns to improve
                    the Platform)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Error monitoring and debugging via Sentry
                  </td>
                  <td className="py-2">
                    Legitimate interest (maintaining service reliability)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Product analytics via PostHog
                  </td>
                  <td className="py-2">
                    Legitimate interest (improving the Platform)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    AI observability and cost monitoring via Helicone (when
                    enabled)
                  </td>
                  <td className="py-2">
                    Legitimate interest (service quality and cost management)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Sending newsletters and transactional emails via Resend
                  </td>
                  <td className="py-2">
                    Consent (newsletter); performance of a contract
                    (transactional emails)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Research exports using anonymized and aggregated data
                  </td>
                  <td className="py-2">
                    Legitimate interest (advancing AI debate research)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Feature requests, votes, and paper submissions
                  </td>
                  <td className="py-2">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Content moderation and enforcing community standards
                  </td>
                  <td className="py-2">
                    Legitimate interest (safety and integrity of the Platform)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            Where we rely on legitimate interest, we have conducted balancing
            tests to ensure our interests do not override your fundamental
            rights and freedoms. You may contact us to request details of these
            assessments.
          </p>
        </section>

        {/* 5. Cookies and Local Storage */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            5. Cookies and Local Storage
          </h2>
          <p className="text-sm text-muted">
            The Platform uses the following cookies:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted">
              <thead>
                <tr className="border-b border-foreground/20 text-left">
                  <th className="pb-2 pr-4 font-bold text-foreground/80">
                    Cookie
                  </th>
                  <th className="pb-2 pr-4 font-bold text-foreground/80">
                    Purpose
                  </th>
                  <th className="pb-2 pr-4 font-bold text-foreground/80">
                    Duration
                  </th>
                  <th className="pb-2 font-bold text-foreground/80">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">pit_sid</td>
                  <td className="py-2 pr-4">
                    Session ID for grouping page views. HttpOnly.
                  </td>
                  <td className="py-2 pr-4">30 minutes (rolling)</td>
                  <td className="py-2">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">pit_ref</td>
                  <td className="py-2 pr-4">
                    First-touch referral attribution code.
                  </td>
                  <td className="py-2 pr-4">30 days</td>
                  <td className="py-2">Functional</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">pit_utm</td>
                  <td className="py-2 pr-4">
                    First-touch UTM campaign parameters (source, medium,
                    campaign, term, content).
                  </td>
                  <td className="py-2 pr-4">30 days</td>
                  <td className="py-2">Analytics</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">
                    __clerk_*
                  </td>
                  <td className="py-2 pr-4">
                    Authentication session and CSRF protection, set by Clerk.
                  </td>
                  <td className="py-2 pr-4">Session / varies</td>
                  <td className="py-2">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">
                    ph_*
                  </td>
                  <td className="py-2 pr-4">
                    Product analytics identifiers, set by PostHog (when
                    enabled).
                  </td>
                  <td className="py-2 pr-4">1 year</td>
                  <td className="py-2">Analytics</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            Strictly necessary cookies are required for the Platform to function
            and cannot be disabled. Analytics cookies help us understand how you
            use the Platform. You can block analytics cookies via your browser
            settings; doing so will not affect core functionality.
          </p>
        </section>

        {/* 6. Third-Party Processors */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            6. Third-Party Data Processors
          </h2>
          <p className="text-sm text-muted">
            We share personal data with the following third-party processors,
            each acting under a data processing agreement:
          </p>
          <ul className="list-disc pl-6 text-sm text-muted">
            <li>
              <strong className="text-foreground/80">Clerk</strong> &mdash;
              Authentication and user management. Processes email addresses,
              display names, profile images, and session tokens. Privacy policy:{' '}
              <a
                href="https://clerk.com/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                clerk.com/legal/privacy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Neon</strong> &mdash;
              Serverless PostgreSQL database hosting. Stores all Platform data
              described in Section 3. Privacy policy:{' '}
              <a
                href="https://neon.tech/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                neon.tech/privacy-policy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Vercel</strong> &mdash;
              Application hosting, edge functions, and serverless compute.
              Processes IP addresses (for routing and geo-detection), request
              headers, and serves all Platform traffic. Privacy policy:{' '}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                vercel.com/legal/privacy-policy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Anthropic</strong> &mdash;
              AI model inference. Processes bout prompts, agent system prompts,
              and generates debate transcripts. Content is sent via API and
              subject to Anthropic&apos;s data handling policies. When using
              BYOK mode, your own API key is used and held only in server memory
              for the duration of the request. Privacy policy:{' '}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                anthropic.com/legal/privacy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">PostHog</strong> &mdash;
              Product analytics (when enabled). Processes page view events,
              feature flag evaluations, and user interaction data. Privacy
              policy:{' '}
              <a
                href="https://posthog.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                posthog.com/privacy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Sentry</strong> &mdash;
              Error monitoring and performance tracking. Processes error stack
              traces, request metadata, and browser information when errors
              occur. Privacy policy:{' '}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                sentry.io/privacy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Stripe</strong> &mdash;
              Payment processing for credit purchases and subscriptions.
              Processes payment card details, billing addresses, and transaction
              data. We receive only your Stripe customer ID, subscription
              status, and session metadata via webhooks. Privacy policy:{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                stripe.com/privacy
              </a>
            </li>
            <li>
              <strong className="text-foreground/80">Resend</strong> &mdash;
              Transactional email delivery (contact form responses, account
              notifications). Processes recipient email addresses and message
              content. Privacy policy:{' '}
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                resend.com/legal/privacy-policy
              </a>
            </li>

          </ul>
        </section>

        {/* 7. International Data Transfers */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            7. International Data Transfers
          </h2>
          <p className="text-sm text-muted">
            THE PIT is governed by the laws of England and Wales. However,
            several of our third-party processors are based in the United States,
            including Clerk, Vercel, Anthropic, PostHog, Sentry, Stripe, Resend,
            and Helicone. Neon provides serverless PostgreSQL which may involve
            US-based infrastructure.
          </p>
          <p className="text-sm text-muted">
            Where personal data is transferred outside the UK, we ensure
            appropriate safeguards are in place, including: the UK International
            Data Transfer Agreement (IDTA) or the UK Addendum to the EU Standard
            Contractual Clauses (SCCs), adequacy decisions where applicable, and
            binding corporate rules where relevant. Each processor listed in
            Section 6 maintains compliance with applicable data protection
            frameworks. You may contact us for copies of the relevant transfer
            mechanisms.
          </p>
        </section>

        {/* 8. Data Retention */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            8. Data Retention
          </h2>
          <p className="text-sm text-muted">
            We retain personal data only for as long as necessary to fulfil the
            purposes for which it was collected:
          </p>
          <ul className="list-disc pl-6 text-sm text-muted">
            <li>
              <strong className="text-foreground/80">Account data</strong>{' '}
              &mdash; Retained for the lifetime of your account. Deleted within
              30 days of an account deletion request.
            </li>
            <li>
              <strong className="text-foreground/80">
                Bout transcripts and agent configurations
              </strong>{' '}
              &mdash; Retained for the lifetime of your account. Public bouts
              may be retained in anonymized form for research purposes after
              account deletion.
            </li>
            <li>
              <strong className="text-foreground/80">
                Credit and transaction records
              </strong>{' '}
              &mdash; Retained for 7 years after the transaction date to comply
              with UK financial record-keeping obligations.
            </li>
            <li>
              <strong className="text-foreground/80">
                Page view and analytics data
              </strong>{' '}
              &mdash; IP hashes and session IDs are retained for up to 26
              months, after which they are deleted or aggregated.
            </li>
            <li>
              <strong className="text-foreground/80">
                Newsletter signups
              </strong>{' '}
              &mdash; Retained until you unsubscribe or request deletion.
            </li>
            <li>
              <strong className="text-foreground/80">
                Referral and remix records
              </strong>{' '}
              &mdash; Retained for the lifetime of the referrer&apos;s account
              for credit attribution purposes.
            </li>
            <li>
              <strong className="text-foreground/80">
                Cookies
              </strong>{' '}
              &mdash; See Section 5 for individual cookie durations.
            </li>
          </ul>
        </section>

        {/* 9. Data Security */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            9. Data Security
          </h2>
          <p className="text-sm text-muted">
            We implement appropriate technical and organisational measures to
            protect your personal data, including: encryption in transit (TLS)
            for all connections, encryption at rest for database storage via
            Neon, one-way hashing of IP addresses using a salted hash (raw IPs
            are never stored in our database), secure webhook signature
            verification for Stripe payment events, HttpOnly flags on session
            cookies, BYOK API keys held only in server memory for the duration
            of the request and never persisted, and access controls limiting
            data access to authorized personnel.
          </p>
        </section>

        {/* 10. Your Rights */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            10. Your Rights Under UK GDPR
          </h2>
          <p className="text-sm text-muted">
            Under the UK GDPR, you have the following rights in relation to your
            personal data:
          </p>
          <ul className="list-disc pl-6 text-sm text-muted">
            <li>
              <strong className="text-foreground/80">Right of access</strong>{' '}
              &mdash; You may request a copy of the personal data we hold about
              you.
            </li>
            <li>
              <strong className="text-foreground/80">
                Right to rectification
              </strong>{' '}
              &mdash; You may request that we correct any inaccurate or
              incomplete personal data.
            </li>
            <li>
              <strong className="text-foreground/80">
                Right to erasure
              </strong>{' '}
              &mdash; You may request that we delete your personal data where
              there is no compelling reason for its continued processing.
            </li>
            <li>
              <strong className="text-foreground/80">
                Right to restriction of processing
              </strong>{' '}
              &mdash; You may request that we restrict the processing of your
              personal data in certain circumstances (for example, while we
              verify the accuracy of data you have contested).
            </li>
            <li>
              <strong className="text-foreground/80">
                Right to data portability
              </strong>{' '}
              &mdash; Where processing is based on consent or contract and
              carried out by automated means, you may request your data in a
              structured, commonly used, machine-readable format.
            </li>
            <li>
              <strong className="text-foreground/80">
                Right to object
              </strong>{' '}
              &mdash; You may object to processing based on legitimate interest.
              We will cease processing unless we demonstrate compelling
              legitimate grounds that override your rights.
            </li>
            <li>
              <strong className="text-foreground/80">
                Rights relating to automated decision-making
              </strong>{' '}
              &mdash; We do not make decisions based solely on automated
              processing that produce legal or similarly significant effects on
              you.
            </li>
          </ul>
          <p className="text-sm text-muted">
            To exercise any of these rights, contact us at{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="text-accent underline"
            >
              {PRIVACY_EMAIL}
            </a>
            . We will respond to your request within one month. In complex cases
            or where we receive a high volume of requests, we may extend this
            period by a further two months, in which case we will notify you.
          </p>
          <p className="text-sm text-muted">
            We will not charge a fee for responding to your request unless it is
            manifestly unfounded, repetitive, or excessive, in which case we may
            charge a reasonable fee or refuse the request.
          </p>
        </section>

        {/* 11. Right to Complain */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            11. Right to Complain
          </h2>
          <p className="text-sm text-muted">
            If you are unhappy with how we have handled your personal data, you
            have the right to lodge a complaint with the Information
            Commissioner&apos;s Office (ICO), the UK supervisory authority for
            data protection:
          </p>
          <ul className="list-none pl-0 text-sm text-muted">
            <li>
              Website:{' '}
              <a
                href="https://ico.org.uk/make-a-complaint/"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                ico.org.uk/make-a-complaint
              </a>
            </li>
            <li>Telephone: 0303 123 1113</li>
            <li>
              Post: Information Commissioner&apos;s Office, Wycliffe House,
              Water Lane, Wilmslow, Cheshire, SK9 5AF
            </li>
          </ul>
          <p className="text-sm text-muted">
            We would appreciate the opportunity to address your concerns before
            you approach the ICO, so please contact us first at{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="text-accent underline"
            >
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </section>

        {/* 12. Research Data Usage */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            12. Research Data Usage
          </h2>
          <p className="text-sm text-muted">
            We generate research exports containing anonymized and aggregated
            data from bouts, reactions, votes, and agent configurations. These
            exports are used to advance research into AI debate dynamics,
            argumentation patterns, and human evaluation of AI-generated content.
          </p>
          <p className="text-sm text-muted">
            Research exports do not contain personally identifiable information.
            All user identifiers are anonymized using a one-way salted hash
            (configurable via a production-specific anonymization salt) before
            inclusion in any export. Raw emails, display names, and IP addresses
            are never included. Export metadata includes bout counts, reaction
            counts, vote counts, and agent counts only.
          </p>
          <p className="text-sm text-muted">
            For further detail on how your data may appear in published research,
            see Section 8 of our{' '}
            <a href="/terms" className="text-accent underline">
              Terms of Service
            </a>
            .
          </p>
        </section>

        {/* 13. Children's Privacy */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            13. Children&apos;s Privacy
          </h2>
          <p className="text-sm text-muted">
            The Platform is not directed at children under the age of 13 and we
            do not knowingly collect personal data from children under 13. If we
            become aware that we have collected personal data from a child under
            13, we will take steps to delete that data as soon as reasonably
            practicable. If you believe we may have collected data from a child
            under 13, please contact us at{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="text-accent underline"
            >
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </section>

        {/* 14. Bring Your Own Key (BYOK) */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            14. Bring Your Own Key (BYOK)
          </h2>
          <p className="text-sm text-muted">
            If you use BYOK mode, your Anthropic API key is transmitted over
            HTTPS and held only in server memory for the duration of the bout
            request. Your key is never stored in our database, written to log
            files, or returned in API responses. When BYOK mode is active, your
            API calls are subject to Anthropic&apos;s privacy policy and data
            handling practices. You remain solely responsible for the security
            and costs associated with your API key.
          </p>
        </section>

        {/* 15. Changes to This Policy */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            15. Changes to This Policy
          </h2>
          <p className="text-sm text-muted">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices, technology, legal requirements, or other
            factors. When we make material changes, we will update the
            &quot;Last updated&quot; date at the top of this page. For
            significant changes that materially affect your rights, we will
            provide prominent notice on the Platform or notify you by email
            where practicable. Your continued use of the Platform after any
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* 16. Contact Us */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            16. Contact Us
          </h2>
          <p className="text-sm text-muted">
            For any questions, concerns, or requests regarding this Privacy
            Policy or our data processing practices, contact us at:
          </p>
          <ul className="list-none pl-0 text-sm text-muted">
            <li>
              Email:{' '}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-accent underline"
              >
                {PRIVACY_EMAIL}
              </a>
            </li>
            <li>
              Website:{' '}
              <a
                href="https://thepit.cloud"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                thepit.cloud
              </a>
            </li>
          </ul>
          <p className="text-sm text-muted">
            This Privacy Policy is governed by the laws of England and Wales.
          </p>
        </section>
      </div>
    </main>
  );
}
